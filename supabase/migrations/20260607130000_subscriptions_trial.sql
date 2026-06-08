-- Trial de 15 dias sem cartão (origem: ManyChat). provider='manychat', status='trial'.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_trial
  ON public.subscriptions (user_id, trial_until);

COMMENT ON COLUMN public.subscriptions.trial_until IS
  'Fim do trial de 15 dias (provider=manychat, status=trial). Acesso liberado enquanto trial_until > now().';

-- Gating de download premium passa a aceitar TRIAL ativo (senão o usuário em trial
-- veria a biblioteca mas não conseguiria baixar arquivo premium). Mantém a regra
-- de assinatura paga intacta.
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = user_uuid
      AND (
        (status = 'active' AND (access_expires_at IS NULL OR access_expires_at > now()))
        OR (trial_until IS NOT NULL AND trial_until > now())
      )
  );
$function$;
