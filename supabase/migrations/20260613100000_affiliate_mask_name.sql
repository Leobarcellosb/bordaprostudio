-- ═══ AFILIADOS: máscara da my_referrals → "Primeiro + Inicial." (padrão Inner) ═══
-- Mantém a MESMA assinatura (referred_initial text) → CREATE OR REPLACE puro,
-- sem DROP. O valor agora é o nome mascarado pronto ("Lúcia M."), não só a letra.
-- Nome vem de public.profiles.name (trigger handle_new_user popula sempre:
-- COALESCE(metadata.name, local-part do email)); resolvido por referred_user_id
-- ou email. Email NUNCA é retornado. TODOS os literais SQL são ASCII (espaço,
-- ponto, reticências) — acento só vem do DADO (profiles.name), nunca de literal.
CREATE OR REPLACE FUNCTION public.my_referrals()
RETURNS TABLE(id uuid, referred_initial text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT
      r.id,
      r.status,
      r.created_at,
      r.referred_email,
      nullif(trim(p.name), '') AS full_name
    FROM public.referrals r
    LEFT JOIN LATERAL (
      SELECT pr.name
      FROM public.profiles pr
      WHERE pr.id = r.referred_user_id
         OR lower(pr.email) = lower(r.referred_email)
      ORDER BY (pr.id = r.referred_user_id) DESC NULLS LAST
      LIMIT 1
    ) p ON true
    WHERE r.referrer_user_id = auth.uid()
      AND r.status <> 'fraud_blocked'
  )
  SELECT
    b.id,
    CASE
      -- sem nome resolvido (indicada ainda sem conta): inicial do email + reticencias
      WHEN b.full_name IS NULL
        THEN left(lower(coalesce(b.referred_email, '?')), 1) || '...'
      -- 1 palavra: primeiro nome inteiro
      WHEN array_length(parts.arr, 1) = 1
        THEN parts.arr[1]
      -- 2+ palavras: Primeiro + inicial do sobrenome + ponto
      ELSE parts.arr[1] || ' ' || upper(left(parts.arr[2], 1)) || '.'
    END AS referred_initial,
    b.status,
    b.created_at
  FROM base b
  CROSS JOIN LATERAL (SELECT regexp_split_to_array(b.full_name, '\s+') AS arr) parts
  ORDER BY b.created_at DESC;
$$;
