-- ═══ AFILIADOS: my_referrals → referred_display_name ("Primeiro + Inicial.") ═══
-- Renomeia a coluna de retorno (referred_initial → referred_display_name) — isso
-- muda a assinatura, então DROP + CREATE (idempotente via IF EXISTS), não REPLACE.
-- Como o DROP zera os grants, o REVOKE/GRANT é reaplicado no fim.
-- Nome de public.profiles.name (trigger handle_new_user popula sempre); resolvido
-- por referred_user_id OU email. Email NUNCA retornado (LGPD). Literais 100% ASCII
-- ("Bordadeira ", espaço, ponto, reticências) — acento só vem do DADO.
DROP FUNCTION IF EXISTS public.my_referrals();

CREATE FUNCTION public.my_referrals()
RETURNS TABLE(id uuid, referred_display_name text, status text, created_at timestamptz)
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
      -- sem nome resolvido (indicada ainda sem conta): "Bordadeira " + inicial do email
      WHEN b.full_name IS NULL
        THEN 'Bordadeira ' || upper(left(coalesce(b.referred_email, '?'), 1))
      -- 1 palavra: primeiro nome inteiro
      WHEN array_length(parts.arr, 1) = 1
        THEN parts.arr[1]
      -- 2+ palavras: Primeiro + inicial da 2a palavra + ponto
      ELSE parts.arr[1] || ' ' || upper(left(parts.arr[2], 1)) || '.'
    END AS referred_display_name,
    b.status,
    b.created_at
  FROM base b
  CROSS JOIN LATERAL (SELECT regexp_split_to_array(b.full_name, '\s+') AS arr) parts
  ORDER BY b.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_referrals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_referrals() TO authenticated;
