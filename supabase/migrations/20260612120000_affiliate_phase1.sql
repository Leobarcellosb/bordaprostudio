-- ═══ AFILIADOS FASE 1: tracking + perfil ═══
-- (Comissões/payouts são FASE 2 — tabelas affiliate_commissions/affiliate_payouts
--  ficam pra próxima migration, junto com a lógica de 60d/cap.)

-- 1) referrals: evolui a tabela existente (20260607150000) SEM quebrar o que já
--    grava (referrer_id text + referred_email + status + activated_at).
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referrer_user_id uuid;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_user_id uuid;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS trial_activated_at timestamptz;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS first_paid_at timestamptz;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS qualified_at timestamptz;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS churned_at timestamptz;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user ON public.referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);

-- A bordadeira vê as PRÓPRIAS indicações via RPC MASCARADA (não por own-read na
-- tabela: policy row-level exporia o email COMPLETO + flag antifraude das
-- indicadas via PostgREST — PII/LGPD; a UI mascara, a API não mascararia).
DROP POLICY IF EXISTS "Referrer reads own referrals" ON public.referrals;

-- referred_initial = SÓ a inicial (ASCII). A decoração de máscara ("•••") fica
-- no frontend: caractere não-ASCII em literal SQL é frágil — o paste no SQL
-- editor re-encodou o '•' (UTF-8 E2 80 A2) como Mac Roman e gravou mojibake no
-- corpo da função. Nada não-ASCII sai do banco.
CREATE OR REPLACE FUNCTION public.my_referrals()
RETURNS TABLE(id uuid, referred_initial text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.id,
         upper(left(coalesce(r.referred_email, '?'), 1)) AS referred_initial,
         r.status,
         r.created_at
  FROM public.referrals r
  WHERE r.referrer_user_id = auth.uid()
    AND r.status <> 'fraud_blocked'
  ORDER BY r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.my_referrals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_referrals() TO authenticated;

-- Normaliza emails legados pra lowercase (a atribuição usa match exato .eq —
-- register-trial já grava lowercase; isto alinha as linhas antigas).
UPDATE public.referrals SET referred_email = lower(referred_email)
WHERE referred_email IS NOT NULL AND referred_email <> lower(referred_email);

-- Admin lê tudo (borda_is_admin existe em prod — verificada).
DROP POLICY IF EXISTS "Admins read referrals" ON public.referrals;
CREATE POLICY "Admins read referrals" ON public.referrals
  FOR SELECT TO authenticated USING (public.borda_is_admin());

-- 2) affiliate_profile: 1 linha por bordadeira (código, Pix, endereço p/ RPA, termos).
CREATE TABLE IF NOT EXISTS public.affiliate_profile (
  user_id uuid PRIMARY KEY,
  referral_code text UNIQUE NOT NULL,   -- vai no ?ref= e no utm_campaign (ex: br_a3f9c2)

  pix_key text,
  pix_type text,                        -- 'cpf' | 'email' | 'phone' | 'random'
  pix_holder_name text,
  pix_holder_cpf text,

  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,

  terms_accepted_at timestamptz,
  terms_version text,                   -- ex: 'v0-draft' (placeholder até o contador validar)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_profile ENABLE ROW LEVEL SECURITY;

-- Escrita SÓ via edge function (service role). Dona lê o próprio perfil; admin lê tudo.
DROP POLICY IF EXISTS "Service manages affiliate_profile" ON public.affiliate_profile;
CREATE POLICY "Service manages affiliate_profile" ON public.affiliate_profile
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Owner reads own affiliate_profile" ON public.affiliate_profile;
CREATE POLICY "Owner reads own affiliate_profile" ON public.affiliate_profile
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read affiliate_profile" ON public.affiliate_profile;
CREATE POLICY "Admins read affiliate_profile" ON public.affiliate_profile
  FOR SELECT TO authenticated USING (public.borda_is_admin());

-- GRANT de tabela: RLS decide QUAIS linhas; sem o grant o role nem toca a tabela
-- (PostgREST → 403). Tabela criada por SQL cru não herda o grant que a Table
-- Editor UI aplicaria. Só SELECT — escrita continua via service role.
GRANT SELECT ON public.affiliate_profile TO authenticated;
