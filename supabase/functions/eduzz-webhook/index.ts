// Borda Pro — Eduzz webhook.
// Receives payment events from Eduzz, validates HMAC signature,
// upserts subscription + ensures auth user exists, logs the event.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("EDUZZ_WEBHOOK_SECRET");

// Webhooks são server-to-server (Eduzz → Supabase). CORS não se aplica.
// Mantemos apenas Content-Type nas respostas.
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

interface EduzzPayload {
  event?: string;
  status?: string;
  product?: { id?: string | number; code?: string; name?: string };
  buyer?: { email?: string; id?: string | number; name?: string };
  invoice?: { id?: string | number };
  offer?: { id?: string | number; code?: string };
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

// B3: substring match contra prefixos. A Eduzz manda eventos no formato
// "myeduzz.invoice_paid" / "sun.invoice_refunded" etc. — antes batia o
// match exato e tudo caía em "pending" (subscription criada sem expira_at).
// Agora normaliza removendo prefixo conhecido e usa .includes() pra tolerar
// variantes futuras de naming.

const PAID_KEYWORDS = [
  "invoice_paid",
  "paid",
  "active",
  "purchase_complete",
  "subscription_renewed",
  "contract_created",
  "contract_updated",
];
const CANCELED_KEYWORDS = [
  "invoice_refunded",
  "refunded",
  "chargeback",          // mantido do código original — sinal forte de cancelamento
  "cancelled",
  "canceled",
  "subscription_canceled",
  "subscription_cancelled",
  "invoice_canceled",
  "invoice_cancelled",
];

function detectStatus(event: string): "active" | "canceled" | "pending" {
  const e = event
    .toLowerCase()
    .trim()
    .replace(/^myeduzz\./i, "")
    .replace(/^sun\./i, "");
  if (PAID_KEYWORDS.some((p) => e.includes(p))) return "active";
  if (CANCELED_KEYWORDS.some((c) => e.includes(c))) return "canceled";
  return "pending";
}

function detectPlanCode(payload: EduzzPayload): "mensal" | "anual" {
  const haystacks = [
    payload.product?.code,
    payload.product?.name,
    payload.offer?.code,
    typeof payload.data === "object" && payload.data
      ? JSON.stringify(payload.data)
      : "",
    JSON.stringify(payload),
  ].join(" ").toLowerCase();
  if (haystacks.includes("anual") || haystacks.includes("yearly")) return "anual";
  return "mensal";
}

function computeExpiresAt(plan: "mensal" | "anual"): string {
  const now = new Date();
  const days = plan === "anual" ? 365 : 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function pickString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[eduzz-webhook] missing Supabase env vars");
    return json(500, { error: "server_misconfigured" });
  }

  // Fail-closed: sem secret configurada, webhook NÃO aceita nada.
  if (!WEBHOOK_SECRET) {
    console.error(
      "[eduzz-webhook] EDUZZ_WEBHOOK_SECRET not set — refusing all requests",
    );
    return json(500, { error: "Webhook secret not configured" });
  }

  const rawBody = await req.text();

  // Eduzz envia ping de teste ao salvar a URL no painel — não vem com
  // assinatura HMAC. Aceita silenciosamente sem processar nem gravar nada.
  // Match por header explícito + corpo vazio/{} + parse semântico de event:"test"
  // (evita falso positivo de substring match em payloads reais).
  let isTestRequest =
    req.headers.get("x-eduzz-test") === "true" ||
    rawBody === "{}" ||
    rawBody.trim() === "";

  if (!isTestRequest && rawBody.trim().startsWith("{")) {
    try {
      const probe = JSON.parse(rawBody);
      // Eduzz envia event: "ping" no health-check ao salvar a URL.
      // "test" mantido por compatibilidade caso eles renomeiem.
      if (probe?.event === "ping" || probe?.event === "test") {
        isTestRequest = true;
      }
    } catch {
      /* não é JSON válido, segue pra validação HMAC normal */
    }
  }

  if (isTestRequest) {
    console.log("[eduzz-webhook] test request received — responding 200 without processing");
    return json(200, { ok: true, test: true });
  }

