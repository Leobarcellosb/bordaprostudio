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

// Match EXATO contra listas fechadas (não substring): .includes() classificava
// errado nomes plausíveis ("invoice_unpaid" casa "paid", "subscription_inactive"
// casa "active") e concederia acesso indevidamente. Evento fora das listas agora
// cai no caminho SEGURO (log needs_review, sem tocar a assinatura) — então errar
// pra "desconhecido" é barato; errar pra "pago" não é.
// contract_created/contract_updated SAÍRAM de PAID: chegam ANTES do invoice_paid
// (anual/boleto) e concediam 365d antes do dinheiro entrar; contract_updated nem
// significa pagamento. Acesso só em pagamento confirmado.
const PAID_EVENTS = new Set([
  "invoice_paid",
  "paid",
  "active",
  "purchase_complete",
  "subscription_renewed",
]);
const CANCELED_EVENTS = new Set([
  "invoice_refunded",
  "refunded",
  "chargeback",
  "invoice_chargeback",
  "cancelled",
  "canceled",
  "subscription_canceled",
  "subscription_cancelled",
  "invoice_canceled",
  "invoice_cancelled",
  "contract_canceled",
  "contract_cancelled",
]);

function detectStatus(event: string): "active" | "canceled" | "pending" {
  const e = event
    .toLowerCase()
    .trim()
    .replace(/^myeduzz\./i, "")
    .replace(/^sun\./i, "");
  if (PAID_EVENTS.has(e)) return "active";
  if (CANCELED_EVENTS.has(e)) return "canceled";
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
    // refund de Borda Pro num payload enxuto (sem data.items).
    const needsReview = detectStatus(evName) === "canceled";

    // Fallback de revogação SEGURA por invoice: o payload myeduzz traz o id da
    // fatura em data.id mesmo quando vem sem items. Se uma assinatura eduzz tem
    // esse provider_invoice_id, o refund É de Borda Pro — revoga no automático
    // sem risco de derrubar quem comprou outro produto. Sem match → needs_review.
    if (needsReview) {
      const invId =
        pickString(payload.invoice?.id) ?? pickString(dataInvoice.id) ?? pickString(dataObj.id);
      if (invId) {
        try {
          const { data: subRow, error: findErr } = await supabase
            .from("subscriptions")
            .select("id, user_id, email")
            .eq("provider", "eduzz")
            .eq("provider_invoice_id", invId)
            .maybeSingle();
          if (findErr) throw findErr;
          if (subRow) {
            const { error: updErr } = await supabase
              .from("subscriptions")
              .update({
                status: "canceled",
                access_expires_at: null,
                last_event: evName,
                raw_payload: payload,
                updated_at: new Date().toISOString(),
              })
              .eq("id", subRow.id);
            if (updErr) throw updErr;
            try {
              await supabase.from("integration_logs").insert({
                integration: "eduzz",
                event_type: evName,
                email: subRow.email ?? ignoredEmail,
                user_id: subRow.user_id,
                status: "success",
                message: `Refund/cancelamento sem items REVOGADO via match de provider_invoice_id=${invId}.`,
                payload,
              });
            } catch (e) {
              console.error("[eduzz-webhook] invoice-revoke log error:", e);
            }
            console.log(`[eduzz-webhook] revogado via invoice match (${invId})`);
            return json(200, { ok: true, revoked_by_invoice: invId });
          }
        } catch (e) {
          // Falhou o fallback → cai no needs_review abaixo (não some em silêncio).
          console.error("[eduzz-webhook] invoice-match revoke error:", e);
        }
      }
    }
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

  // Evento DESCONHECIDO (fora das listas fechadas): caminho SEGURO — loga pra
  // revisão e responde 200 SEM tocar usuário/assinatura. Antes virava 'pending'
  // e o upsert SOBRESCREVIA assinatura ativa com pending + expiração nula
  // (derrubava pagante no meio do ciclo, ex.: invoice_created de renewal boleto).
  if (subscriptionStatus === "pending") {
    try {
      await supabase.from("integration_logs").insert({
        integration: "eduzz",
        event_type: eventName,
        email: buyerEmail,
        status: "needs_review",
        message: `Evento desconhecido (${eventName}) — nenhuma alteração de assinatura aplicada.`,
        payload,
      });
    } catch (e) {
      console.error("[eduzz-webhook] unknown-event log insert error:", e);
    }
    console.log(`[eduzz-webhook] evento desconhecido (${eventName}) — needs_review, sem alteração`);
    return json(200, { ok: true, ignored: true, reason: "unknown_event", event: eventName });
  }

  const providerBuyerId =
    pickString(payload.buyer?.id) ?? pickString(dataBuyer.id);
  // Payload real (myeduzz) traz o id da FATURA em data.id (não em data.invoice.id).
  const providerInvoiceId =
    pickString(payload.invoice?.id) ?? pickString(dataInvoice.id) ?? pickString(dataObj.id);
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

  // 3a'. ATRIBUIÇÃO DE AFILIADA (Fase 1 — só tracking; comissões nascem na Fase 2).
  // Dois caminhos, nesta ordem:
  //   (1) fallback por EMAIL: a amiga entrou pelo trial (?ref) — o referral já
  //       existe; na PRIMEIRA fatura marca first_paid_at/status (renewal no-op
  //       via filtro first_paid_at IS NULL — idempotente em retry da Eduzz).
  //   (2) utm_campaign do checkout: só códigos br_* (utm de anúncio, ex.
  //       "1202355...", não é código de afiliada) e só se o código existir em
  //       affiliate_profile. Autoindicação (mesma conta) entra flagged.
  if (subscriptionUpserted && subscriptionStatus === "active") {
    try {
      const nowIso = new Date().toISOString();
      const { data: emailRefs } = await supabase
        .from("referrals")
        .select("id")
        .ilike("referred_email", buyerEmail)
        .is("first_paid_at", null);

      if (emailRefs && emailRefs.length > 0) {
        await supabase
          .from("referrals")
          .update({
            referred_user_id: userId,
            first_paid_at: nowIso,
            status: "paid_first",
            updated_at: nowIso,
          })
          .in("id", emailRefs.map((r) => r.id));
      } else {
        const utmObj = (dataObj.utm ?? {}) as Record<string, unknown>;
        const utmCode = pickString(utmObj.campaign);
        if (utmCode && utmCode.startsWith("br_")) {
          const { data: aff } = await supabase
            .from("affiliate_profile")
            .select("user_id")
            .eq("referral_code", utmCode)
            .maybeSingle();
          if (aff?.user_id) {
            const { count } = await supabase
              .from("referrals")
              .select("*", { count: "exact", head: true })
              .eq("referral_code", utmCode)
              .ilike("referred_email", buyerEmail);
            if ((count ?? 0) === 0) {
              const self = aff.user_id === userId;
              await supabase.from("referrals").insert({
                referrer_id: utmCode,
                referrer_user_id: aff.user_id,
                referral_code: utmCode,
                referred_email: buyerEmail,
                referred_user_id: userId,
                source: "utm_campaign",
                status: "paid_first",
                first_paid_at: nowIso,
                flagged_for_review: self,
                flag_reason: self ? "self_referral" : null,
              });
            }
          }
        }
      }
    } catch (e) {
      // Atribuição é best-effort: NUNCA derruba o provisionamento da venda.
      console.error("[eduzz-webhook] referral attribution error:", e);
    }
  }

  // 3a. Welcome SÓ uma vez na vida do user (na primeira fatura paga; renewal não).
  // Critério: NÃO existe marcador welcome_email_sent pra esse user. Basear o gate
  // SÓ no marcador (e não em logs de invoice_paid) garante RETRY natural: se o
  // envio falhar na primeira fatura, o marcador não é gravado e o próximo evento
  // pago (renewal) re-tenta — antes, o log success do passo 4 envenenava o gate e
  // o pagante ficava sem caminho de senha pra sempre. Cohort histórica (pagou
  // antes do marcador existir) recebe UM welcome no próximo renewal — desejável
  // (é a cohort sem senha); suprimível via backfill de marcadores (script SQL).
  // O check roda ANTES do log do passo 4 (ordem importa).
  let isFirstPaidInvoice = false;
  if (subscriptionUpserted && subscriptionStatus === "active") {
    try {
      const { count, error } = await supabase
        .from("integration_logs")
        .select("*", { count: "exact", head: true })
        .eq("integration", "eduzz")
        .eq("user_id", userId)
        .eq("event_type", "welcome_email_sent");
      if (error) throw error;
      isFirstPaidInvoice = (count ?? 0) === 0;
    } catch (err) {
      // Fail-open: melhor 1 welcome a mais (raro, só se o check falhar) do que
      // um pagante novo sem caminho de senha.
      console.error("[eduzz-webhook] first-paid check error (fail-open):", err);
      isFirstPaidInvoice = true;
    }
  }

  // 3b. Boas-vindas — fire-and-forget (não bloqueia a resposta pro Eduzz), mas
  // NADA falha em silêncio: erro de generateLink ou de envio vai pra integration_logs.
  // A conta criada pelo webhook NÃO tem senha → sem um link de definir senha o
  // cliente não consegue logar. Dispara na PRIMEIRA fatura paga da vida, INCLUSIVE
  // se a conta já existir (caso trial→paid); nunca em renewals.
  if (subscriptionUpserted && subscriptionStatus === "active" && isFirstPaidInvoice) {
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
      } else {
        // Marca o envio (status success): além de auditoria, esse registro também
        // entra no critério de "primeira fatura" e impede welcome repetido.
        try {
          await supabase.from("integration_logs").insert({
            integration: "eduzz",
            event_type: "welcome_email_sent",
            email: buyerEmail,
            user_id: userId,
            status: "success",
            message: `Welcome enviado (primeira fatura paga; plano ${planCode}; link de senha ${actionLink ? "ok" : "fallback /forgot-password"}).`,
          });
        } catch (e) {
          console.error("[eduzz-webhook] welcome_email_sent log insert error:", e);
        }
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
