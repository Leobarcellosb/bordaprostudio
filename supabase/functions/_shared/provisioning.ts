// Lógica de provisionamento de acesso COMPARTILHADA entre:
//   - eduzz-webhook    (compra paga, provider="eduzz")
//   - admin-grant-access (liberação manual, provider="manual")
// Objetivo: a regra (validade, link de senha, envio do email) vive num só lugar.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Validade do acesso.
 *  - permanent=true  → null (sem expiração; has_active_subscription trata null como vitalício)
 *  - anual           → +365 dias
 *  - mensal/outro    → +30 dias
 */
export function computeAccessExpiresAt(
  plan: "mensal" | "anual" | string | null | undefined,
  permanent = false,
): string | null {
  if (permanent) return null;
  const days = plan === "anual" ? 365 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Gera o link de DEFINIR SENHA (recovery) com redirectTo pra /reset-password.
 * Sem o redirectTo o link cai na home (Site URL) sem formulário → dead-end.
 * Lança se não vier action_link.
 */
export async function generateRecoveryLink(
  supabase: SupabaseClient,
  email: string,
  appUrl: string,
): Promise<string> {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl}/reset-password` },
  });
  if (error) throw error;
  const link = data?.properties?.action_link ?? null;
  if (!link) throw new Error("generateLink retornou sem action_link");
  return link;
}

/**
 * Chama a edge function send-welcome-email com o action_link.
 * Header obrigatório: Authorization: Bearer <SERVICE_ROLE_KEY> — a trava interna
 * da send-welcome-email compara o token por IGUALDADE (verify_jwt=false porque a
 * service key do projeto é sb_secret_, não JWT). Sem esse header → 401.
 * Não lança: devolve {ok,status,detail} pro caller logar/decidir.
 */
export async function sendWelcomeEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    email: string;
    name?: string | null;
    plan?: string | null;
    action_link: string | null;
  },
): Promise<{ ok: boolean; status: number; detail?: string }> {
  const r = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    let detail = "";
    try { detail = await r.text(); } catch { /* ignore */ }
    return { ok: false, status: r.status, detail };
  }
  return { ok: true, status: r.status };
}
