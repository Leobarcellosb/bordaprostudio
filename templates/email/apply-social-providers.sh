#!/usr/bin/env bash
# Liga Google + Facebook no Supabase Auth via Management API (após o Leo criar
# os apps no Google Cloud e no Facebook Developers). Mesma estrutura do
# apply-auth-email.sh: GET (antes) → PATCH → GET (depois). Nada hardcoded.
#
#   export SUPABASE_PAT=sbp_...
#   export GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
#   export GOOGLE_CLIENT_SECRET=GOCSPX-xxx
#   export FACEBOOK_CLIENT_ID=xxxxxxxxxxxxxxx
#   export FACEBOOK_CLIENT_SECRET=xxxxxxxx
#   bash templates/email/apply-social-providers.sh
#
# Depois: virar as flags em src/config/socialAuth.ts (google/facebook = true).
set -euo pipefail
: "${SUPABASE_PAT:?export SUPABASE_PAT=sbp_...}"
: "${GOOGLE_CLIENT_ID:?export GOOGLE_CLIENT_ID=...}"
: "${GOOGLE_CLIENT_SECRET:?export GOOGLE_CLIENT_SECRET=...}"
: "${FACEBOOK_CLIENT_ID:?export FACEBOOK_CLIENT_ID=...}"
: "${FACEBOOK_CLIENT_SECRET:?export FACEBOOK_CLIENT_SECRET=...}"

REF="mepvdblcphcgebsxpykk"
API="https://api.supabase.com/v1/projects/${REF}/config/auth"
# inclui os *_secret na verificação: se o nome do campo estiver errado, o
# after-GET mostra null e você sabe que o secret não foi setado (provider
# 'enabled' true mas login falharia em runtime).
KEYS="['external_google_enabled','external_google_client_id','external_google_secret','external_facebook_enabled','external_facebook_client_id','external_facebook_secret']"
show() { python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps({k:d.get(k) for k in ${KEYS}},indent=2))"; }

echo "=== ANTES ==="
curl -fsS "$API" -H "Authorization: Bearer ${SUPABASE_PAT}" | show

# Payload montado em Python (escapa as credenciais com segurança). Campos são
# string/boolean (sem o bug de tipo do smtp_port).
PAYLOAD="$(GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  FACEBOOK_CLIENT_ID="$FACEBOOK_CLIENT_ID" FACEBOOK_CLIENT_SECRET="$FACEBOOK_CLIENT_SECRET" python3 <<'PY'
import json, os
print(json.dumps({
    "external_google_enabled": True,
    "external_google_client_id": os.environ["GOOGLE_CLIENT_ID"],
    "external_google_secret": os.environ["GOOGLE_CLIENT_SECRET"],
    "external_facebook_enabled": True,
    "external_facebook_client_id": os.environ["FACEBOOK_CLIENT_ID"],
    "external_facebook_secret": os.environ["FACEBOOK_CLIENT_SECRET"],
}))
PY
)"

echo "=== APLICANDO PATCH ==="
curl -fsS -X PATCH "$API" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" -H "Content-Type: application/json" \
  -d "$PAYLOAD" | show

echo "=== DEPOIS (confirma external_*_enabled: true) ==="
curl -fsS "$API" -H "Authorization: Bearer ${SUPABASE_PAT}" | show
echo "=== OK. Agora vire as flags em src/config/socialAuth.ts e teste em /login. ==="
