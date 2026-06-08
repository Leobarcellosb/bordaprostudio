// Borda Pro — register-trial.
// Wrapper PÚBLICO do activate-trial, chamado pelo nosso próprio /ativar (browser).
// O cliente NÃO manda secret (secret no client = exposto). Este function injeta o
// MANYCHAT_TRIAL_SECRET server-side ao chamar o activate-trial internamente.
//
// Defesas: rate limit por IP (3/hora), validação de formato de email, e —
// SEGURANÇA — só devolve o magic_link quando a conta é NOVA (user_created). Pra
// um email que JÁ tem conta, NÃO devolve link (senão qualquer um logaria como o
// dono do email / takeover de conta paga): responde { status: 'existing' } e o
// app manda a pessoa pro /login.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TRIAL_SECRET = Deno.env.get("MANYCHAT_TRIAL_SECRET");

const RATE_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TRIAL_SECRET) {
    console.error("[register-trial] missing env vars");
    return json(500, { error: "server_misconfigured", message: "Indisponível no momento." });
  }

  let body: { email?: unknown; name?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json", message: "Requisição inválida." });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return json(400, { error: "invalid_email", message: "Digite um email válido." });
  }

  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Rate limit: 3 por IP por hora.
  try {
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { count, error } = await admin
      .from("trial_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);
    if (error) throw error;
    if ((count ?? 0) >= RATE_LIMIT) {
      return json(429, {
        error: "rate_limited",
        message: "Muitas tentativas. Tente novamente em 1 hora.",
      });
    }
    await admin.from("trial_rate_limits").insert({ ip });
  } catch (e) {
    // fail-open: não bloqueia usuário legítimo se a contagem falhar (só loga).
    console.error("[register-trial] rate-limit error (fail-open):", e);
  }

  // Chama o activate-trial internamente, injetando o secret server-side.
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/activate-trial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-manychat-secret": TRIAL_SECRET,
      },
      body: JSON.stringify({ email, name, source: "web_ativar" }),
    });
  } catch (e) {
    console.error("[register-trial] activate-trial fetch error:", e);
    return json(502, { error: "upstream_error", message: "Não foi possível ativar agora. Tente de novo." });
  }

  const data = (await res.json().catch(() => ({}))) as {
    user_created?: boolean;
    magic_link?: string | null;
    trial_ends_at?: string | null;
    status?: string;
  };
  if (!res.ok) {
    console.error("[register-trial] activate-trial failed:", res.status, data);
    return json(502, { error: "activation_failed", message: "Não foi possível ativar agora. Tente de novo." });
  }

  // trial_started: trial foi iniciado AGORA — cobre conta NOVA e conta existente
  // SEM assinatura ativa e SEM trial usado. Auto-loga (devolve o magic_link).
  if (data.status === "trial_started" && data.magic_link) {
    return json(200, {
      ok: true,
      status: "trial_started",
      magic_link: data.magic_link,
      trial_ends_at: data.trial_ends_at ?? null,
    });
  }

  // Já é assinante ativo → não auto-loga; manda pro login.
  if (data.status === "already_active") {
    return json(200, {
      ok: true,
      status: "existing_active",
      message: "Você já é assinante. Faça login para acessar.",
    });
  }

  // Já usou o trial antes → não reconcede; login ou assinar.
  if (data.status === "trial_already_used") {
    return json(200, {
      ok: true,
      status: "trial_used",
      message: "Seu trial já foi ativado. Faça login ou assine.",
    });
  }

  // Fallback defensivo (não devolve link).
  return json(200, {
    ok: true,
    status: "existing",
    message: "Você já tem uma conta com esse email. Faça login para acessar.",
  });
});
