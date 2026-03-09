
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  provider text NOT NULL DEFAULT 'eduzz',
  provider_buyer_id text,
  provider_invoice_id text,
  provider_offer_id text,
  plan_code text NOT NULL DEFAULT 'mensal',
  status text NOT NULL DEFAULT 'pending',
  access_expires_at timestamp with time zone,
  last_event text,
  raw_payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');
