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

-- A bordadeira vê as PRÓPRIAS indicações (onepager lê direto via RLS).
DROP POLICY IF EXISTS "Referrer reads own referrals" ON public.referrals;
CREATE POLICY "Referrer reads own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (referrer_user_id = auth.uid());

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
