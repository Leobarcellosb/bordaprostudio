#!/usr/bin/env bash
# Conserta o reset de senha: adiciona /reset-password à allowlist de Redirect
# URLs do Supabase Auth. Sem isso, o link de recovery cai no Site URL (landing)
# em vez de /reset-password, e o form de nova senha nunca aparece.
#
# MERGE SEGURO: lê a lista atual e só ADICIONA o que falta (não remove nada).
#
#   export SUPABASE_PAT=sbp_...   # https://supabase.com/dashboard/account/tokens
#   bash templates/email/add-redirect-urls.sh
set -euo pipefail
: "${SUPABASE_PAT:?export SUPABASE_PAT=sbp_...}"
REF="mepvdblcphcgebsxpykk"
API="https://api.supabase.com/v1/projects/${REF}/config/auth"
WANT="https://borda.pro/**,https://www.borda.pro/**"

CUR="$(curl -fsS "$API" -H "Authorization: Bearer ${SUPABASE_PAT}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('uri_allow_list') or '')")"
echo "=== uri_allow_list ATUAL ==="; echo "${CUR:-(vazio)}"

MERGED="$(python3 - "$CUR" "$WANT" <<'PY'
import sys
cur = [x.strip() for x in sys.argv[1].split(",") if x.strip()]
for w in sys.argv[2].split(","):
    if w not in cur:
        cur.append(w)
print(",".join(cur))
PY
)"
echo "=== uri_allow_list NOVO (merge, nada removido) ==="; echo "$MERGED"

curl -fsS -X PATCH "$API" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,sys;print(json.dumps({'uri_allow_list':sys.argv[1]}))" "$MERGED")" \
  | python3 -c "import sys,json;print('aplicado:', json.load(sys.stdin).get('uri_allow_list'))"

echo "=== OK — clica de novo no link de reset: deve cair em /reset-password com o form. ==="
