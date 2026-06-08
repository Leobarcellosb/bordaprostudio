-- Rate limit do register-trial (endpoint público do /ativar): 3 ativações por IP/hora.
CREATE TABLE IF NOT EXISTS public.trial_rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_rate_limits_ip_time
  ON public.trial_rate_limits (ip, created_at);

-- Apenas as edge functions (service_role) acessam. RLS habilitada sem policies:
-- ninguém via anon/authenticated lê/escreve; service_role bypassa RLS.
ALTER TABLE public.trial_rate_limits ENABLE ROW LEVEL SECURITY;
