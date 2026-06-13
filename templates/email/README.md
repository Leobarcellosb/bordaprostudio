# Emails de Auth — branding + deliverabilidade (Fase 1)

Templates branded da Borda Pro para os emails de **Auth do Supabase** (confirm
signup, magic link, reset de senha, change email). Hoje esses emails saem pelo
SMTP **Default** do Supabase (remetente "Supabase", IP compartilhado → caem em
spam). Esta fase troca por **Resend SMTP** + templates da marca.

> ⚠️ A welcome email (`send-welcome-email`) NÃO é afetada — ela já vai por Resend
> via edge function. O problema é só o canal de **Auth**, que é separado.

## Diagnóstico (jun/2026)
1. **Domínio `borda.pro` no Resend → verificado** (evidência: a welcome envia de
   `contato@borda.pro` em prod e o Resend recusa domínio não-verificado).
   Confirmar os 3 verdes (DKIM/SPF/DMARC) em https://resend.com/domains.
2. **API key Resend → existe** (`RESEND_API_KEY`, secret do Supabase). Pegar a
   string em https://resend.com/api-keys (o valor do secret não é legível).
3. **SMTP do Auth → Default** (causa raiz). Trocar pra Custom (passos abaixo).

## Passos no Supabase Dashboard (Leo executa)

### 1. Custom SMTP — Authentication → Settings → SMTP Settings
- Enable Custom SMTP: **ON**
- Sender email: **`contato@borda.pro`** (recomendado: mesmo da welcome → reputação
  já aquecida. Alternativas válidas: `ola@borda.pro`, `nao-responda@borda.pro`)
- Sender name: **`Borda Pro`**
- Host: **`smtp.resend.com`**
- Port: **`465`** (SSL)
- Username: **`resend`**
- Password: **a API key do Resend** (passo 2 do diagnóstico)
- Minimum interval: default (60s) → Salvar.

### 2. Templates — Authentication → Email Templates
Para cada um, colar o HTML do arquivo correspondente:
| Template no Dashboard | Arquivo |
|---|---|
| Confirm signup | `confirm-signup.html` |
| Magic Link | `magic-link.html` |
| Reset Password | `reset-password.html` |
| Change Email Address | `change-email.html` |

Os templates usam só `{{ .ConfirmationURL }}` (válido em todos os 4).

### 3. URL Configuration — Authentication → URL Configuration
- Site URL: **`https://borda.pro`**
- Redirect URLs: incluir **`https://borda.pro/**`** (+ domínio Vercel de staging,
  se houver). Sem isso, links de email podem apontar pra localhost.

## Teste de deliverabilidade (end-to-end, caixas reais)
Não confiar no "Send test email". Para Gmail, Outlook/Hotmail e Yahoo:
1. Signup → confirmar que o email chega na **Primary** (não spam/promoções).
2. "Esqueci a senha" → confirmar reset na Primary.
Se cair em spam: checar `borda.pro` em https://mxtoolbox.com/SuperTool.aspx
(SPF, DKIM, DMARC todos verdes).

## Notas
- **Logo:** uso `https://borda.pro/lockup-offwhite.png` (lockup branco já público)
  no header violeta. `logo-white.png` do spec não existe; este é o equivalente.
  Conferir visualmente que renderiza bem no fundo violeta.
- **Cor:** violeta da marca real `#8937e6→#6d28d9` (= `--primary` HSL 268 78% 56%),
  não o `#9333ea` genérico.
- DNS pro Resend SMTP usa o MESMO DKIM já configurado pra welcome — não deve
  precisar de DNS novo. Confirmar no mxtoolbox por garantia.