  const provided =
    req.headers.get("x-signature") ||
    req.headers.get("x-eduzz-signature") ||
    req.headers.get("x-hub-signature-256") ||
    req.headers.get("x-hub-signature") ||
    "";
  const cleaned = provided.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!cleaned) return json(401, { error: "missing_signature" });
  const expected = await hmacSha256Hex(WEBHOOK_SECRET, rawBody);
  if (!timingSafeEqual(cleaned, expected.toLowerCase())) {
    return json(401, { error: "invalid_signature" });
  }

  let payload: EduzzPayload = {};
  try {
    payload = JSON.parse(rawBody) as EduzzPayload;
  } catch {
    return json(400, { error: "invalid_json" });
  }

  // B4: A Eduzz envia os dados aninhados em `data` (data.buyer.email etc.).
  // Mantemos fallback pra payload.buyer no root (formato legado / outros
  // gateways). Sempre tenta root primeiro, depois data.
  const dataObj = (payload.data ?? {}) as Record<string, unknown>;
  const dataBuyer = (dataObj.buyer ?? {}) as { email?: unknown; id?: unknown; name?: unknown };
  const dataInvoice = (dataObj.invoice ?? {}) as { id?: unknown; status?: unknown };
  const dataProduct = (dataObj.product ?? {}) as { id?: unknown; code?: unknown; name?: unknown };
  const dataOffer = (dataObj.offer ?? {}) as { id?: unknown; code?: unknown };

  const buyerEmail =
    pickString(payload.buyer?.email) ?? pickString(dataBuyer.email);
  if (!buyerEmail) {
    return json(200, { ok: true, note: "no_email" });
  }

  const eventName = pickString(payload.event) ?? pickString(payload.status) ?? "unknown";
  const subscriptionStatus = detectStatus(eventName);
  const planCode = detectPlanCode(payload);
  const providerBuyerId =
    pickString(payload.buyer?.id) ?? pickString(dataBuyer.id);
  const providerInvoiceId =
    pickString(payload.invoice?.id) ?? pickString(dataInvoice.id);
  const providerOfferId =
    pickString(payload.offer?.id) ??
    pickString(dataOffer.id) ??
    pickString(payload.product?.id) ??
    pickString(dataProduct.id);
  const buyerName =
    pickString(payload.buyer?.name) ?? pickString(dataBuyer.name);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Find user by email — paginate through admin.listUsers if needed.
  let userId: string | null = null;
  try {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw error;
    const match = data?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === buyerEmail.toLowerCase(),
    );
    if (match) userId = match.id;
  } catch (err) {
    console.error("[eduzz-webhook] listUsers error:", err);
  }

  // 2. Create user if not found.
  if (!userId) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        email_confirm: true,
        user_metadata: { name: buyerName, source: "eduzz" },
      });
      if (error) throw error;
      userId = data.user?.id ?? null;
    } catch (err) {
      console.error("[eduzz-webhook] createUser error:", err);
    }
  }

  if (!userId) {
    return json(200, { ok: true, note: "user_resolution_failed" });
  }

  // 3. Upsert subscription.
  const accessExpiresAt =
    subscriptionStatus === "active" ? computeExpiresAt(planCode) : null;

  try {
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        email: buyerEmail,
        provider: "eduzz",
        provider_buyer_id: providerBuyerId,
        provider_invoice_id: providerInvoiceId,
        provider_offer_id: providerOfferId,
        plan_code: planCode,
        status: subscriptionStatus,
        access_expires_at: accessExpiresAt,
        last_event: eventName,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw error;
  } catch (err) {
    console.error("[eduzz-webhook] upsert subscription error:", err);
  }

  // 4. Log event.
  try {
    await supabase.from("integration_logs").insert({
      integration: "eduzz",
      event_type: eventName,
      email: buyerEmail,
      user_id: userId,
      status:
        subscriptionStatus === "active"
          ? "success"
          : subscriptionStatus === "canceled"
            ? "error"
            : "pending",
      message: `Evento ${eventName} processado como ${subscriptionStatus}`,
      payload,
    });
  } catch (err) {
    console.error("[eduzz-webhook] log insert error:", err);
  }

  return json(200, { ok: true });
});
