
ALTER TABLE public.product_ideas 
  ADD COLUMN IF NOT EXISTS price_range text,
  ADD COLUMN IF NOT EXISTS profit_example text;
