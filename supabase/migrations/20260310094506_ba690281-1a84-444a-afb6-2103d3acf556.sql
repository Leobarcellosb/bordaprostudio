
CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration text NOT NULL DEFAULT 'eduzz',
  event_type text NOT NULL,
  email text,
  user_id uuid,
  status text NOT NULL DEFAULT 'success',
  payload jsonb,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read integration_logs"
  ON public.integration_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert integration_logs"
  ON public.integration_logs
  FOR ALL
  TO public
  USING (auth.role() = 'service_role');
