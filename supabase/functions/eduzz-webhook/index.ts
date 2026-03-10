import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      integration,
      event_type: eventType,
      email,
      user_id: userId,
      status,
      message,
      payload: payload || null,
    });
  } catch (e) {
    console.error("Failed to log event:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Optional: validate webhook secret token
    const webhookSecret = Deno.env.get("EDUZZ_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authToken = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
      if (authToken !== webhookSecret && authToken !== `Bearer ${webhookSecret}`) {
        await logEvent(supabase, "eduzz", "auth_failed", null, null, "error", "Token de webhook inválido");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    console.log("Eduzz webhook received:", JSON.stringify(payload));

    // Eduzz webhook fields
    const buyerEmail = (payload.cus_email || payload.buyer_email || payload.email || "").toLowerCase();
    const buyerId = String(payload.cus_id || payload.buyer_id || payload.customer_id || "");
    const invoiceId = String(payload.inv_id || payload.invoice_id || payload.transaction_id || "");
    const offerId = String(payload.pro_id || payload.offer_id || payload.product_id || "");
    const eventType = (payload.trans_status || payload.event_type || payload.status || "").toString().toLowerCase();

    if (!buyerEmail) {
      await logEvent(supabase, "eduzz", eventType || "unknown", null, null, "error", "Email do comprador ausente no payload", payload);
      return new Response(JSON.stringify({ error: "Missing buyer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine plan
    const offerMensalId = Deno.env.get("EDUZZ_OFFER_MENSAL_ID") || "";
    const offerAnualId = Deno.env.get("EDUZZ_OFFER_ANUAL_ID") || "";
    let planCode = "mensal";
    if (offerId === offerAnualId && offerAnualId) planCode = "anual";
    else if (offerId === offerMensalId && offerMensalId) planCode = "mensal";

    // Map status
    const paidStatuses = ["3", "paid", "approved", "completed", "purchase_approved"];
    const pendingStatuses = ["1", "6", "open", "waiting", "pending", "waiting_payment"];
    const inactiveStatuses = ["4", "7", "11", "canceled", "cancelled", "expired", "refunded", "chargeback", "purchase_refunded", "subscription_canceled"];

    let status: "active" | "pending" | "inactive";
    if (paidStatuses.includes(eventType)) {
      status = "active";
    } else if (pendingStatuses.includes(eventType)) {
      status = "pending";
    } else if (inactiveStatuses.includes(eventType)) {
      status = "inactive";
    } else {
      status = "pending";
    }

    // Find or create user
    let userId: string | null = null;

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", buyerEmail)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        email_confirm: true,
        user_metadata: { name: buyerEmail.split("@")[0] },
      });

      if (createError) {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const found = authUsers?.users?.find(
          (u: any) => u.email?.toLowerCase() === buyerEmail
        );
        if (found) {
          userId = found.id;
        } else {
          await logEvent(supabase, "eduzz", eventType, buyerEmail, null, "error", `Falha ao criar usuário: ${createError.message}`, payload);
          return new Response(JSON.stringify({ error: "User creation failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = newUser.user.id;
        await logEvent(supabase, "eduzz", "user_created", buyerEmail, userId, "success", `Usuário criado automaticamente via Eduzz`);
        // Wait for profile trigger
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
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "eduzz")
      .maybeSingle();

    const subscriptionData = {
      user_id: userId,
      email: buyerEmail,
      provider: "eduzz",
      provider_buyer_id: buyerId,
      provider_invoice_id: invoiceId,
      provider_offer_id: offerId,
      plan_code: planCode,
      status,
      access_expires_at: accessExpiresAt,
      last_event: eventType,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
    };

    if (existingSub) {
      await supabase.from("subscriptions").update(subscriptionData).eq("id", existingSub.id);
    } else {
      await supabase.from("subscriptions").insert(subscriptionData);
    }

    // Update profile plan
    if (status === "active") {
      await supabase
        .from("profiles")
        .update({ plan: planCode, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else if (status === "inactive") {
      await supabase
        .from("profiles")
        .update({ plan: "basic", updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    // Determine human-readable event description
    let eventMessage = `Evento ${eventType} processado`;
    if (status === "active") eventMessage = `Assinatura ${planCode} ativada`;
    else if (status === "inactive" && inactiveStatuses.includes(eventType)) {
      if (eventType.includes("refund")) eventMessage = "Reembolso processado — acesso removido";
      else if (eventType.includes("cancel")) eventMessage = "Assinatura cancelada — acesso removido";
      else eventMessage = "Assinatura desativada";
    }

    await logEvent(supabase, "eduzz", eventType, buyerEmail, userId, status === "active" ? "success" : status === "inactive" ? "error" : "pending", eventMessage, payload);

    // Dispatch outgoing webhooks for subscription events
    if (status === "active") {
      try {
        const { data: configs } = await supabase.from("webhook_configs").select("*").eq("is_active", true);
        if (configs && configs.length > 0) {
          const webhookPayload = {
            event_name: "subscription_started",
            timestamp: new Date().toISOString(),
            user_email: buyerEmail,
            user_id: userId,
            design_id: null,
          };
          for (const config of configs) {
            if (config.events && !config.events.includes("subscription_started")) continue;
            try {
              const resp = await fetch(config.url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(webhookPayload),
              });
              await logEvent(supabase, "webhook", "subscription_started", buyerEmail, userId, resp.ok ? "success" : "error", `Webhook enviado para ${config.url} (${resp.status})`);
            } catch (err) {
              await logEvent(supabase, "webhook", "subscription_started", buyerEmail, userId, "error", `Erro de conexão: ${(err as Error).message}`);
            }
          }
        }
      } catch {}
    }

    console.log(`Subscription updated: user=${userId}, status=${status}, plan=${planCode}`);

    return new Response(JSON.stringify({ success: true, status, plan_code: planCode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    await logEvent(supabase, "eduzz", "error", null, null, "error", `Erro interno: ${(error as Error).message}`);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
