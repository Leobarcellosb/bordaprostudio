// Borda Pro — liberação/revogação MANUAL de acesso (admin).
// Reusa o provisionamento do eduzz-webhook (cria conta → assinatura → welcome
// email com link de senha), com provider="manual" isolado do "eduzz".
//
// Guarda de admin NO SERVIDOR: verify_jwt=true (só autenticado chega); aqui
// confirmamos via borda_is_admin() usando o JWT do CHAMADOR (mesma fonte do
// admin_delete). Operações privilegiadas usam o client service-role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeAccessExpiresAt,
  generateRecoveryLink,
  sendWelcomeEmail,
} from "../_shared/provisioning.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://borda.pro";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

interface Payload {
  email?: string;
  plano?: "mensal" | "anual";
  permanente?: boolean;
  action?: "grant" | "revoke";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { error: "server_misconfigured" });

  // ── Guarda de admin (servidor) ──
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json(401, { error: "missing_authorization" });
  // Client com o JWT do CHAMADOR → borda_is_admin() usa auth.uid() dele.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc("borda_is_admin");
  if (adminErr) {
    console.error("[admin-grant-access] borda_is_admin error:", adminErr);
    return json(403, { error: "forbidden", detail: adminErr.message });
  }
  if (isAdmin !== true) return json(403, { error: "forbidden" });

  // ── Parse ──
  let body: Payload;
  try { body = (await req.json()) as Payload; } catch { return json(400, { error: "invalid_json" }); }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return json(400, { error: "missing_email" });
  const action = body.action ?? "grant";

  // Client privilegiado (service-role) pras operações de provisionamento.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve user_id pelo email (profiles.email é populada no signup).
  const { data: profileRow, error: lookupErr } = await admin
    .from("profiles").select("id").ilike("email", email).maybeSingle();
  if (lookupErr) {
    console.error("[admin-grant-access] profile lookup error:", lookupErr);
    return json(500, { error: "lookup_failed", detail: lookupErr.message });
  }

  // ── REVOKE ──
  if (action === "revoke") {
    if (!profileRow?.id) return json(404, { error: "user_not_found" });
    const { error: revErr } = await admin
      .from("subscriptions")
      .update({ status: "canceled", last_event: "manual_revoke", updated_at: new Date().toISOString() })
      .eq("user_id", profileRow.id)
      .eq("provider", "manual"); // NÃO toca em "eduzz" — quem pagou mantém acesso
    if (revErr) return json(500, { error: "revoke_failed", detail: revErr.message });
    return json(200, { ok: true, revoked: true });
  }

  // ── GRANT ──
  const plano = body.plano === "anual" ? "anual" : "mensal";
  const permanente = body.permanente === true;

  // 1. Conta — cria se não existir (sem senha, igual ao fluxo pago).
  let userId = profileRow?.id ?? null;
  let created = false;
  if (!userId) {
    const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { source: "manual_grant" },
    });
    if (cuErr || !cu.user?.id) {
      console.error("[admin-grant-access] createUser error:", cuErr);
      return json(500, { error: "create_user_failed", detail: cuErr?.message });
    }
    userId = cu.user.id;
    created = true;
  }

  // 2. Link de definir senha (recovery → /reset-password).
  let actionLink: string | null = null;
  try {
    actionLink = await generateRecoveryLink(admin, email, APP_URL);
  } catch (err) {
    console.error("[admin-grant-access] generateLink error:", err);
    // segue: o email cai no fallback /forgot-password.
  }

  // 3. Assinatura manual (upsert idempotente por user_id,provider).
  const { error: subErr } = await admin.from("subscriptions").upsert({
    user_id: userId,
    email,
    provider: "manual",
    plan_code: plano,
    status: "active",
    access_expires_at: computeAccessExpiresAt(plano, permanente),
    last_event: "manual_grant",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (subErr) {
    console.error("[admin-grant-access] upsert subscription error:", subErr);
    return json(500, { error: "subscription_failed", detail: subErr.message });
  }

  // 4. Welcome email com o action_link (mesmo header que a trava interna exige).
  const mail = await sendWelcomeEmail(SUPABASE_URL, SERVICE_ROLE_KEY, {
    email, name: null, plan: plano, action_link: actionLink,
  });
  if (!mail.ok) {
    console.error("[admin-grant-access] send-welcome-email failed:", mail.status, mail.detail);
    // Acesso já foi liberado; sinaliza que o email falhou pra UI avisar.
    return json(200, { ok: true, created, email_sent: false, email_error: `${mail.status}` });
  }

  return json(200, { ok: true, created, email_sent: true });
});
