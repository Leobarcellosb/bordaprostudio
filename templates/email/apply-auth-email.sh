#!/usr/bin/env bash
# Configura SMTP do Resend + os 4 templates branded no Supabase Auth, via
# Management API, NUM COMANDO SÓ. Substitui ~20 campos manuais do Dashboard.
#
# Pré-requisitos (exporte ANTES de rodar — nada fica hardcoded):
#   export SUPABASE_PAT=sbp_...        # Personal Access Token: https://supabase.com/dashboard/account/tokens
#   export RESEND_API_KEY=re_...       # a MESMA key do Resend (https://resend.com/api-keys)
# Uso:
#   bash templates/email/apply-auth-email.sh
#
# Reversível: é só re-rodar com outros valores, ou ajustar no Dashboard.
set -euo pipefail
: "${SUPABASE_PAT:?export SUPABASE_PAT=sbp_... (https://supabase.com/dashboard/account/tokens)}"
: "${RESEND_API_KEY:?export RESEND_API_KEY=re_... (a key do Resend; valor não é legível dos secrets)}"

REF="mepvdblcphcgebsxpykk"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API="https://api.supabase.com/v1/projects/${REF}/config/auth"

show() { python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps({k:d.get(k) for k in ['smtp_host','smtp_port','smtp_user','smtp_admin_email','smtp_sender_name','mailer_subjects_recovery']},indent=2,ensure_ascii=False))"; }

echo "=== ANTES (deve mostrar smtp_host nulo/default) ==="
curl -fsS "$API" -H "Authorization: Bearer ${SUPABASE_PAT}" | show

PAYLOAD="$(RESEND_API_KEY="$RESEND_API_KEY" DIR="$DIR" python3 <<'PY'
import json, os
d = os.environ["DIR"]
def html(f):
    with open(os.path.join(d, f), encoding="utf-8") as fh:
        return fh.read()
print(json.dumps({
    "smtp_admin_email": "contato@borda.pro",
    "smtp_host": "smtp.resend.com",
    "smtp_port": 465,
    "smtp_user": "resend",
    "smtp_pass": os.environ["RESEND_API_KEY"],
    "smtp_sender_name": "Borda Pro",
    "smtp_max_frequency": 60,
    "mailer_subjects_confirmation": "Ative sua conta na Borda Pro \U0001f49c",
    "mailer_subjects_magic_link": "Seu link de acesso à Borda Pro",
    "mailer_subjects_recovery": "Redefina sua senha — Borda Pro",
    "mailer_subjects_email_change": "Confirme seu novo email — Borda Pro",
    "mailer_templates_confirmation_content": html("confirm-signup.html"),
    "mailer_templates_magic_link_content": html("magic-link.html"),
    "mailer_templates_recovery_content": html("reset-password.html"),
    "mailer_templates_email_change_content": html("change-email.html"),
}, ensure_ascii=False))
PY
)"

echo "=== APLICANDO PATCH ==="
curl -fsS -X PATCH "$API" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | show

echo ""
echo "=== OK. Agora valide: reset de senha numa conta real → remetente 'Borda Pro <contato@borda.pro>' e chega na Primary (não spam). ==="
