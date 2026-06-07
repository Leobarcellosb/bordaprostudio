// Borda Pro — email transacional de boas-vindas via Resend.
// Chamado pelo eduzz-webhook após subscription com status "active".
//
// Requer secrets no Supabase:
//   RESEND_API_KEY        — obrigatório, https://resend.com/api-keys
//   RESEND_FROM_EMAIL     — opcional, default "onboarding@resend.dev"
//                           (domínio Resend de testes; pra produção
//                            verifique seu próprio domínio em resend.com/domains
//                            e use ex: "Borda Pro <contato@borda.pro>")

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") ?? "Borda Pro <contato@borda.pro>";
const APP_URL =
  Deno.env.get("APP_URL") ?? "https://borda.pro";
// Path do button — Português (rota /biblioteca no app)
const LIBRARY_PATH = "/biblioteca";

interface Payload {
  email: string;
  name?: string | null;
  plan?: "mensal" | "anual" | string | null;
  /** Link de definir senha (recovery action_link gerado pelo webhook). A conta
   *  criada pelo webhook não tem senha — sem isso o cliente não consegue logar. */
  action_link?: string | null;
}

const FORGOT_URL = `${APP_URL}/forgot-password`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(name: string, planLabel: string, ctaUrl: string): string {
  const safeName = escapeHtml(name);
  const safePlan = escapeHtml(planLabel);
  const safeCta = escapeHtml(ctaUrl);
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bem-vinda ao Borda Pro</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

          <!-- Header (gradient roxo Borda Pro) -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%);padding:40px 32px;text-align:center;color:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:14px;width:56px;height:56px;text-align:center;vertical-align:middle;">
                    <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.04em;">B</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:16px 0 4px;font-size:28px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">Borda Pro</h1>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);">Biblioteca de Matrizes de Bordado</p>
            </td>
          </tr>

          <!-- Saudação + CTA principal -->
          <tr>
            <td style="padding:40px 32px 32px;">
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;color:#1a1a1a;">
                Seja bem-vinda, ${safeName}! 🎉
              </h2>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Sua assinatura do <strong style="color:#1a1a1a;">${safePlan}</strong> está ativa. Você tem acesso a mais de 650 matrizes de bordado, organizadas e filtradas pelo formato da sua máquina.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:12px;background:#7C3AED;">
                    <a href="${safeCta}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:12px;">
                      Crie sua senha e acesse →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#999999;">
                O link de definição de senha expira em 1 hora. Expirou? Crie uma nova senha em
                <a href="${FORGOT_URL}" style="color:#7C3AED;text-decoration:none;">borda.pro/forgot-password</a>.
              </p>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding:0 32px 8px;border-top:1px solid #eaeaea;">
              <h3 style="margin:32px 0 16px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#666666;">
                Por onde começar
              </h3>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-weight:600;font-size:15px;color:#1a1a1a;">
                      1. Configure sua máquina
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#666666;">
                      Em Configurações, selecione o formato da sua máquina (PES, JEF, DST...) e o tamanho do bastidor. A biblioteca filtra tudo automaticamente.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-weight:600;font-size:15px;color:#1a1a1a;">
                      2. Explore por tema
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#666666;">
                      Na Biblioteca, clique em <em>Por Tema</em> pra ver matrizes em pastas por categoria — Dinos, Florais, Infantil, Religioso, etc.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;">
                    <p style="margin:0 0 4px;font-weight:600;font-size:15px;color:#1a1a1a;">
                      3. Baixe e borde
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#666666;">
                      Clique em qualquer matriz, escolha seu formato e baixe. O download inteligente também gera um ZIP com várias de uma vez.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#fafafa;text-align:center;color:#999999;font-size:12px;line-height:1.5;">
              <p style="margin:0 0 4px;">Borda Pro · <a href="https://borda.pro" style="color:#7C3AED;text-decoration:none;">borda.pro</a></p>
              <p style="margin:0;">Dúvidas? É só responder este email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(name: string, planLabel: string, ctaUrl: string): string {
  return `Seja bem-vinda, ${name}!

Sua assinatura do ${planLabel} no Borda Pro está ativa. Você tem acesso a mais de 650 matrizes de bordado.

Crie sua senha e acesse: ${ctaUrl}
(O link expira em 1 hora. Expirou? Crie uma nova senha em ${FORGOT_URL})

Por onde começar:

1. Configure sua máquina (Configurações)
   Selecione formato (PES, JEF, DST...) e bastidor. A biblioteca filtra automaticamente.

2. Explore por tema
   Na Biblioteca, clique em "Por Tema" pra ver matrizes em pastas.

3. Baixe e borde
   Clique em qualquer matriz, escolha o formato e baixe.

Dúvidas? Responda este email.

— Borda Pro
borda.pro
`;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Auth interna (server-to-server, chamado pelo eduzz-webhook).
  // verify_jwt está FALSE pra essa function porque o SUPABASE_SERVICE_ROLE_KEY
  // do projeto é o novo formato sb_secret_ (NÃO é JWT) — o gateway verify_jwt
  // rejeitava com INVALID_JWT_FORMAT. Aqui validamos por IGUALDADE do segredo
  // (string), que funciona tanto pra JWT legado quanto pra sb_secret_.
  const INTERNAL_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const presented = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!INTERNAL_KEY || presented !== INTERNAL_KEY) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    console.error("[send-welcome-email] RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "resend_not_configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.email || typeof body.email !== "string") {
    return new Response(JSON.stringify({ error: "missing_email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = (body.name && body.name.trim()) || "bordadeira";
  const planLabel = body.plan === "anual" ? "Plano Anual" : "Plano Mensal";
  // CTA = link de definir senha (action_link do webhook). Se faltar, cai no
  // fluxo de recuperação — nunca aponta pro /biblioteca protegido (dead-end).
  const ctaUrl = (body.action_link && body.action_link.trim()) ? body.action_link.trim() : FORGOT_URL;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [body.email],
      subject: "Bem-vinda ao Borda Pro! Sua biblioteca está pronta 🎉",
      html: buildHtml(name, planLabel, ctaUrl),
      text: buildText(name, planLabel, ctaUrl),
      tags: [
        { name: "type", value: "welcome" },
        { name: "plan", value: planLabel.toLowerCase().replace(" ", "_") },
      ],
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("[send-welcome-email] Resend error", resendRes.status, errText);
    return new Response(
      JSON.stringify({ error: "resend_failed", status: resendRes.status, detail: errText }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const resendData = await resendRes.json();
  console.log(`[send-welcome-email] sent to ${body.email}, resend_id=${resendData?.id}`);
  return new Response(JSON.stringify({ ok: true, resend_id: resendData?.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
