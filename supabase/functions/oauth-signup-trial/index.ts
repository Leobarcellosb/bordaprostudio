// Borda Pro — oauth-signup-trial.
// Concede trial de 10 dias (TRIAL_DURATION_DAYS, default 10) a quem cria conta
// via login social (Google/Facebook) e ainda NÃO tem nenhuma assinatura — esses
// usuários não passam pelo /ativar nem pela compra, então ganhariam /plans
// direto sem trial. Chamado AUTENTICADO pelo app (JWT no Authorization).
// Idempotente: se já existe QUALQUER subscription do user, não faz nada.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const parsedTrialDays = Number(Deno.env.get("TRIAL_DURATION_DAYS"));
const TRIAL_DAYS = Number.isFinite(parsedTrialDays) && parsedTrialDays > 0 ? parsedTrialDays : 10;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[oauth-signup-trial] missing env vars");
    return json(500, { error: "server_misconfigured" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Identidade SEMPRE do token (nunca do body) — ninguém ativa trial de terceiros.
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await admin.auth.getUser(bearer);
  if (userErr || !userData.user) return json(401, { error: "unauthorized" });
  const user = userData.user;
  const email = (user.email ?? "").toLowerCase();

  // Enforce OAuth no SERVIDOR: verify_jwt só prova "é um usuário autenticado".
  // Sem este check, qualquer conta logada sem assinatura (ex: signup por email
  // parado em /plans) poderia chamar o endpoint e se auto-conceder trial,
  // furando o gating do /ativar. Trial automático é SÓ pra login social.
  const provider = (user.app_metadata as { provider?: string } | null)?.provider;
  const providers = (user.app_metadata as { providers?: string[] } | null)?.providers ?? [];
  const viaOAuth =
    provider === "google" || provider === "facebook" ||
    providers.includes("google") || providers.includes("facebook");
  if (!viaOAuth) return json(200, { ok: true, skipped: "not_oauth" });

  // Idempotente: qualquer subscription existente (paga, trial, manual…) → no-op.
  const { data: existing, error: exErr } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if (exErr) {
    console.error("[oauth-signup-trial] lookup error:", exErr);
    return json(500, { error: "lookup_failed" });
  }
  if (existing && existing.length > 0) {
    return json(200, { ok: true, already_active: true });
  }

  // Reuso por EMAIL (setting-independent): se o auto-link de identidades por
  // email estiver DESLIGADO no projeto, a mesma pessoa poderia criar uma conta
  // Google com email já usado (em outro user_id) e ganhar 2º trial. Checar por
  // email fecha isso — espelha o trialAlreadyUsed do activate-trial.
  if (email) {
    const { data: byEmail, error: emErr } = await admin
      .from("subscriptions")
      .select("id")
      .ilike("email", email)
      .limit(1);
    if (emErr) {
      console.error("[oauth-signup-trial] email lookup error:", emErr);
      return json(500, { error: "lookup_failed" });
    }
    if (byEmail && byEmail.length > 0) {
      return json(200, { ok: true, already_active: true });
    }
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
  const { error: insErr } = await admin.from("subscriptions").upsert(
    {
      user_id: user.id,
      email,
      provider: "oauth_signup",
      plan_code: "trial",
      status: "trial",
      trial_until: trialEndsAt,
      last_event: "oauth_signup_trial_started",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (insErr) {
    console.error("[oauth-signup-trial] insert error:", insErr);
    return json(500, { error: "insert_failed" });
  }

  return json(200, { ok: true, trial_started: true, trial_until: trialEndsAt });
});
