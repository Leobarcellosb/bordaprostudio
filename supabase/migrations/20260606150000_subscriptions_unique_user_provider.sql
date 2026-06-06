-- Destrava billing E revogação: o eduzz-webhook faz
--   .upsert(..., { onConflict: "user_id,provider" })
-- que gera ON CONFLICT (user_id, provider), mas NÃO existia constraint único
-- correspondente → todo evento dava 42P10 → upsert falhava → assinatura nunca
-- era criada (e cancel/refund nunca revogava). Verificado: 0 duplicatas de
-- (user_id, provider) em prod, então a adição é segura.
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_provider_key UNIQUE (user_id, provider);
