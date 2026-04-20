# Runbook de deploy — bordaprostudio

Este documento cobre **tudo que precisa ser feito por humano** para que as mudanças de segurança + fixes de loading saiam do zip local e cheguem a produção.

Leia de cima pra baixo. Não pule etapas. Use um ambiente de **staging** antes de qualquer coisa em prod.

---

## 0. Pré-checks (antes de começar)

- [ ] Você tem acesso ao repositório GitHub `Leobarcellosb/bordaprostudio`
- [ ] Você tem acesso ao projeto Supabase (dashboard) de **staging** e **produção**
- [ ] Você tem acesso ao painel da Eduzz (pra configurar webhook secret)
- [ ] Você tem acesso ao painel do host de produção (Vercel/Netlify/Lovable) pra setar env vars

---

## 1. Colocar o código em produção

O projeto foi baixado como zip e editado em `~/bordaprostudio`. Nada disso está no GitHub ainda.

### 1.1 Clonar o repo real

```bash
# Use um diretório novo pra não conflitar
git clone https://github.com/Leobarcellosb/bordaprostudio.git ~/bordaprostudio-git
cd ~/bordaprostudio-git
git checkout -b security-and-loading-fixes
```

### 1.2 Copiar as mudanças editadas

```bash
# Copia todos os arquivos modificados do zip para o clone real,
# preservando a estrutura.
rsync -av --exclude node_modules --exclude dist --exclude .git \
  ~/bordaprostudio/ ~/bordaprostudio-git/
```

### 1.3 Verificar o diff

```bash
cd ~/bordaprostudio-git
git status
git diff --stat
```

Você deve ver alterações em:
- `src/components/ProtectedRoute.tsx`
- `src/contexts/AuthContext.tsx` (se mexi nele)
- `src/lib/db.ts`, `src/lib/env.ts` (novo), `src/lib/pricing.ts`, `src/lib/safeQuery.ts` (novo), `src/lib/urlValidation.ts` (novo)
- `src/hooks/useLibraryDesigns.ts`, `src/hooks/useInspiracaoDoDia.ts`
- `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/MinhaContaPage.tsx`, `src/pages/Settings.tsx`
- `src/pages/PlansPage.tsx`, `src/pages/PricingPage.tsx`, `src/pages/LandingPage.tsx` (preços)
- `src/pages/TrendInsights.tsx`, `src/pages/KitCollectionDetail.tsx`, `src/pages/CatalogDetailPage.tsx`, `src/pages/CatalogGeneratorPage.tsx`, `src/pages/PremiumKitsPage.tsx`, `src/pages/PremiumKitDetail.tsx`, `src/pages/KitsPage.tsx`, `src/pages/CommunityPage.tsx`, `src/pages/ProductIdeasPage.tsx`
- `src/pages/admin/AdminIntegrations.tsx`, `src/pages/admin/AdminUsers.tsx`, `src/pages/admin/AdminDownloads.tsx`, `src/pages/admin/AdminAnalytics.tsx`, `src/pages/admin/AdminSmartUpload.tsx`, `src/pages/admin/AdminBulkImport.tsx`, `src/pages/admin/AdminPremiumKits.tsx`
- `src/components/admin/SmartKitBuilder.tsx`
- `src/components/home/CategoriesSection.tsx`
- `supabase/functions/_shared/cors.ts` (novo)
- `supabase/functions/_shared/auth.ts` (novo)
- `supabase/functions/admin-manage-user/index.ts`
- `supabase/functions/eduzz-webhook/index.ts`
- `supabase/functions/dispatch-webhook/index.ts`
- `supabase/functions/classify-design-category/index.ts`
- `supabase/functions/bulk-classify-designs/index.ts`
- `supabase/functions/build-kit-draft/index.ts`
- `supabase/functions/generate-design-preview/index.ts`
- `supabase/functions/generate-design-title/index.ts`
- `supabase/functions/generate-product-ideas/index.ts`
- `supabase/migrations/20260420000000_security_hardening.sql` (novo)

### 1.4 Validar localmente antes de push

```bash
cd ~/bordaprostudio-git
npm ci
npx tsc --noEmit     # Deve passar sem erros
npm run build        # Deve gerar dist/ sem falha
```

### 1.5 Commit + Push

```bash
git add .
git commit -m "security: harden auth, CORS, RLS; fix infinite loading across pages"
git push -u origin security-and-loading-fixes
```

Abra PR no GitHub e faça merge pra `main`.

---

## 2. Configurar variáveis de ambiente no host (Vercel/Netlify/Lovable)

