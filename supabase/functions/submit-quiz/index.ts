// Borda Pro — submit-quiz.
// Recebe a resposta do quiz de fim de trial e grava em quiz_responses.
// Dois caminhos de entrada, ambos validados server-side:
//   (a) MODAL no app: o supabase-js manda o JWT do usuário no Authorization —
//       validamos o token e FORÇAMOS o email do token (ignora email do body).
//   (b) MANYCHAT (External Request): header x-quiz-secret == QUIZ_SECRET
//       (fallback MANYCHAT_TRIAL_SECRET, já configurado no projeto).
// `bought` é DETECTADO de subscriptions (status=active vigente) — nunca confiamos
// em resposta do usuário. Dedup: 1 resposta por email (idempotente). Rate limit
// por IP reusando trial_rate_limits (linhas com prefixo 'quiz:').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const QUIZ_SECRET = Deno.env.get("QUIZ_SECRET") ?? Deno.env.get("MANYCHAT_TRIAL_SECRET");

const RATE_LIMIT = 10;            // respostas por IP/hora (spam guard; dedup já limita por email)
const WINDOW_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["modal", "whatsapp"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-quiz-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const clip = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !QUIZ_SECRET) {
    console.error("[submit-quiz] missing env vars");
    return json(500, { error: "server_misconfigured" });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Autenticação: secret (ManyChat) OU JWT do usuário (modal) ────────────────
  let email = "";
  let authedUserId: string | null = null;

  const providedSecret = req.headers.get("x-quiz-secret") ?? req.headers.get("x-manychat-secret") ?? "";
  if (providedSecret && timingSafeEqual(providedSecret, QUIZ_SECRET)) {
    email = (clip(body.email, 200) ?? "").toLowerCase();
  } else {
    const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!bearer) return json(401, { error: "unauthorized" });
    const { data, error } = await admin.auth.getUser(bearer);
    if (error || !data.user?.email) return json(401, { error: "unauthorized" });
    // Modal: email vem do TOKEN (impede usuário autenticado responder por terceiros).
    email = data.user.email.toLowerCase();
    authedUserId = data.user.id;
  }

  if (!EMAIL_RE.test(email)) return json(400, { error: "invalid_email" });

  const source = clip(body.source, 20) ?? "";
  if (!SOURCES.has(source)) return json(400, { error: "invalid_source" });

  const q1Key = clip(body.q1_key, 50);
  const q1Label = clip(body.q1_label, 200);
  const q2Text = clip(body.q2_text, 2000);
  const q3Value = clip(body.q3_value, 20);

  // ── Rate limit por IP (fail-open; o dedup por email é a trava principal) ─────
  try {
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") || "unknown";
    const key = `quiz:${ip}`;
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { count, error } = await admin
      .from("trial_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip", key)
      .gte("created_at", since);
    if (error) throw error;
    if ((count ?? 0) >= RATE_LIMIT) {
      return json(429, { error: "rate_limited" });
    }
    await admin.from("trial_rate_limits").insert({ ip: key });
  } catch (e) {
    console.error("[submit-quiz] rate-limit error (fail-open):", e);
  }

  // ── Dedup: 1 resposta por pessoa (idempotente — reenvio não duplica) ─────────
  try {
    const { count, error } = await admin
      .from("quiz_responses")
      .select("*", { count: "exact", head: true })
      .ilike("email", email);
    if (error) throw error;
    if ((count ?? 0) > 0) return json(200, { ok: true, duplicate: true });
  } catch (e) {
    console.error("[submit-quiz] dedup check error:", e);
  }

  // ── bought: detectado de subscriptions (status=active vigente), nunca do body ─
  let bought = false;
  let userId: string | null = authedUserId;
  try {
    const { data: subs, error } = await admin
      .from("subscriptions")
      .select("user_id, status, access_expires_at")
      .ilike("email", email);
    if (error) throw error;
    const now = Date.now();
    bought = (subs ?? []).some(
      (s) =>
        s.status === "active" &&
        (!s.access_expires_at || new Date(s.access_expires_at).getTime() > now),
    );
    if (!userId) userId = subs?.[0]?.user_id ?? null;
  } catch (e) {
    console.error("[submit-quiz] bought detection error:", e);
  }

  // user_id via profiles se ainda não resolvido (caminho ManyChat sem subscription).
  if (!userId) {
    try {
      const { data: prof } = await admin
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      userId = prof?.id ?? null;
    } catch (e) {
      console.error("[submit-quiz] profile lookup error:", e);
    }
  }

  const { error: insErr } = await admin.from("quiz_responses").insert({
    user_id: userId,
    email,
    source,
    bought,
    q1_key: q1Key,
    q1_label: q1Label,
    q2_text: q2Text,
    q3_value: q3Value,
  });
  if (insErr) {
    console.error("[submit-quiz] insert error:", insErr);
    return json(500, { error: "insert_failed" });
  }

  return json(200, { ok: true, bought });
});
