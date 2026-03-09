import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    console.log("Eduzz webhook received:", JSON.stringify(payload));

    // Eduzz webhook fields (adapt based on actual Eduzz payload structure)
    const buyerEmail = payload.cus_email || payload.buyer_email || payload.email || "";
    const buyerId = String(payload.cus_id || payload.buyer_id || payload.customer_id || "");
    const invoiceId = String(payload.inv_id || payload.invoice_id || payload.transaction_id || "");
    const offerId = String(payload.pro_id || payload.offer_id || payload.product_id || "");
    const eventType = (payload.trans_status || payload.event_type || payload.status || "").toString().toLowerCase();

    if (!buyerEmail) {
      console.error("No buyer email found in payload");
      return new Response(JSON.stringify({ error: "Missing buyer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine plan based on offer ID
    const offerMensalId = Deno.env.get("EDUZZ_OFFER_MENSAL_ID") || "";
    const offerAnualId = Deno.env.get("EDUZZ_OFFER_ANUAL_ID") || "";

    let planCode = "mensal"; // default
    if (offerId === offerAnualId && offerAnualId) {
      planCode = "anual";
    } else if (offerId === offerMensalId && offerMensalId) {
      planCode = "mensal";
    }

    // Map Eduzz status to internal status
    // Eduzz statuses: 1=Open, 3=Paid, 4=Canceled, 6=Waiting, 7=Refunded, 11=Chargeback
    let status: "active" | "pending" | "inactive";
    const paidStatuses = ["3", "paid", "approved", "completed"];
    const pendingStatuses = ["1", "6", "open", "waiting", "pending", "waiting_payment"];
    const inactiveStatuses = ["4", "7", "11", "canceled", "cancelled", "expired", "refunded", "chargeback"];

    if (paidStatuses.includes(eventType)) {
      status = "active";
    } else if (pendingStatuses.includes(eventType)) {
      status = "pending";
    } else if (inactiveStatuses.includes(eventType)) {
      status = "inactive";
    } else {
      console.log("Unknown event type, storing as pending:", eventType);
      status = "pending";
    }

    // Find or create user by email
    let userId: string | null = null;

    // Check profiles table first
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", buyerEmail.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create user via auth if not exists
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail.toLowerCase(),
        email_confirm: true,
        user_metadata: { name: buyerEmail.split("@")[0] },
      });

      if (createError) {
        // User might exist in auth but not in profiles
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const found = authUsers?.users?.find(
          (u: any) => u.email?.toLowerCase() === buyerEmail.toLowerCase()
        );
        if (found) {
          userId = found.id;
        } else {
          console.error("Failed to create/find user:", createError.message);
          return new Response(JSON.stringify({ error: "User creation failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = newUser.user.id;
      }
    }

    // Calculate access expiration
    let accessExpiresAt: string | null = null;
    if (status === "active") {
      const now = new Date();
      if (planCode === "anual") {
        now.setDate(now.getDate() + 365);
      } else {
        now.setDate(now.getDate() + 30);
      }
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
      email: buyerEmail.toLowerCase(),
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
      await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", existingSub.id);
    } else {
      await supabase.from("subscriptions").insert(subscriptionData);
    }

    // Update profile plan
    if (status === "active") {
      await supabase
        .from("profiles")
        .update({ plan: planCode === "anual" ? "anual" : "mensal", updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else if (status === "inactive") {
      await supabase
        .from("profiles")
        .update({ plan: "basic", updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    console.log(`Subscription updated: user=${userId}, status=${status}, plan=${planCode}`);

    return new Response(JSON.stringify({ success: true, status, plan_code: planCode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
