import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

function isSafePublicUrl(input: string): boolean {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return !PRIVATE_HOST_PATTERNS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event_name, user_email, user_id, design_id, is_test } = body;

    if (!event_name) {
      return new Response(JSON.stringify({ error: "Missing event_name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active webhook configs
    const { data: configs } = await supabase
      .from("webhook_configs")
      .select("*")
      .eq("is_active", true);

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No active webhooks configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      event_name,
      timestamp: new Date().toISOString(),
      user_email: user_email || null,
      user_id: user_id || null,
      design_id: design_id || null,
    };

    const results: { url: string; status: number | string; ok: boolean }[] = [];

    for (const config of configs) {
      // Check if this webhook subscribes to this event
      if (!is_test && config.events && !config.events.includes(event_name)) {
        continue;
      }

      if (!isSafePublicUrl(config.url)) {
        results.push({ url: config.url, status: "blocked", ok: false });
        await supabase.from("integration_logs").insert({
          integration: "webhook",
          event_type: is_test ? "webhook_test" : event_name,
          email: user_email || null,
          user_id: user_id || null,
          status: "error",
          message: `URL bloqueada (apenas HTTPS públicos são aceitos): ${config.url}`,
          payload,
        });
        continue;
      }

      try {
        const response = await fetch(config.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(is_test ? { ...payload, event_name: "webhook_test" } : payload),
        });

        const ok = response.ok;
        results.push({ url: config.url, status: response.status, ok });

        // Log event
        await supabase.from("integration_logs").insert({
          integration: "webhook",
          event_type: is_test ? "webhook_test" : event_name,
          email: user_email || null,
          user_id: user_id || null,
          status: ok ? "success" : "error",
          message: ok
            ? `Webhook enviado para ${config.url} (${response.status})`
            : `Falha ao enviar webhook para ${config.url} (${response.status})`,
          payload,
        });
      } catch (err) {
        results.push({ url: config.url, status: (err as Error).message, ok: false });

        await supabase.from("integration_logs").insert({
          integration: "webhook",
          event_type: is_test ? "webhook_test" : event_name,
          email: user_email || null,
          user_id: user_id || null,
          status: "error",
          message: `Erro de conexão: ${(err as Error).message}`,
          payload,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Dispatch webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
