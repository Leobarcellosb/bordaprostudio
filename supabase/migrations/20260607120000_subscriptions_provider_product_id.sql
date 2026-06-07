-- Fix do filtro de produto do webhook Eduzz + auditoria.
-- Guarda o product ID da Eduzz na assinatura, pra auditar de qual produto a
-- assinatura veio e pra dar suporte à allowlist do webhook (só Borda Pro concede acesso).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_product_id text;

COMMENT ON COLUMN public.subscriptions.provider_product_id IS
  'ID do produto na Eduzz (payload.product.id). Auditoria de origem da assinatura e base da allowlist BORDA_PRO_PRODUCT_IDS do eduzz-webhook.';
