
CREATE TABLE public.webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  events text[] NOT NULL DEFAULT ARRAY['user_created', 'subscription_started', 'design_downloaded', 'design_favorited'],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook_configs"
  ON public.webhook_configs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can read webhook_configs"
  ON public.webhook_configs
  FOR SELECT
  TO public
  USING (auth.role() = 'service_role');