Vá no painel do host de produção → Settings → Environment Variables → adicione:

| Variável | Valor de produção | Necessidade |
|---|---|---|
| `VITE_SUPABASE_URL` | (já deve existir) | obrigatório |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (já deve existir) | obrigatório |
| `VITE_APP_URL` | `https://app.bordaprostudio.com.br` | **novo** — usado pelo `src/lib/env.ts` |

Em staging use `VITE_APP_URL` do domínio de staging.

Depois de salvar, **redeploye** o frontend. Sem redeploy, a variável não vale.

---

## 3. Aplicar a migração de segurança no Supabase

A migração `20260420000000_security_hardening.sql` **é sensível** — altera RLS de várias tabelas. **Teste em staging primeiro.**

### 3.1 Staging

Via dashboard Supabase:
1. Dashboard do projeto de **staging** → SQL Editor → New Query
2. Cole o conteúdo de `supabase/migrations/20260420000000_security_hardening.sql`
3. Execute
4. Verifique no painel "Authentication → Policies" que as tabelas `designs`, `community_posts`, `matrix_requests`, storage buckets têm as novas policies

Teste funcional em staging (logar com conta normal):
- [ ] Dashboard carrega
- [ ] Library mostra designs publicados
- [ ] Favorites funciona (adicionar/remover)
- [ ] Upload de avatar funciona
- [ ] Login de admin bypassa tudo
- [ ] Criar um user via AdminUsers funciona
- [ ] Edit user via AdminUsers funciona (agora passa por `update_profile` action)
- [ ] Community page carrega (e apenas vê próprios posts)

Se algo quebrar em staging: **pare e revise** antes de aplicar em prod.

### 3.2 Rollback de staging se necessário

Cada `CREATE POLICY` da migração substitui a antiga. Para reverter, re-aplique a migration imediatamente anterior que criou a policy original (está em `supabase/migrations/` na mesma pasta).

### 3.3 Produção

Só após staging passar em todos os testes acima:
1. Dashboard do projeto de **produção** → SQL Editor → New Query
2. Cole o mesmo SQL e execute

---

## 4. Configurar HMAC no webhook Eduzz

### 4.1 Gerar secret

```bash
# Gere um secret seguro (use isso tanto no Supabase quanto na Eduzz)
openssl rand -hex 32
```

Exemplo: `a1b2c3d4...` (64 hex chars). **Guarde em gerenciador de senhas.**

### 4.2 Setar no Supabase

Dashboard Supabase (staging e prod) → Settings → Edge Functions → Secrets:
- Adicione: `EDUZZ_WEBHOOK_SECRET=<o valor gerado>`

### 4.3 Configurar no painel Eduzz

Painel Eduzz → Integrações → Webhooks:
- URL do webhook (já deve estar lá): `https://<seu-projeto>.supabase.co/functions/v1/eduzz-webhook`
- Campo "Secret" / "Signing key" / "Token": cole o mesmo valor
- Confirme que o header que Eduzz envia é **`X-Eduzz-Signature`** (ou similar). Se for diferente, me avise — o código aceita `X-Eduzz-Signature`, `x-eduzz-signature` ou `X-Signature`, com ou sem prefixo `sha256=`.
- Confirme que Eduzz envia **HMAC-SHA256 em hex** do raw body. Se for base64, precisamos ajustar o código.

### 4.4 Teste

1. No painel Eduzz, dispare um "evento de teste" ou faça uma compra fake
2. No Supabase → Edge Functions → logs → `eduzz-webhook`: você deve ver o request
3. Se aparecer `Assinatura HMAC inválida` no log: algo tá diferente entre os secrets ou no formato do header. Me chame pra ajustar.

**Enquanto o secret não estiver configurado, o webhook ainda aceita requests não-assinados (backward-compat).** Isso é ruim, mas não quebra nada. Priorize configurar.

---

## 5. Redeploy das 11 Edge Functions

Todas as funções tiveram mudanças (CORS helper, auth helper, ou lógica). Sem redeploy, as mudanças não valem.

Via Supabase CLI (se tiver instalado):
```bash
cd ~/bordaprostudio-git
supabase login
supabase link --project-ref <seu-project-ref>
supabase functions deploy admin-manage-user
supabase functions deploy eduzz-webhook
supabase functions deploy dispatch-webhook
supabase functions deploy classify-design-category
supabase functions deploy bulk-classify-designs
supabase functions deploy build-kit-draft
supabase functions deploy generate-design-preview
supabase functions deploy generate-design-title
supabase functions deploy generate-product-ideas
```

Ou via dashboard (cada função, botão "Deploy").

