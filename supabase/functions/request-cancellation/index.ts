// Borda Pro — request-cancellation.
// Auto-serviço de cancelamento (CDC art. 49). <=7 dias da 1ª fatura → reembolso
// integral + corte imediato (pending_refund, admin processa no Eduzz). >7 dias →
// sem reembolso, acesso até access_expires_at (pending_cancellation). Chamado
// AUTENTICADO (JWT). Idempotente. NÃO toca no eduzz-webhook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Borda Pro <contato@borda.pro>";

const PAID_STATUSES = new Set(["active", "approved", "paid"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const clip = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
};
const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

// E-mail branded (mesmo visual dos templates de auth). Variante por elegibilidade.
function cancellationHtml(opts: { refundEligible: boolean; refundAmount: number | null; accessUntil: string | null }): { subject: string; html: string } {
  const { refundEligible, refundAmount, accessUntil } = opts;
  const body = refundEligible
    ? `<p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111827;">Cancelamento confirmado</p>
       <p style="margin:0 0 16px 0;">Sua assinatura foi cancelada e o reembolso de <strong>R$ ${(refundAmount ?? 0).toFixed(2).replace(".", ",")}</strong> está em processamento — chega no método de pagamento original em até <strong>7 dias úteis</strong>.</p>
       <p style="margin:0 0 8px 0;">Obrigado por ter dado uma chance pro Borda Pro. Se mudar de ideia, a gente tá aqui. 💜</p>`
    : `<p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111827;">Cancelamento agendado</p>
       <p style="margin:0 0 16px 0;">Sua próxima cobrança foi cancelada. Você continua com acesso ao Borda Pro até <strong>${fmtDate(accessUntil)}</strong> — aproveita!</p>
       <p style="margin:0 0 8px 0;">Quando o acesso expirar, sua conta fica guardada por 90 dias caso queira voltar. 💜</p>`;
  return {
    subject: refundEligible ? "Cancelamento confirmado — Reembolso em processamento" : `Cancelamento agendado — Você usa até ${fmtDate(accessUntil)}`,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f5f5f5;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;padding:40px 20px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td bgcolor="#7c3aed" style="padding:32px 40px;text-align:center;background-color:#7c3aed;background:linear-gradient(135deg,#8937e6 0%,#6d28d9 100%);">
<img src="https://borda.pro/lockup-offwhite.png" alt="Borda Pro" width="150" style="display:inline-block;max-width:150px;height:auto;"></td></tr>
<tr><td style="padding:40px;color:#1f2937;line-height:1.6;font-size:16px;">${body}</td></tr>
<tr><td style="padding:24px 40px;background:#f9fafb;color:#6b7280;font-size:13px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-weight:600;color:#4b5563;">Time Borda Pro</p></td></tr>
</table></td></tr></table></body></html>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[request-cancellation] missing env vars");
    return json(500, { error: "server_misconfigured" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await admin.auth.getUser(bearer);
  if (userErr || !userData.user) return json(401, { error: "unauthorized" });
  const user = userData.user;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }

  const reasonKey = clip(body.reason_key, 40);
  const reasonLabel = clip(body.reason_label, 200);
  if (!reasonKey || !reasonLabel) return json(400, { error: "reason_required" });
  const reasonOther = clip(body.reason_other_text, 2000);
  const retentionShown = clip(body.retention_offer_shown, 40);
  const finalFeedback = clip(body.final_feedback_text, 2000);

  // Subscription paga do usuário (pode ter +1 linha; pega a paga ativa).
  const { data: subs, error: subErr } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (subErr) { console.error("[request-cancellation] sub load error:", subErr); return json(500, { error: "lookup_failed" }); }

  // Idempotência PRIMEIRO: pedido pendente já existe (cobre re-tentativa de quem
  // já está em pending_refund/pending_cancellation, cujo sub não é mais "pago").
  const { data: existing } = await admin
    .from("cancellation_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending_refund", "pending_cancellation"])
    .limit(1);
  if (existing && existing.length > 0) {
    return json(200, { ok: true, already_requested: true, request_id: existing[0].id });
  }

  const sub = (subs ?? []).find((s) => PAID_STATUSES.has(s.status)) ?? null;
  if (!sub) return json(400, { error: "no_active_subscription" });

  // Elegibilidade de reembolso: <=7 dias da 1ª fatura paga.
  const firstPaidAt = sub.first_paid_at ? new Date(sub.first_paid_at) : null;
  const daysSince = firstPaidAt ? Math.floor((Date.now() - firstPaidAt.getTime()) / 86_400_000) : null;
  const refundEligible = firstPaidAt !== null && daysSince !== null && daysSince <= 7;

  const isAnual = (sub.plan_code ?? "").toLowerCase().includes("anual");
  const refundAmount = refundEligible ? (isAnual ? 397.0 : 49.9) : null;
  const nowIso = new Date().toISOString();
  const newStatus = refundEligible ? "pending_refund" : "pending_cancellation";
  const newAccessExpires = refundEligible ? nowIso : sub.access_expires_at; // corte imediato vs mantém
  const cancelAtPeriodEnd = !refundEligible;

  const { data: request, error: reqErr } = await admin
    .from("cancellation_requests")
    .insert({
      user_id: user.id,
      subscription_id: sub.id,
      status: newStatus,
      reason_key: reasonKey,
      reason_label: reasonLabel,
      reason_other_text: reasonOther,
      retention_offer_shown: retentionShown,
      retention_offer_accepted: false,
      refund_eligible: refundEligible,
      refund_amount_brl: refundAmount,
      first_paid_at_snapshot: sub.first_paid_at ?? null,
      days_since_first_payment: daysSince,
      final_feedback_text: finalFeedback,
    })
    .select("id")
    .single();
  if (reqErr) { console.error("[request-cancellation] insert error:", reqErr); return json(500, { error: "request_failed" }); }

  const { error: updErr } = await admin
    .from("subscriptions")
    .update({
      status: newStatus,
      cancellation_requested_at: nowIso,
      cancellation_reason: reasonKey,
      cancel_at_period_end: cancelAtPeriodEnd,
      refund_eligible: refundEligible,
      refund_amount_brl: refundAmount,
      access_expires_at: newAccessExpires,
      updated_at: nowIso,
    })
    .eq("id", sub.id);
  if (updErr) console.error("[request-cancellation] sub update error:", updErr); // best-effort; pedido já gravado

  await admin.from("integration_logs").insert({
    integration: "billing",
    event_type: "cancellation_requested",
    user_id: user.id,
    email: user.email,
    status: "success",
    message: `Cancelamento ${newStatus} (refund_eligible=${refundEligible}, dias=${daysSince}).`,
    payload: { reason_key: reasonKey, refund_eligible: refundEligible, days_since_pay: daysSince },
  }).then(({ error }) => { if (error) console.error("[request-cancellation] log error:", error); });

  // Email branded (best-effort — não derruba o cancelamento).
  if (RESEND_API_KEY && user.email) {
    try {
      const { subject, html } = cancellationHtml({ refundEligible, refundAmount, accessUntil: newAccessExpires });
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: user.email, subject, html }),
      });
    } catch (e) { console.error("[request-cancellation] email error:", e); }
  }

  return json(200, {
    ok: true,
    request_id: request.id,
    refund_eligible: refundEligible,
    refund_amount: refundAmount,
    access_until: newAccessExpires,
    next_step: refundEligible ? "refund_processing" : "access_until_period_end",
  });
});
