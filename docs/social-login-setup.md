# Login social (Google / Facebook) — setup

O **código** (botões + fluxo OAuth) já está pronto e gated por flag em
`src/config/socialAuth.ts` (`SOCIAL_AUTH = { google, facebook }`). Os botões só
aparecem quando a flag está `true` **e** o provedor está configurado no Supabase.
Ligue cada provedor só DEPOIS de concluir o setup externo dele.

Callback que os provedores precisam autorizar (vale pros dois):
```
https://mepvdblcphcgebsxpykk.supabase.co/auth/v1/callback
```
O redirect de volta pro app é `https://www.borda.pro/login` (e apex) — já na
allowlist (ver templates/email/add-redirect-urls.sh).

## Google (rápido — ~15 min)
1. Google Cloud Console → APIs & Services → **Credentials** → Create OAuth client ID
   (Web application). Antes, configure a **OAuth consent screen** (External; nome
   "Borda Pro"; logo; link de privacidade https://www.borda.pro/privacidade).
2. **Authorized redirect URIs**: o callback do Supabase acima.
3. Copie **Client ID** e **Client Secret**.
4. Supabase → Authentication → Providers → **Google** → Enable → cole ID/Secret → Save.
5. No código: `SOCIAL_AUTH.google = true` → commit/push.

## Facebook (PESADO — pode levar dias) ⚠️
Facebook não libera o scope `email` em produção sem App Review + (às vezes)
verificação de negócio. Em "Development mode" só funciona pra contas de
teste/admins do app.
1. developers.facebook.com → Create App (tipo "Consumer") → adicione o produto
   **Facebook Login**.
2. Facebook Login → Settings → **Valid OAuth Redirect URIs**: o callback do Supabase.
3. App Settings → Basic: **Privacy Policy URL** = https://www.borda.pro/privacidade,
   categoria, ícone. (Data Deletion: pode usar instruções/URL.)
4. Copie **App ID** e **App Secret** → Supabase → Providers → **Facebook** → Enable.
5. **App Review**: solicitar permissões `public_profile` + `email`; mudar o app
   pra **Live**. Sem isso, só admins/testers conseguem logar.
6. Quando aprovado: `SOCIAL_AUTH.facebook = true` → commit/push.

> Recomendação: lançar o **Google primeiro** (flag dele) e deixar o Facebook
> atrás da review, sem travar o resto.

## Como o app trata o retorno
`signInWithOAuth({ provider, redirectTo: origin/login })` → provedor →
volta em `/login?code=...` → o supabase-js (detectSessionInUrl) troca o code por
sessão → AuthContext dispara SIGNED_IN → a página de login roteia (dashboard /
plans / onboarding). Usuário novo recebe profile pelo trigger handle_new_user
(name/email vêm do provedor). Sem assinatura → cai em /plans (esperado).

## Notas da revisão adversarial (Fase 2)
- **Account-linking por email:** no Supabase, confirme que "Link accounts with
  same email" está ON antes de ligar as flags — assim email/senha + Google no
  MESMO email colapsam num user_id só (Teste C do spec). Mesmo se estiver OFF, o
  `oauth-signup-trial` faz check de reuso POR EMAIL, então ninguém ganha 2 trials.
- **flowType = implicit (default, mantido de propósito):** o fluxo de recovery/
  magic-link em produção depende do hash (#type=recovery). Trocar pra PKCE
  mexeria nisso — fica como melhoria futura, testada isoladamente. O tratamento
  de erro de OAuth funciona no implicit (erro vem no hash, OAuthBootstrap lê).
- **Rate limit do trial OAuth:** não há limite por IP (diferente do /ativar, que
  é público). Aqui cada trial exige um login OAuth real (o próprio Google/FB é o
  gargalo) + o check por email impede reuso. Se virar problema, dá pra reusar
  trial_rate_limits com prefixo 'oauth:'.

## Account linking (mesma pessoa, email + Google)
Se alguém já tem conta por email/senha e depois entra com Google no MESMO email,
o Supabase vincula as identidades quando o email é verificado (comportamento
padrão; ajustável em Auth → Providers). Nada a fazer no código.

## Teste (depois de ligar a flag + provedor)
Janela anônima → /login → "Continuar com Google" → consente → volta logado →
roteado (dashboard/plans). Repetir com conta nova (vira signup automático).
