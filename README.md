# Borda Pro

Biblioteca de matrizes de bordado eletrônico · plataforma profissional para
bordadeiras venderem, organizarem e visualizarem designs.

## Stack

- Vite + React 18 + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Gemini 2.5 Flash (geração de previews e classificação de designs)

## Desenvolvimento local

Requer Node.js 20+ e npm (ou pnpm). Recomendo `nvm` para gerenciar versões.

```sh
git clone <git@github.com:...>
cd borda-final
npm install
npm run dev
```

Variáveis de ambiente (copie `.env.example` para `.env.local`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Para as Edge Functions:

```
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

## Deploy

Frontend via Vercel · Edge Functions via `supabase functions deploy`.

```sh
supabase functions deploy generate-design-preview
supabase functions deploy bulk-classify-designs
supabase functions deploy build-kit-draft
```

## Scripts utilitários

```sh
npm run generate:og     # regera public/og-image.png a partir do SVG inline
```

## Estrutura

```
src/
  components/   → componentes de UI (shadcn + custom)
  pages/        → rotas (Router DOM)
  hooks/        → React hooks compartilhados
  lib/          → utils e clients Supabase
supabase/
  functions/    → Edge Functions Deno
  migrations/   → schema SQL
public/         → assets estáticos (favicon, og-image, robots.txt)
scripts/        → scripts de build/geração
```
