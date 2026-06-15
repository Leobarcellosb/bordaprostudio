-- ═══ FLUXO DE CANCELAMENTO / REEMBOLSO (Fase 1) ═══
-- Auto-serviço de cancelamento com retenção honesta + CDC art. 49 (7 dias).
-- Webhook eduzz e job diário ficam pra Fase 2 (commit separado).

-- 1) subscriptions: campos do cancelamento.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_eligible boolean,
  ADD COLUMN IF NOT EXISTS refund_amount_brl numeric(10,2),
  -- Janela CDC dos 7 dias. Coluna criada aqui; população canônica na 1ª fatura
  -- paga é Fase 2 (eduzz-webhook, fora do escopo deste commit). Até lá, a função
  -- usa created_at do row pago (eduzz cria o row na 1ª invoice_paid) como proxy.
  ADD COLUMN IF NOT EXISTS first_paid_at timestamptz;

COMMENT ON COLUMN public.subscriptions.cancel_at_period_end
  IS 'TRUE = cancela ao fim do periodo pago (sem reembolso). FALSE = imediato (reembolso/trial)';
COMMENT ON COLUMN public.subscriptions.refund_eligible
  IS 'Era <=7 dias do first_paid_at quando o pedido foi feito';

-- ⚠️ Acesso: status pending_cancellation MANTÉM acesso até access_expires_at
-- (tratado no frontend em src/lib/subscription.ts — PAID_STATUSES). pending_refund
-- corta na hora (access_expires_at vira now()).

-- 2) cancellation_requests: 1 pedido por evento de cancelamento.
CREATE TABLE IF NOT EXISTS public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,                            -- denormalizado p/ a tela admin (sem join)
  subscription_id uuid,

  status text NOT NULL CHECK (status IN (
    'pending_refund', 'pending_cancellation', 'refunded', 'canceled', 'rejected_returned'
  )),

  reason_key text NOT NULL,
  reason_label text NOT NULL,
  reason_other_text text,

  retention_offer_shown text,        -- 'support_call' | 'whatsapp' | 'usage_value' | null
  retention_offer_accepted boolean DEFAULT false,

  refund_eligible boolean NOT NULL,
  refund_amount_brl numeric(10,2),

  first_paid_at_snapshot timestamptz,
  days_since_first_payment integer,

  eduzz_refund_processed_at timestamptz,
  eduzz_refund_invoice_id text,

  final_feedback_text text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Escrita via service role (edge function). Dona lê o próprio; admin lê/gerencia tudo.
DROP POLICY IF EXISTS "Service manages cancellation_requests" ON public.cancellation_requests;
CREATE POLICY "Service manages cancellation_requests" ON public.cancellation_requests
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Owner reads own cancellation_requests" ON public.cancellation_requests;
CREATE POLICY "Owner reads own cancellation_requests" ON public.cancellation_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage cancellation_requests" ON public.cancellation_requests;
CREATE POLICY "Admins manage cancellation_requests" ON public.cancellation_requests
  FOR ALL TO authenticated USING (public.borda_is_admin());

-- GRANT de tabela: sem isso o PostgREST devolve 403 mesmo com RLS (lição da Fase 1
-- do quiz/afiliado). authenticated lê (dona/admin); admin atualiza (marcar processado).
GRANT SELECT, UPDATE ON public.cancellation_requests TO authenticated;

CREATE INDEX IF NOT EXISTS idx_cancellation_user_status
  ON public.cancellation_requests (user_id, status);
CREATE INDEX IF NOT EXISTS idx_cancellation_status_created
  ON public.cancellation_requests (status, created_at DESC);

-- Anti-corrida (TOCTOU): no máximo 1 pedido ABERTO por usuário. O check no app
-- não basta contra duplo-clique/concorrência; o 23505 vira "already_requested".
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_cancellation
  ON public.cancellation_requests (user_id)
  WHERE status IN ('pending_refund', 'pending_cancellation');

-- 3) DOWNLOADS: o gate de storage (has_active_subscription) só aceitava
-- status='active' → quem agenda cancelamento (pending_cancellation) veria o
-- catálogo mas tomaria 403 no download, quebrando a promessa "acesso até o fim
-- do período". Inclui pending_cancellation, mas SÓ com cutoff concreto futuro
-- (NULL=vitalício continua exclusivo de 'active' — sem vazamento permanente).
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
        OR (status = 'pending_cancellation' AND access_expires_at IS NOT NULL AND access_expires_at > now())
        OR (trial_until IS NOT NULL AND trial_until > now())
      )
  );
$function$;
