// Borda Pro — digest semanal.
// Roda toda sexta às 9h Brasília (12h UTC) via cron-job.org chamando
// esta URL com header Authorization: Bearer <SERVICE_ROLE_KEY>.
// Também acionável manualmente pelo admin via supabase.functions.invoke
// (autentica via JWT do admin, não service_role).
//
// Secrets necessários:
//   SUPABASE_URL                — auto-injetado
//   SUPABASE_SERVICE_ROLE_KEY   — auto-injetado
//   RESEND_API_KEY              — manual (já setado p/ send-welcome-email)
//   RESEND_FROM_EMAIL           — manual (já setado)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") ?? "Borda Pro <contato@borda.pro>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://borda.pro";
const LIBRARY_PATH = "/biblioteca";
const BATCH_SIZE = 50;

interface Design {
  id: string;
  name: string;
  cover_image: string | null;
  hoop_size: string | null;
  categories: { name: string } | null;
}

interface Subscription {
  email: string;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Auth check ────────────────────────────────────────────────────────
// Aceita: (a) Bearer <SERVICE_ROLE_KEY> (cron job)
//         (b) Bearer <JWT de user admin> (botão do AdminPanel)
async function authorize(req: Request): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { ok: false, reason: "missing_auth", status: 401 };
  }
  const token = auth.slice("Bearer ".length).trim();

  if (token === SERVICE_ROLE_KEY) {
    return { ok: true };
  }

  // Senão, tenta validar como JWT de usuário admin
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, reason: "invalid_jwt", status: 401 };
  }

  const { data: roles, error: rolesErr } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  if (rolesErr) {
    return { ok: false, reason: "role_lookup_failed", status: 500 };
  }
  const isAdmin = (roles ?? []).some((r) => String(r.role).toLowerCase() === "admin");
  if (!isAdmin) {
    return { ok: false, reason: "not_admin", status: 403 };
  }
  return { ok: true };
}

// ─── HTML template ─────────────────────────────────────────────────────
function buildDesignCellHtml(d: Design): string {
  const safeName = escapeHtml(d.name || "Sem nome");
  const safeHoop = d.hoop_size ? escapeHtml(d.hoop_size) : null;
  const imgOrEmoji = d.cover_image
    ? `<img src="${escapeHtml(d.cover_image)}" alt="${safeName}" width="240" height="240" style="display:block;width:100%;max-width:240px;height:auto;border-radius:12px;object-fit:cover;background:#f5f5f7;">`
    : `<div style="width:100%;max-width:240px;aspect-ratio:1/1;border-radius:12px;background:linear-gradient(135deg,#f5f5f7,#eaeaea);display:flex;align-items:center;justify-content:center;font-size:48px;">🪡</div>`;

  return `
    <td valign="top" style="padding:8px;width:50%;">
      ${imgOrEmoji}
      <p style="margin:10px 0 2px;font-size:14px;font-weight:600;color:#1a1a1a;line-height:1.3;">${safeName}</p>
      ${safeHoop ? `<p style="margin:0;font-size:12px;color:#888;">${safeHoop}</p>` : ""}
    </td>
  `;
}

function buildHtml(newDesigns: Design[]): string {
  const designCount = newDesigns.length;
  const visibles = newDesigns.slice(0, 6);
  // Monta linhas de 2 colunas
  const rows: string[] = [];
  for (let i = 0; i < visibles.length; i += 2) {
    const a = buildDesignCellHtml(visibles[i]);
    const b = visibles[i + 1] ? buildDesignCellHtml(visibles[i + 1]) : `<td style="width:50%;"></td>`;
    rows.push(`<tr>${a}${b}</tr>`);
  }
  const designsTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("")}</table>`;
  const moreText = designCount > 6
    ? `<p style="margin:20px 0 0;text-align:center;color:#888;font-size:13px;">+ ${designCount - 6} ${designCount - 6 === 1 ? "matriz" : "matrizes"} na biblioteca</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Resumo da semana — Borda Pro</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

          <!-- Header gradient roxo -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%);padding:32px;text-align:center;color:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:14px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                    <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.04em;">B</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:14px 0 4px;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">Borda Pro</h1>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);">Seu resumo da semana</p>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding:36px 32px 16px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;color:#1a1a1a;">
                🪡 ${designCount} nova${designCount > 1 ? "s" : ""} matriz${designCount > 1 ? "es" : ""} essa semana!
              </h2>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#666;">
                Confira o que chegou de novo na biblioteca:
              </p>
            </td>
          </tr>

          <!-- Grid de designs -->
          <tr>
            <td style="padding:16px 24px 8px;">
              ${designsTable}
              ${moreText}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:32px 32px 40px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="border-radius:12px;background:#7C3AED;">
                    <a href="${APP_URL}${LIBRARY_PATH}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:12px;">
                      Ver todas na biblioteca →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#fafafa;text-align:center;color:#999;font-size:12px;line-height:1.5;">
              <p style="margin:0 0 4px;">Borda Pro · <a href="${APP_URL}" style="color:#7C3AED;text-decoration:none;">borda.pro</a></p>
              <p style="margin:0;">Você recebe este email por ser assinante ativa.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildSubject(count: number): string {
  return `🪡 ${count} nova${count > 1 ? "s" : ""} matri${count > 1 ? "zes" : "z"} no Borda Pro esta semana`;
}

