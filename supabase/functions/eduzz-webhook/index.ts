// Borda Pro — Eduzz webhook.
// Receives payment events from Eduzz, validates HMAC signature,
// upserts subscription + ensures auth user exists, logs the event.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeAccessExpiresAt,
  generateRecoveryLink,
  sendWelcomeEmail,
} from "../_shared/provisioning.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("EDUZZ_WEBHOOK_SECRET");
const APP_URL = Deno.env.get("APP_URL") ?? "https://borda.pro";

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

type PlanCode = "mensal" | "anual";

// Mapa productId -> plano (secret BORDA_PRO_PRODUCT_MAP, JSON), ex.:
//   {"2981834":"anual","<id_mensal>":"mensal"}
// Resolve o filtro de produto E o plano de uma vez: se o productId do item
// está no mapa, é Borda Pro e o valor diz qual plano. Substitui a antiga
// heurística por nome (que não funcionava: o payload real não traz product.code/name).
// Fail-closed: mapa vazio (não-configurado ou JSON inválido) => nada casa => nada concede.
function loadProductPlanMap(): Record<string, PlanCode> {
  const raw = Deno.env.get("BORDA_PRO_PRODUCT_MAP") ?? "";
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, PlanCode> = Object.create(null); // sem prototype (evita match em toString/constructor/etc.)
    for (const [id, plan] of Object.entries(parsed)) {
      const p = String(plan).toLowerCase().trim();
      if ((p === "mensal" || p === "anual") && id.trim()) out[id.trim()] = p;
    }
    return out;
  } catch (e) {
    console.error("[eduzz-webhook] BORDA_PRO_PRODUCT_MAP inválido (esperado JSON):", e);
    return {};
  }
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

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── FIX: filtro + plano por productId ────────────────────────────────────────
  // A Eduzz (myeduzz) manda os produtos em data.items[].productId (pode haver
  // mais de um por causa de order bump). O mapa BORDA_PRO_PRODUCT_MAP resolve
  // filtro E plano: concede se ALGUM item casar no mapa, com o plano que o mapa
  // indicar. Nenhum item Borda Pro => log "ignored" + 200, sem conceder.
  // Roda ANTES do tratamento de status, então vale também pra refund/chargeback:
  // só revoga se o item for Borda Pro (escopo por produto). Fail-closed: mapa vazio
  // => nada casa => nada concede/altera.
  const PRODUCT_PLAN_MAP = loadProductPlanMap();

  const items = Array.isArray(dataObj.items)
    ? (dataObj.items as Array<Record<string, unknown>>)
    : [];
  const candidateProductIds = [
    ...items.map((it) => pickString(it?.productId)),
    // fallback p/ formato legado / testes manuais (product no root ou em data.product)
    pickString(payload.product?.id),
    pickString(dataProduct.id),
  ].filter((v): v is string => v !== null);

  if (Object.keys(PRODUCT_PLAN_MAP).length === 0) {
    console.error(
      "[eduzz-webhook] BORDA_PRO_PRODUCT_MAP vazio/não-configurado — fail-closed: nenhuma assinatura será concedida",
    );
  }

  // hasOwnProperty (NÃO `in`): `in` casaria chaves herdadas do prototype
  // ("toString"/"constructor"/etc.) e concederia mesmo com o mapa vazio (fail-OPEN).
  const matchedProductId =
    candidateProductIds.find((id) =>
      Object.prototype.hasOwnProperty.call(PRODUCT_PLAN_MAP, id),
    ) ?? null;
  // Auditoria: grava o produto Borda Pro que casou; se nenhum casar, o 1º item.
  const providerProductId = matchedProductId ?? candidateProductIds[0] ?? null;

  if (!matchedProductId) {
    const evName = pickString(payload.event) ?? pickString(payload.status) ?? "unknown";
    const ignoredEmail = pickString(payload.buyer?.email) ?? pickString(dataBuyer.email);
    const idsStr = candidateProductIds.join(", ") || "nenhum";
    // Cancelamento/refund SEM produto identificável NÃO some em silêncio: pode ser
    // refund de Borda Pro num payload enxuto (sem data.items). Marca "needs_review"
    // e NÃO revoga no automático — revogar por email derrubaria o Borda Pro de quem
    // comprou OUTRO produto. Revogação precisa do payload real de refund (por invoice).
    const needsReview = detectStatus(evName) === "canceled";
    try {
      await supabase.from("integration_logs").insert({
        integration: "eduzz",
        event_type: evName,
        email: ignoredEmail,
        status: needsReview ? "needs_review" : "ignored",
        message: needsReview
          ? `Cancelamento/refund SEM produto identificável (productIds=[${idsStr}]). Se for Borda Pro, revogar manualmente — não revogado no automático pra não derrubar quem comprou outro produto.`
          : `Nenhum produto Borda Pro no evento (productIds=[${idsStr}]) — assinatura NÃO concedida.`,
        payload,
      });
    } catch (e) {
      console.error("[eduzz-webhook] ignored/needs_review log insert error:", e);
    }
    console.log(
      `[eduzz-webhook] ${needsReview ? "cancelamento sem produto (needs_review)" : "sem produto Borda Pro (ignored)"} (productIds=[${idsStr}])`,
    );
    return json(200, {
      ok: true,
      ignored: true,
      reason: needsReview ? "canceled_without_product" : "product_not_borda_pro",
      product_ids: candidateProductIds,
    });
  }

  // Plano vem do MAPA (o productId diz qual é) — não depende mais de heurística de nome.
  const planCode: PlanCode = PRODUCT_PLAN_MAP[matchedProductId];
  // ── fim do filtro de produto ─────────────────────────────────────────────────

  const buyerEmail =
    pickString(payload.buyer?.email) ?? pickString(dataBuyer.email);
  if (!buyerEmail) {
    return json(200, { ok: true, note: "no_email" });
  }

  const eventName = pickString(payload.event) ?? pickString(payload.status) ?? "unknown";
  const subscriptionStatus = detectStatus(eventName);
  const providerBuyerId =
    pickString(payload.buyer?.id) ?? pickString(dataBuyer.id);
  const providerInvoiceId =
    pickString(payload.invoice?.id) ?? pickString(dataInvoice.id);
  // provider_offer_id agora é só a oferta (o produto tem campo próprio: provider_product_id).
  const providerOfferId =
    pickString(payload.offer?.id) ?? pickString(dataOffer.id);
  const buyerName =
    pickString(payload.buyer?.name) ?? pickString(dataBuyer.name);

  // 1. Find user by email — busca direta na tabela profiles em vez de
  // listUsers (que tinha limite implícito de 200 e quebraria após
  // ~200 cadastros). profiles.email é populada pelo trigger que dispara
  // ao INSERT em auth.users; busca é O(1) com índice no email.
  //
  // Nota: supabase-js v2.x não tem auth.admin.getUserByEmail nem suporta
  // filter em listUsers — esse approach via profiles é o jeito limpo
  // hoje em Supabase. Se ainda precisar do auth.users diretamente
  // (ex: campos do auth não duplicados no profile), dá pra adicionar
  // uma RPC SECURITY DEFINER que consulta auth.users.
  let userId: string | null = null;
  try {
    const { data: profileRow, error: lookupErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", buyerEmail) // case-insensitive
      .maybeSingle();
    if (lookupErr) throw lookupErr;
    if (profileRow?.id) userId = profileRow.id;
  } catch (err) {
    console.error("[eduzz-webhook] profile lookup error:", err);
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
    // Não conseguimos resolver/criar o usuário (erro logado acima nos catches
    // de lookup/createUser). Devolve 500 pra Eduzz RETENTAR — devolver 200 aqui
    // faria a assinatura paga se perder sem reenvio nem trilha de retry.
    console.error("[eduzz-webhook] user_resolution_failed for", buyerEmail);
    return json(500, { error: "user_resolution_failed" });
  }

  // 3. Upsert subscription.
  const accessExpiresAt =
    subscriptionStatus === "active" ? computeAccessExpiresAt(planCode) : null;

  let subscriptionUpserted = false;
  try {
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        email: buyerEmail,
        provider: "eduzz",
        provider_buyer_id: providerBuyerId,
        provider_invoice_id: providerInvoiceId,
        provider_offer_id: providerOfferId,
        provider_product_id: providerProductId,
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
    subscriptionUpserted = true;
  } catch (err) {
    console.error("[eduzz-webhook] upsert subscription error:", err);
  }

  // 3b. Boas-vindas — fire-and-forget (não bloqueia a resposta pro Eduzz), mas
  // NADA falha em silêncio: erro de generateLink ou de envio vai pra integration_logs.
  // A conta criada pelo webhook NÃO tem senha → sem um link de definir senha o
  // cliente não consegue logar (o CTA não pode apontar pro /biblioteca protegido).
  if (subscriptionUpserted && subscriptionStatus === "active") {
    const logErr = async (eventType: string, message: string) => {
      try {
        await supabase.from("integration_logs").insert({
          integration: "eduzz",
          event_type: eventType,
          email: buyerEmail,
          user_id: userId,
          status: "error",
          message: message.slice(0, 500),
          payload,
        });
      } catch (e) {
        console.error("[eduzz-webhook] integration_logs insert error:", e);
      }
    };

    const welcomeFlow = (async () => {
      // 1) Link de definir senha (recovery → /reset-password). Helper compartilhado
      //    com admin-grant-access. Sem isso o pagante fica preso no login.
      let actionLink: string | null = null;
      try {
        actionLink = await generateRecoveryLink(supabase, buyerEmail, APP_URL);
      } catch (err) {
        console.error("[eduzz-webhook] generateLink error:", err);
        await logErr(
          "welcome_link_error",
          `Falha ao gerar link de senha: ${err instanceof Error ? err.message : String(err)}`,
        );
        // Segue mesmo assim: o email cai no fallback /forgot-password.
      }

      // 2) Welcome email com o action_link (helper compartilhado; manda o
      //    Authorization: Bearer service-role que a trava interna exige).
      const mail = await sendWelcomeEmail(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        email: buyerEmail,
        name: buyerName,
        plan: planCode,
        action_link: actionLink,
      });
      if (!mail.ok) {
        console.error("[eduzz-webhook] send-welcome-email failed:", mail.status, mail.detail);
        await logErr("welcome_email_error", `send-welcome-email HTTP ${mail.status}: ${mail.detail ?? ""}`);
      }
    })();

    // EdgeRuntime.waitUntil mantém a function viva até a promise terminar mesmo
    // depois de retornar a response. Em dev local (sem o global), aguarda inline.
    const rt = (globalThis as unknown as {
      EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void };
    }).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(welcomeFlow);
    else await welcomeFlow;
  }

  // 4. Log event (trilha de auditoria — registra inclusive a falha de upsert).
  try {
    await supabase.from("integration_logs").insert({
      integration: "eduzz",
      event_type: eventName,
      email: buyerEmail,
      user_id: userId,
      status: !subscriptionUpserted
        ? "error"
        : subscriptionStatus === "active"
          ? "success"
          : subscriptionStatus === "canceled"
            ? "error"
            : "pending",
      message: subscriptionUpserted
        ? `Evento ${eventName} processado como ${subscriptionStatus}`
        : `Falha ao gravar subscription do evento ${eventName} — devolvendo 500 para retry da Eduzz`,
      payload,
    });
  } catch (err) {
    console.error("[eduzz-webhook] log insert error:", err);
  }

  // Se o upsert da subscription falhou, devolve 500 pra Eduzz RETENTAR o
  // webhook. Devolver 200 aqui faria a assinatura paga se perder em silêncio
  // (provedor marca como entregue e nunca reenvia). O erro já foi logado no
  // catch do passo 3 e na trilha (integration_logs) acima.
  if (!subscriptionUpserted) {
    return json(500, { error: "subscription_upsert_failed" });
  }

  return json(200, { ok: true });
});