Como o projeto tem integração Lovable, pode ser que ele auto-deploye após push no GitHub. Confirme nos logs do dashboard.

---

## 6. Smoke test pós-deploy em produção

### 6.1 Fluxo anônimo
- [ ] Acessar `https://app.bordaprostudio.com.br/` → landing carrega
- [ ] Ver preços corretos: `R$ 49,90/mês` e `R$ 397/ano` (economia `R$ 201,80`)
- [ ] `/pricing` idem
- [ ] `/plans` idem

### 6.2 Fluxo de usuário novo
- [ ] Signup com senha fraca (ex.: `abc12345`) → aceita (tem 8 chars, letras e números)
- [ ] Signup com senha curta (ex.: `abc123`) → rejeita com mensagem
- [ ] Signup com email válido → email de verificação chega com link para `https://app.bordaprostudio.com.br/...`

### 6.3 Fluxo de login
- [ ] Login correto com assinatura ativa → `/dashboard` em <5s
- [ ] Login com senha errada → toast de erro, botão libera
- [ ] Login sem sub → `/plans`
- [ ] Login em rede lenta (throttle no DevTools) → deve resolver ou mostrar UI de erro com "Sair e tentar de novo"

### 6.4 Páginas protegidas
- [ ] `/trends` carrega sem spinner eterno (mostra skeleton → conteúdo ou erro)
- [ ] `/library` → filtros funcionam, paginação OK
- [ ] `/library/:id` → kit carrega ou mostra "Kit não encontrado"
- [ ] `/catalogs/:id` → catalog carrega ou "Catálogo não encontrado"
- [ ] `/catalogs/:id/generate` → editor abre, preview renderiza
- [ ] `/comunidade` → posts/pedidos carregam (ou empty state)
- [ ] `/settings` → upload de avatar: tente subir um `.svg` → rejeitado

### 6.5 Admin
- [ ] Login admin → `/admin` carrega painel
- [ ] AdminUsers → editar usuário salva via edge function (verifique logs de `admin-manage-user`)
- [ ] AdminIntegrations → salvar webhook com URL inválida (ex.: `http://localhost`) → rejeita
- [ ] AdminSmartUpload → importar um kit pequeno de teste → completa sem hang

### 6.6 Eduzz
- [ ] Compra fake na Eduzz (se tiver ambiente de teste) → webhook recebe, subscription ativa, user cria
- [ ] Tentar POST manual no webhook sem signature → **401 Unauthorized** (se secret configurado)

---

## 7. Monitoramento pós-deploy (primeiras 24h)

- [ ] **Logs do Supabase Edge Functions** (Dashboard → Edge Functions → logs) — procurar `[Auth]`, `[LOGIN]`, `[ROUTE]`, `Unauthorized`, `Invalid signature`
- [ ] **Analytics frontend** — taxa de login bem-sucedido deve subir (menos retries)
- [ ] **Eduzz webhook log** no Supabase — todos os eventos processados com sucesso
- [ ] **Console do browser** nos domínios de produção — verificar que não aparece erro `CORS: No 'Access-Control-Allow-Origin'` em nenhum request legítimo

Se aparecer CORS bloqueado em uma origem legítima, adicione o domínio em `supabase/functions/_shared/cors.ts` → `ALLOWED_ORIGINS` e redeploye as functions.

---

## 8. Plano de rollback (emergência)

Se algo der muito errado após deploy:

### Frontend
```bash
# Via Vercel CLI ou dashboard — promover deploy anterior
vercel rollback  # ou via dashboard "Promote previous"
```

### Edge Functions
No dashboard Supabase → Edge Functions → cada função tem histórico. Clique "redeploy previous version".

### Migration SQL
A migração só ADICIONA/substitui policies. Para reverter, re-aplique a migration anterior que criou a policy original. Arquivos estão em `supabase/migrations/` — os datados de `20260309`, `20260310`, `20260314`, `20260315`, `20260317`.

---

## 9. Pendências para depois (não bloqueador)

| Item | Esforço | Impacto |
|---|---|---|
| Rate limiting em edge functions (Upstash) | Médio | Previne abuso |
| Migrar fetches para `@tanstack/react-query` | Alto | Elimina boilerplate de loading/race |
| CSP headers no host | Baixo | Reduz XSS |
| Auditoria de ações admin (tabela `admin_audit_log`) | Médio | Forensics |
| Captcha no signup (Cloudflare Turnstile) | Baixo | Previne bots |
| 2FA via Supabase MFA | Médio | Proteção de conta |
| Code-splitting dos chunks > 500KB | Baixo | Performance inicial |
