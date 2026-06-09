-- Convites / indicações. Captura quem indicou (?ref=XXX no /ativar) e o email indicado.
-- A lógica de RECOMPENSA/extensão de trial fica pra um próximo passo (com a UI).
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL,                 -- id/código de quem convidou (valor de ?ref)
  referred_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',    -- pending | activated
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email ON public.referrals (referred_email);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Edge functions (service_role) gerenciam; admins leem (auditoria).
CREATE POLICY "Service manages referrals"
  ON public.referrals FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can read referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
