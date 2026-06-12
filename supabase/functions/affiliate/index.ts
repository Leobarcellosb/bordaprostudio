// Borda Pro — affiliate (Fase 1 do programa de afiliados).
// Uma function, duas ações (body.action):
//   "setup"    → aceita termos + gera referral_code único + salva Pix/endereço
//                (primeiro cadastro completo do wizard "Configurar PIX").
//   "save_pix" → edita Pix/endereço de um perfil já existente.
// Auth: SEMPRE o JWT do usuário logado (verify_jwt=true no config). O user_id e
// o email vêm do token — ninguém configura afiliação de terceiros.
// Leitura de stats NÃO passa por aqui: o onepager lê referrals/affiliate_profile
// direto via RLS own-read (criada na migration 20260612120000).
// Mapeamento do spec: POST /api/affiliate/setup → {action:"setup"};
// POST /api/affiliate/save-pix → {action:"save_pix"}; GET my-stats → RLS direto
// (o endpoint de stats com valores R$ nasce na FASE 2, junto das comissões).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TERMS_VERSION = "v0-draft"; // ⚠️ trocar pra 'v1.0' quando o contador validar o termo

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const clip = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
};

const onlyDigits = (s: string | null): string => (s ?? "").replace(/\D/g, "");

const PIX_TYPES = new Set(["cpf", "email", "phone", "random"]);

interface PixPayload {
  pix_key: string | null;
  pix_type: string | null;
  pix_holder_name: string | null;
  pix_holder_cpf: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
}

function parsePix(body: Record<string, unknown>): { ok: true; data: PixPayload } | { ok: false; error: string } {
  const pixType = clip(body.pix_type, 10);
  const pixKey = clip(body.pix_key, 140);
  const holderName = clip(body.pix_holder_name, 140);
  const holderCpf = onlyDigits(clip(body.pix_holder_cpf, 20));
  if (!pixType || !PIX_TYPES.has(pixType)) return { ok: false, error: "pix_type_invalido" };
  if (!pixKey) return { ok: false, error: "pix_key_obrigatoria" };
  if (!holderName) return { ok: false, error: "titular_obrigatorio" };
  if (holderCpf.length !== 11) return { ok: false, error: "cpf_invalido" };
  // Validação do spec: a chave Pix tipo CPF tem que ser o MESMO CPF do titular.
  if (pixType === "cpf" && onlyDigits(pixKey) !== holderCpf) {
    return { ok: false, error: "pix_cpf_diferente_do_titular" };
  }
  return {
    ok: true,
    data: {
      pix_key: pixKey,
      pix_type: pixType,
      pix_holder_name: holderName,
      pix_holder_cpf: holderCpf,
      address_zip: onlyDigits(clip(body.address_zip, 12)) || null,
      address_street: clip(body.address_street, 200),
      address_number: clip(body.address_number, 20),
      address_complement: clip(body.address_complement, 100),
      address_neighborhood: clip(body.address_neighborhood, 100),
      address_city: clip(body.address_city, 100),
      address_state: clip(body.address_state, 2),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[affiliate] missing env vars");
    return json(500, { error: "server_misconfigured" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Identidade SEMPRE do token (verify_jwt já barrou não-JWT; aqui resolvemos o user).
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await admin.auth.getUser(bearer);
  if (userErr || !userData.user) return json(401, { error: "unauthorized" });
  const user = userData.user;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const action = clip(body.action, 20);

  // ── setup: termos + código + Pix (primeiro cadastro) ─────────────────────────
  if (action === "setup") {
    if (body.terms_accepted !== true) return json(400, { error: "termos_nao_aceitos" });
    const pix = parsePix(body);
    if (!pix.ok) return json(400, { error: pix.error });

    // Já tem perfil? Mantém o código (idempotente), atualiza Pix/termos.
    const { data: existing, error: exErr } = await admin
      .from("affiliate_profile")
      .select("referral_code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (exErr) {
      console.error("[affiliate] profile lookup error:", exErr);
      return json(500, { error: "lookup_failed" });
    }

    let code = existing?.referral_code ?? null;
    if (!code) {
      // Gera br_xxxxxx único (6 hex). Colisão em 16M é rara; tenta 5x.
      for (let i = 0; i < 5 && !code; i++) {
        const candidate = `br_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
        const { count, error } = await admin
          .from("affiliate_profile")
          .select("*", { count: "exact", head: true })
          .eq("referral_code", candidate);
        if (error) {
          console.error("[affiliate] code uniqueness check error:", error);
          return json(500, { error: "code_generation_failed" });
        }
        if ((count ?? 0) === 0) code = candidate;
      }
      if (!code) return json(500, { error: "code_generation_failed" });
    }

    const { error: upErr } = await admin.from("affiliate_profile").upsert(
      {
        user_id: user.id,
        referral_code: code,
        ...pix.data,
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upErr) {
      console.error("[affiliate] setup upsert error:", upErr);
      return json(500, { error: "save_failed" });
    }

    return json(200, { ok: true, referral_code: code, terms_version: TERMS_VERSION });
  }

  // ── save_pix: edita Pix/endereço de perfil existente ─────────────────────────
  if (action === "save_pix") {
    const pix = parsePix(body);
    if (!pix.ok) return json(400, { error: pix.error });

    const { data: updated, error: updErr } = await admin
      .from("affiliate_profile")
      .update({ ...pix.data, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("referral_code")
      .maybeSingle();
    if (updErr) {
      console.error("[affiliate] save_pix error:", updErr);
      return json(500, { error: "save_failed" });
    }
    if (!updated) return json(400, { error: "setup_required" });

    return json(200, { ok: true, referral_code: updated.referral_code });
  }

  return json(400, { error: "unknown_action" });
});
