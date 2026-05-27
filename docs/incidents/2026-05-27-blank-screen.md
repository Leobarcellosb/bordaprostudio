# 📋 Relatório de Incidente — Blank Screen em Produção

**Data**: 27/05/2026
**Duração total**: ~2h de debug
**Severidade**: P0 — site fora do ar (cliente real impactado)
**Status final**: Resolvido, commit `699c512` em produção

---

## TL;DR

`borda.pro` ficou em branco. Causa raiz tripla: (1) env vars no Vercel **existiam mas com valores vazios**, (2) Vercel CLI v54 **cria env vars como `sensitive` por default** o que silenciosamente ignora valores via `--value`, (3) configuração de `manualChunks` no `vite.config.ts` causava **race condition** em produção (Radix executando antes de React.forwardRef estar disponível).

---

## Sintomas observados

- `borda.pro/login` retornava HTTP 200 com HTML correto
- JS chunks carregavam normalmente
- DOM ficava com `<div id="root"></div>` vazio
- Console do browser (não verificado durante o incidente — gap!) provavelmente mostrava 2 erros distintos em momentos diferentes:
  - `TypeError: Cannot read property 'forwardRef' of undefined` (race condition Radix/React)
  - `Error: supabaseUrl is required` (env vars vazias)

---

## Causa raiz — 3 problemas independentes que se sobrepuseram

### 1️⃣ Env vars no Vercel com valor vazio

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_APP_URL` existiam **mas o `value` era literal `""`**. Provável origem: alguém criou os nomes no painel há 17 dias e esqueceu de colar os valores. Sem auditoria visual periódica isso passou despercebido.

### 2️⃣ Vercel CLI v54 — comportamento traiçoeiro

`vercel env add NAME production --value "X"` em modo non-interactive (TTY detectado como agente) **cria a var como `sensitive` e silenciosamente descarta o valor**, criando uma var com value `""`. Não retorna erro, retorna exit code 0, mostra "Common next commands" e segue. Comportamento INTENCIONAL anti-leak mas pouco documentado.

`vercel env pull` retorna `""` pra sensitive vars **mesmo quando o valor real existe** — então não dá pra usar pull como evidência confiável.

### 3️⃣ `manualChunks` causando race condition

Config tinha `vendor-react` e `vendor-radix` como chunks separados. Como `modulepreload` não garante **ordem de execução** entre chunks paralelos baixados, em algumas conexões `vendor-radix.js` era avaliado antes de `vendor-react.js` registrar `forwardRef` no namespace global → componentes Radix no top-level (`forwardRef(...)`) crashavam → árvore React inteira quebrava → blank screen.

### 4️⃣ (Agravante) `vercel deploy --prod --force` engana

Esse comando NÃO buildou remotamente — ele **uploadou o `dist/` local pré-existente** e marcou como deploy production (vi `Builds: . [0ms]` nos logs). Como meu dist/ local foi gerado em horários diferentes ao longo da sessão (com diferentes estados de env), o que estava em produção não correspondia ao último build feito.

---

## Por que demorou 2h pra resolver

| Hora | Hipótese investigada | Conclusão |
|---|---|---|
| 0:00 | Site fora do ar | Confirmado blank screen |
| 0:05 | DNS quebrado? | Não — Vercel respondendo HTTP 200 |
| 0:15 | Deploy não conectado ao Vercel? | Não — `.vercel/` ausente local mas Vercel project existe |
| 0:25 | Env vars não setadas? | Confirmado — bundle sem `mepvdblcphcgebsxpykk` |
| 0:35 | User adiciona env vars no dashboard | Aparentemente sucesso, mas bundle continua sem valores |
| 0:55 | Vou setar via CLI então | `vercel env add` silenciosamente cria vars vazias |
| 1:10 | Achei a flag `--no-sensitive` | Valores finalmente preenchidos |
| 1:20 | Push de arquivo dummy pra forçar build | Vercel detecta no-op e reusa cache |
| 1:30 | `vercel deploy --prod --force` | Funciona, mas upoda dist/ local em vez de buildar |
| 1:40 | Bundle agora tem URLs ✅ | Mas site continua quebrado |
| 1:50 | manualChunks race condition (radix antes de react) | Achei a causa secundária |
| 2:00 | Remove manualChunks completamente | Resolvido |

**O que custou tempo**: cada hipótese exigia 30-60s de build + 15s de CDN propagation + verificação. E múltiplas hipóteses estavam parcialmente certas — o que confundia.

---

## Como evitar isso pra sempre

### Checklist de deploy seguro (TOP)

```
☐ Antes do primeiro deploy:
  ☐ Confirmar 3 env vars do Vercel TÊM VALORES (não só nomes)
    → Eye icon (👁️) no dashboard pra revelar o value
  ☐ Marcar Production + Preview + Development em todas
  ☐ Prefixo VITE_ obrigatório pra vars que vão pro client
  ☐ Após salvar, fazer 1 deploy de teste e bater curl pra confirmar
    que o project ID aparece no bundle JS

☐ Build local antes de commitar:
  ☐ `npm run build` passa sem error
  ☐ `grep -roE "mepvdblcphcgebsxpykk" dist/assets/*.js` retorna ≥1 match
  ☐ Se 0 matches, env vars locais não foram lidas — checar .env.local

