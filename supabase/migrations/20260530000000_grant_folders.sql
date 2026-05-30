-- Fix do bug "useFolders retorna vazio" pós-migration 20260529000000.
--
-- Causa: PostgreSQL valida GRANTs no nível da tabela ANTES de RLS rodar.
-- A migration anterior só fez ENABLE RLS + CREATE POLICY mas esqueceu
-- de conceder GRANT pros roles do PostgREST (anon/authenticated).
-- Resultado: anon/authenticated batiam em `42501 permission denied for
-- table folders` sem nunca chegar nas policies.
--
-- Diagnóstico em scripts/diagnose-folders-rls.mts.
--
-- RLS já cuida do controle granular (qualquer um lê; só admin escreve).
-- O GRANT só destrava a porta de entrada da tabela.

GRANT SELECT ON public.folders TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.folders TO authenticated;

-- service_role já tem BYPASS RLS + todos os privs por default (super-role
-- do Supabase) — não precisa GRANT explícito, mas inocente garantir:
GRANT ALL ON public.folders TO service_role;

-- Verificação — esperado:
--   anon          → SELECT
--   authenticated → SELECT, INSERT, UPDATE, DELETE
--   service_role  → todos
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'folders'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;
