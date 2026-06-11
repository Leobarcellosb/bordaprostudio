-- Quiz de fim de trial (coleta de feedback/objeção). Respostas chegam pelo
-- endpoint submit-quiz (modal autenticado OU ManyChat via secret). `bought` é
-- DETECTADO do status da subscription no momento da resposta, nunca perguntado.
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,                          -- nullable: ManyChat pode não resolver o user
  email text NOT NULL,
  source text NOT NULL,                  -- 'modal' | 'whatsapp'
  bought boolean NOT NULL DEFAULT false, -- detectado de subscriptions (status=active vigente)
  q1_key text,                           -- chave da escolha única (ex: no_time, price_high…)
  q1_label text,                         -- label legível da opção
  q2_text text,                          -- resposta aberta
  q3_value text,                         -- NPS 0-10 (comprou) | sim/nao/talvez (não comprou)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_user ON public.quiz_responses (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_email ON public.quiz_responses (lower(email));

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Edge function escreve via service_role (bypassa RLS; policy explícita por clareza).
DROP POLICY IF EXISTS "Service manages quiz_responses" ON public.quiz_responses;
CREATE POLICY "Service manages quiz_responses" ON public.quiz_responses
  FOR ALL USING (auth.role() = 'service_role');

-- Dashboard admin lê tudo (borda_is_admin existe em prod — verificada).
DROP POLICY IF EXISTS "Admins read quiz_responses" ON public.quiz_responses;
CREATE POLICY "Admins read quiz_responses" ON public.quiz_responses
  FOR SELECT TO authenticated USING (public.borda_is_admin());

-- O modal checa "já respondi?" lendo a própria linha.
DROP POLICY IF EXISTS "Users read own quiz_responses" ON public.quiz_responses;
CREATE POLICY "Users read own quiz_responses" ON public.quiz_responses
  FOR SELECT TO authenticated USING (user_id = auth.uid());