☐ Após deploy de Vercel:
  ☐ Curl o JS principal, confirmar URLs Supabase presentes
  ☐ Smoke test: /login retorna HTTP 200 + página renderiza visualmente
```

### Regra de ouro pra env vars no Vercel

**Sempre via dashboard com revelação visual.** CLI v54 tem comportamento anti-leak que cria vars vazias silenciosamente em modo agentic. Se precisar usar CLI:

```bash
# RUIM (cria sensitive, valor descartado):
vercel env add NAME production --value "X"

# BOM (valor verificável via pull depois):
vercel env add NAME production --value "X" --no-sensitive --force --yes
```

Mas honestamente: **abre o dashboard, copia o valor, salva, clica o olho pra confirmar que aparece**. 30 segundos. Zero ambiguidade.

### Regra de ouro pra chunking no Vite

**Não use `manualChunks` a menos que tenha medição que justifique.** Auto-chunking do Rollup respeita a árvore de dependências e garante ordem de execução. Razões válidas pra mexer:
- Separar admin do user comum (path-based, OK)
- Lib gigante usada em UMA page (jspdf no CatalogGenerator) — split natural via lazy import

**Razões pra NUNCA mexer**:
- Splitting de `react` separado de bibliotecas que **dependem** de React (Radix, MUI, Chakra) → causa exatamente o race condition que vimos
- "Achei que ficaria mais granular" sem profiling

### Comandos de diagnóstico úteis

Salve essa rotina como referência:

```bash
# 1. Verificar env vars em prod (sem precisar de dashboard)
HASH=$(curl -sS https://www.borda.pro | grep -oE 'assets/index-[^"]+\.js' | head -1)
curl -sS "https://www.borda.pro/$HASH" | grep -oE "https://[a-z0-9-]+\.supabase\.co" | sort -u

# 2. Verificar quando foi o último build REAL (não no-op)
npx vercel@latest inspect <deploy-url> | grep -E "Builds|created"
# "[0ms]" = no-op (reuso de cache), "[16s]" = build real

# 3. Forçar build remoto de verdade (não --force que upoda local)
# Opção A: dashboard → Redeploy → Build Cache OFF
# Opção B: commit com mudança em arquivo .ts real (não dummy)

# 4. Confirmar env vars REAIS no Vercel (sensitive workaround)
npx vercel@latest env rm NAME production --yes
npx vercel@latest env add NAME production --value "X" --no-sensitive --force --yes
npx vercel@latest env pull .env.check --environment=production --yes
grep -E "^VITE_" .env.check
rm .env.check
```

### Monitoring que teria pego cedo

Sugestões pra implementar depois:

1. **Uptime check externo** (UptimeRobot, Pingdom, Better Uptime — todos têm tier free):
   - Check HTTP 200 + body contains "Borda Pro" a cada 5 min
   - Alerta por email/SMS se cair
   - Pra blank screen: precisa de check mais sofisticado (Playwright em cron) que valida DOM rendered

2. **Synthetic browser check semanal**:
   - GitHub Action que roda Playwright contra `borda.pro/login`
   - Verifica que `<h1>` "Entrar" ou similar aparece no DOM após load
   - Falha se DOM continua vazio após 5s → blank screen detectado

3. **Sentry ou similar** pra capturar runtime errors do client:
   - `TypeError: Cannot read property 'forwardRef' of undefined` teria aparecido lá imediatamente
   - Free tier cobre 5k events/mês — suficiente pra projeto desse porte

4. **Vercel Analytics** (já incluso no plano free) — captura web vitals e erros básicos no client.

---

## Lições subjacentes (cultura de processo)

1. **"O deploy é cache do que está no Vercel, não fonte da verdade"** — sempre confirmar fora do dashboard.
2. **CLI moderna esconde erros de UX** — exit code 0 não significa sucesso operacional.
3. **`--force` é palavra perigosa em ferramentas de deploy** — pode significar "ignore cache" OU "skip rebuild and just upload local". Ler doc específica antes.
4. **Race conditions só aparecem em produção** — local dev tem ordem determinística de carregamento, prod tem rede variável. Por isso `manualChunks` arriscado.
5. **Configuração default do framework é normalmente a certa** — quando você mexer, precisa ter razão forte E teste em prod.

---

## Arquivos tocados durante o incidente (pra referência)

- `vite.config.ts` — múltiplas tentativas de chunking, final: sem manualChunks
- `.env.local` — sempre teve valores corretos (red herring inicial)
- Vercel env vars — corrigidas via CLI com `--no-sensitive`
- `.vercel/` — criado via `vercel link` (gitignored)
- `.vercel-deploy-trigger` — criado e depois removido (cleanup)

## Commits relacionados

```
699c512  fix: remove manualChunks — Vite split automático
32e94f7  fix: radix no mesmo chunk que react (tentativa anterior)
f2549a7  chore: remove arquivo trigger
db1bf55  chore: redeploy com env vars preenchidas
52798fc  chore: trigger build com env vars finalmente preenchidas
6a43bad  chore: force redeploy
```

---

Quando algum dev novo for mexer no `vite.config.ts` ou em env vars do Vercel, **leia isto primeiro**.