// ─── Server ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const auth = await authorize(req);
  if (!auth.ok) {
    console.error(`[weekly-digest] auth failed: ${auth.reason}`);
    return json(auth.status, { error: auth.reason });
  }

  if (!RESEND_API_KEY) {
    return json(500, { error: "resend_not_configured" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Designs publicados nos últimos 7 dias
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: newDesignsRaw, error: designsErr } = await supabase
    .from("designs")
    .select("id, name, cover_image, hoop_size, categories(name)")
    .eq("is_published", true)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(12);

  if (designsErr) {
    console.error("[weekly-digest] designs query error:", designsErr);
    return json(500, { error: "designs_query_failed", detail: designsErr.message });
  }

  const newDesigns = (newDesignsRaw ?? []) as unknown as Design[];

  if (newDesigns.length === 0) {
    console.log("[weekly-digest] no new designs this week — skipping send");
    return json(200, { ok: true, sent: 0, reason: "no_new_designs" });
  }

  // 2. Assinantes ativas com acesso vigente
  const nowIso = new Date().toISOString();
  const { data: subsRaw, error: subsErr } = await supabase
    .from("subscriptions")
    .select("email")
    .eq("status", "active")
    .gt("access_expires_at", nowIso);

  if (subsErr) {
    console.error("[weekly-digest] subs query error:", subsErr);
    return json(500, { error: "subs_query_failed", detail: subsErr.message });
  }

  // Dedupe por email (caso haja duplicatas)
  const uniqueEmails = Array.from(
    new Set(
      ((subsRaw ?? []) as Subscription[])
        .map((s) => (s.email ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (uniqueEmails.length === 0) {
    console.log("[weekly-digest] no active subscribers — skipping send");
    return json(200, { ok: true, sent: 0, reason: "no_active_subscribers" });
  }

  // 3. Monta HTML/subject (mesma versão pra todos — TODO: personalizar por machine_format)
  const html = buildHtml(newDesigns);
  const subject = buildSubject(newDesigns.length);

  // 4. Envia em batches de 50 via Resend batch
  let totalSent = 0;
  let totalFailed = 0;
  const failures: { batchIndex: number; status: number; detail: string }[] = [];

  for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
    const batch = uniqueEmails.slice(i, i + BATCH_SIZE);
    const emails = batch.map((email) => ({
      from: FROM_EMAIL,
      to: [email],
      subject,
      html,
      tags: [{ name: "type", value: "weekly_digest" }],
    }));

    const resp = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emails),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error(`[weekly-digest] batch ${i / BATCH_SIZE} failed`, resp.status, detail);
      failures.push({ batchIndex: i / BATCH_SIZE, status: resp.status, detail });
      totalFailed += batch.length;
    } else {
      totalSent += batch.length;
    }
  }

  // 5. Log no integration_logs
  await supabase.from("integration_logs").insert({
    integration: "resend",
    event_type: "weekly_digest",
    status: totalFailed === 0 ? "success" : "error",
    message:
      totalFailed === 0
        ? `Digest enviado para ${totalSent} assinantes — ${newDesigns.length} novos designs`
        : `Digest parcial: ${totalSent} ok, ${totalFailed} falharam de ${uniqueEmails.length} total`,
    payload: {
      designs: newDesigns.length,
      subscribers: uniqueEmails.length,
      sent: totalSent,
      failed: totalFailed,
      failures: failures.slice(0, 5),
    },
  });

  return json(200, {
    ok: true,
    sent: totalSent,
    failed: totalFailed,
    subscribers: uniqueEmails.length,
    designs: newDesigns.length,
  });
});
