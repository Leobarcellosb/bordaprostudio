import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function logEvent(
  supabase: any,
  integration: string,
  eventType: string,
  email: string | null,
  userId: string | null,
  status: "success" | "error" | "pending",
  message: string,
  payload?: any
) {
  try {
    await supabase.from("integration_logs").insert({
      integration, event_type: eventType, email, user_id: userId,
      status, message, payload: payload || null,
    });
  } catch (e) {
    console.error("Failed to log event:", e);
  }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const ok = (extra?: object) =>
    new Response(JSON.stringify({ received: true, ...extra }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const rawBody = await req.text();
  const secret = Deno.env.get("EDUZZ_WEBHOOK_SECRET");

  if (secret) {
    const provided = (
      req.headers.get("X-Eduzz-Signature") ||
      req.headers.get("x-eduzz-signature") ||
      req.headers.get("X-Signature") ||
      ""
    ).trim().replace(/^sha256=/i, "");

    if (!provided) {
      await logEvent(supabase, "eduzz", "unauthorized", null, null, "error", "Assinatura HMAC ausente");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await hmacSha256Hex(secret, rawBody);
    if (!timingSafeEqual(provided.toLowerCase(), expected.toLowerCase())) {
      await logEvent(supabase, "eduzz", "unauthorized", null, null, "error", "Assinatura HMAC inválida");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { payload = {}; }

    // Support both old flat format and new nested format
    const data = payload.data || payload;
    const eduzzEvent = (payload.event || "").toString().toLowerCase();
    const buyer = data.buyer || {};
    const student = data.student || {};

    const buyerEmail = (
      buyer.email || student.email || data.cus_email || data.buyer_email || data.email || ""
    ).toString().toLowerCase().trim();

    const buyerId = String(buyer.id || data.cus_id || data.buyer_id || data.customer_id || "");
    const invoiceId = String(data.id || data.inv_id || data.invoice_id || data.transaction_id || "");

    // Collect product IDs from items array or flat fields
    const items = Array.isArray(data.items) ? data.items : [];
    const offerId = String(
      items[0]?.productId || data.pro_id || data.offer_id || data.product_id || ""
    );

    const eventType = (
      eduzzEvent || data.trans_status || data.event_type || data.status || ""
    ).toString().toLowerCase();

    if (!buyerEmail) {
      console.log("No buyer email found, ignoring event:", eventType);
      await logEvent(supabase, "eduzz", eventType || "unknown", null, null, "pending", "Email ausente — evento ignorado", payload);
      return ok({ note: "no_email" });
    }

    // Determine plan
    const offerMensalId = Deno.env.get("EDUZZ_OFFER_MENSAL_ID") || "";
    const offerAnualId = Deno.env.get("EDUZZ_OFFER_ANUAL_ID") || "";
    let planCode = "mensal";
    if (offerId === offerAnualId && offerAnualId) planCode = "anual";
    else if (offerId === offerMensalId && offerMensalId) planCode = "mensal";

    // Map status from event name or status field
    const paidPatterns = ["paid", "approved", "completed", "purchase_approved", "invoice_paid"];
    const pendingPatterns = ["open", "waiting", "pending", "waiting_payment"];
    const inactivePatterns = ["canceled", "cancelled", "expired", "refunded", "chargeback", "invoice_refunded", "invoice_chargeback", "subscription_canceled", "purchase_refunded"];

    const matchesAny = (val: string, patterns: string[]) => patterns.some(p => val.includes(p));

    let status: "active" | "pending" | "inactive";
    if (matchesAny(eventType, paidPatterns)) {
      status = "active";
    } else if (matchesAny(eventType, inactivePatterns)) {
      status = "inactive";
    } else if (matchesAny(eventType, pendingPatterns)) {
      status = "pending";
    } else {
      // Unknown event (e.g. cart_abandonment) — log and return 200
      console.log("Unrecognized event type, ignoring:", eventType);
      await logEvent(supabase, "eduzz", eventType, buyerEmail, null, "pending", `Evento não reconhecido: ${eventType}`, payload);
      return ok({ note: "unrecognized_event" });
    }

    // Find or create user
    let userId: string | null = null;

    const { data: existingProfile } = await supabase
      .from("profiles").select("id").eq("email", buyerEmail).maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Try to find user in auth system first (may exist without profile)
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const existingAuth = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === buyerEmail);

      if (existingAuth) {
        userId = existingAuth.id;
        console.log("Found existing auth user without profile:", userId);
      } else {
        // Create new user via invite — sends email with link to set password
        const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "";
        const redirectTo = siteUrl ? `${siteUrl}/reset-password` : undefined;

        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(buyerEmail, {
          data: { name: buyer.name || buyerEmail.split("@")[0], invited_via: "eduzz" },
          redirectTo,
        });

        if (inviteError) {
          console.error("Invite failed:", inviteError.message);
          // Fallback: create user directly
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: buyerEmail,
            email_confirm: true,
            user_metadata: { name: buyer.name || buyerEmail.split("@")[0] },
          });

          if (createError) {
            console.error("User creation also failed:", createError.message);
            await logEvent(supabase, "eduzz", eventType, buyerEmail, null, "error", `Falha ao criar usuário: ${createError.message}`, payload);
            return ok({ note: "user_creation_failed" });
          }
          userId = newUser.user.id;
          await logEvent(supabase, "eduzz", "user_created", buyerEmail, userId, "success", "Usuário criado via Eduzz (fallback createUser)");
        } else {
          userId = inviteData.user.id;
          await logEvent(supabase, "eduzz", "user_invited", buyerEmail, userId, "success", "Convite enviado via Eduzz — cliente receberá email para criar senha");
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Calculate access expiration
    let accessExpiresAt: string | null = null;
    if (status === "active") {
      const now = new Date();
      now.setDate(now.getDate() + (planCode === "anual" ? 365 : 30));
      accessExpiresAt = now.toISOString();
    }

    // Upsert subscription
    const { data: existingSub } = await supabase
      .from("subscriptions").select("id").eq("user_id", userId).eq("provider", "eduzz").maybeSingle();

    const subscriptionData = {
      user_id: userId, email: buyerEmail, provider: "eduzz",
      provider_buyer_id: buyerId, provider_invoice_id: invoiceId,
      provider_offer_id: offerId, plan_code: planCode, status,
      access_expires_at: accessExpiresAt, last_event: eventType,
      raw_payload: payload, updated_at: new Date().toISOString(),
    };

    if (existingSub) {
      await supabase.from("subscriptions").update(subscriptionData).eq("id", existingSub.id);
    } else {
      await supabase.from("subscriptions").insert(subscriptionData);
    }

    // Update profile plan
    if (status === "active") {
      await supabase.from("profiles").update({ plan: planCode, updated_at: new Date().toISOString() }).eq("id", userId);
    } else if (status === "inactive") {
      await supabase.from("profiles").update({ plan: "basic", updated_at: new Date().toISOString() }).eq("id", userId);
    }

    let eventMessage = `Evento ${eventType} processado`;
    if (status === "active") eventMessage = `Assinatura ${planCode} ativada`;
    else if (status === "inactive") {
      if (eventType.includes("refund")) eventMessage = "Reembolso processado — acesso removido";
      else if (eventType.includes("cancel")) eventMessage = "Assinatura cancelada — acesso removido";
      else eventMessage = "Assinatura desativada";
    }

    await logEvent(supabase, "eduzz", eventType, buyerEmail, userId, status === "active" ? "success" : status === "inactive" ? "error" : "pending", eventMessage, payload);

    // Dispatch outgoing webhooks
    if (status === "active") {
      try {
        const { data: configs } = await supabase.from("webhook_configs").select("*").eq("is_active", true);
        if (configs?.length) {
          const webhookPayload = { event_name: "subscription_started", timestamp: new Date().toISOString(), user_email: buyerEmail, user_id: userId, design_id: null };
          for (const config of configs) {
            if (config.events && !config.events.includes("subscription_started")) continue;
            try {
              const resp = await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookPayload) });
              await logEvent(supabase, "webhook", "subscription_started", buyerEmail, userId, resp.ok ? "success" : "error", `Webhook enviado para ${config.url} (${resp.status})`);
            } catch (err) {
              await logEvent(supabase, "webhook", "subscription_started", buyerEmail, userId, "error", `Erro: ${(err as Error).message}`);
            }
          }
        }
      } catch {}
    }

    console.log(`Subscription updated: user=${userId}, status=${status}, plan=${planCode}`);
    return ok({ status, plan_code: planCode });

  } catch (error) {
    console.error("Webhook error:", error);
    try { await logEvent(supabase, "eduzz", "error", null, null, "error", `Erro interno: ${(error as Error).message}`); } catch {}
    return ok({ note: "internal_error" });
  }
});
