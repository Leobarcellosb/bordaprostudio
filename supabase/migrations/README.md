# Regras de migration — Borda Pro

## Tabela nova: SEMPRE conceder GRANT junto com ENABLE RLS

**Lição aprendida no incidente 2026-05-30** (folders + GRANT faltando, ver
`scripts/diagnose-folders-rls.mts`):

> PostgreSQL valida `GRANT` no nível da tabela ANTES de RLS rodar. Se você
> só faz `ENABLE RLS + CREATE POLICY` sem `GRANT`, anon/authenticated batem
> em `42501 permission denied for table X` e nunca chegam nas policies.
> Pior: o erro fica silencioso na UI (data=[], fallback de empty state)
> e parece "tabela vazia" em vez de "permissão negada".

### Template obrigatório pra toda tabela nova

```sql
CREATE TABLE IF NOT EXISTS public.minha_tabela (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

ALTER TABLE public.minha_tabela ENABLE ROW LEVEL SECURITY;

-- ─── POLICIES ───
CREATE POLICY "minha_tabela_select_all" ON public.minha_tabela
  FOR SELECT USING (true);  -- ou owner-only, conforme caso

CREATE POLICY "minha_tabela_admin_write" ON public.minha_tabela
  FOR INSERT WITH CHECK (public.borda_is_admin());
-- ...UPDATE e DELETE conforme caso

-- ─── GRANTS — OBRIGATÓRIO, NÃO ESQUEÇA ───
GRANT SELECT ON public.minha_tabela TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.minha_tabela TO authenticated;
GRANT ALL ON public.minha_tabela TO service_role;
```

### Casos especiais

- **Tabela owner-only** (cada user só vê suas linhas): GRANT SELECT pra
  `authenticated` (não `anon`); RLS filtra por `auth.uid()`.
- **Append-only por user** (downloads, audit log): GRANT SELECT/INSERT
  pra `authenticated`; sem UPDATE/DELETE.
- **Sequências** (`SERIAL`/`BIGSERIAL`): `GRANT USAGE ON SEQUENCE
  public.minha_tabela_id_seq TO authenticated;` (uuid não precisa).
- **RPCs** (`CREATE FUNCTION`): `GRANT EXECUTE ON FUNCTION
  public.minha_func(args) TO authenticated;`

### Verificação pós-migration

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'minha_tabela'
  AND grantee IN ('anon','authenticated','service_role')
ORDER BY grantee, privilege_type;
```

Se faltar GRANT, o app retorna `42501 permission denied` sem nenhuma
linha do banco, mesmo a RLS estando perfeita.

## Outros padrões do projeto

- Slugs imutáveis: tabelas referenciadas por slug (folders) — nunca
  permita UPDATE do slug em produção. Renomear edita só o `name`.
- `updated_at` automático: use `public.set_updated_at()` em TRIGGER
  `BEFORE UPDATE` (já existe, idempotente via `CREATE OR REPLACE`).
- `borda_is_admin()` é a única helper de auth pra escrita admin —
  não chame `auth.uid() IN (SELECT user_id FROM user_roles ...)` em
  policy nova; reuse a função.
