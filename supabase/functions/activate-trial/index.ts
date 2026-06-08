// Borda Pro — activate-trial.
// Recebe { email, name, phone } do webhook do ManyChat, cria o usuário no Auth
// (se não existir), inicia um trial de 15 dias (provider=manychat, status=trial),
// gera um magic link e devolve { magic_link, trial_ends_at, status }.
//
// SEGURANÇA: o endpoint devolve o magic link no corpo da resposta — logar como o
// dono do email. Por isso exige o header x-manychat-secret == MANYCHAT_TRIAL_SECRET
// (fail-closed). Sem isso, qualquer um poderia pedir um link de login de qualquer
// email (account takeover). verify_jwt=false (ManyChat não manda JWT do Supabase).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://borda.pro";
const TRIAL_SECRET = Deno.env.get("MANYCHAT_TRIAL_SECRET");

const TRIAL_DAYS = 15;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function pickString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[activate-trial] missing Supabase env vars");
    return json(500, { error: "server_misconfigured" });
  }

  // Fail-closed: sem secret configurada, recusa tudo.
  if (!TRIAL_SECRET) {
    console.error("[activate-trial] MANYCHAT_TRIAL_SECRET not set — refusing all requests");
    return json(500, { error: "secret_not_configured" });
  }

  const provided =
    req.headers.get("x-manychat-secret") ||
    req.headers.get("x-webhook-secret") ||
    "";
  if (!timingSafeEqual(provided, TRIAL_SECRET)) {
    return json(401, { error: "unauthorized" });
  }

  let body: { email?: unknown; name?: unknown; phone?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const email = pickString(body.email)?.toLowerCase() ?? null;
  const name = pickString(body.name);
  const phone = pickString(body.phone);
  if (!email) return json(400, { error: "email_required" });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Resolver usuário por email (profiles é populada pelo trigger de auth.users).
  let userId: string | null = null;
  try {
    const { data: profileRow, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw error;
    if (profileRow?.id) userId = profileRow.id;
  } catch (err) {
    console.error("[activate-trial] profile lookup error:", err);
  }

  // 2. Criar usuário se não existir.
  if (!userId) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name, phone, source: "manychat" },
      });
      if (error) throw error;
      userId = data.user?.id ?? null;
    } catch (err) {
      console.error("[activate-trial] createUser error:", err);
    }
  }

  if (!userId) {
    // Não conseguimos resolver/criar o usuário — 500 sem silêncio.
    console.error("[activate-trial] user_resolution_failed for", email);
    return json(500, { error: "user_resolution_failed" });
  }

  // 3. Decidir o que fazer olhando TODAS as assinaturas do usuário.
  const now = Date.now();
  let outcome: "trial_started" | "already_active" | "trial_already_used" = "trial_started";
  let trialEndsAt: string | null = null;

  try {
    const { data: rows, error } = await supabase
      .from("subscriptions")
      .select("provider, status, access_expires_at, trial_until")
      .eq("user_id", userId);
    if (error) throw error;

    const subs = rows ?? [];
    const paidActive = subs.some(
      (s) =>
        s.status === "active" &&
        (!s.access_expires_at || new Date(s.access_expires_at).getTime() > now),
    );
    const manychatRow = subs.find((s) => s.provider === "manychat");
    const trialAlreadyUsed = !!manychatRow?.trial_until;

    if (paidActive) {
      // Não rebaixa um pagante pra trial.
      outcome = "already_active";
      const paid = subs.find((s) => s.status === "active");
      trialEndsAt = paid?.access_expires_at ?? null;
    } else if (trialAlreadyUsed) {
      // Anti-abuso: trial já foi usado por este usuário — não concede de novo.
      outcome = "trial_already_used";
      trialEndsAt = manychatRow?.trial_until ?? null;
    } else {
      // 4. Inicia o trial.
      trialEndsAt = new Date(now + TRIAL_DAYS * 86_400_000).toISOString();
      const { error: upsertErr } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          email,
          provider: "manychat",
          plan_code: "trial",
          status: "trial",
          trial_until: trialEndsAt,
          last_event: "trial_started",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );
      if (upsertErr) throw upsertErr;
    }
  } catch (err) {
    console.error("[activate-trial] subscription error:", err);
    return json(500, { error: "subscription_failed" });
  }

  // 5. Magic link (login direto → dashboard). É o que o ManyChat entrega ao usuário.
  let magicLink: string | null = null;
  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${APP_URL}/dashboard` },
    });
    if (error) throw error;
    magicLink = data.properties?.action_link ?? null;
  } catch (err) {
    console.error("[activate-trial] generateLink error:", err);
    // Sem o link, o ManyChat não consegue logar a pessoa — devolve 500.
    return json(500, { error: "magiclink_failed" });
  }

  // 6. Trilha de auditoria (mesmo padrão do eduzz-webhook).
  try {
    await supabase.from("integration_logs").insert({
      integration: "manychat",
      event_type: outcome,
      email,
      user_id: userId,
      status: "success",
      message:
        outcome === "trial_started"
          ? `Trial de ${TRIAL_DAYS} dias iniciado (até ${trialEndsAt}).`
          : outcome === "already_active"
            ? "Já é assinante ativo — trial não concedido (magic link enviado)."
            : "Trial já usado anteriormente — não reconcedido (magic link enviado).",
      payload: { email, name, phone, outcome, trial_ends_at: trialEndsAt },
    });
  } catch (err) {
    console.error("[activate-trial] integration_logs insert error:", err);
  }

  return json(200, {
    ok: true,
    status: outcome,
    magic_link: magicLink,
    trial_ends_at: trialEndsAt,
  });
});
