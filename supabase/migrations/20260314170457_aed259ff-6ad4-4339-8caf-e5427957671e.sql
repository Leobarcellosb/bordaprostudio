
ALTER TABLE public.catalogs 
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS layout_type text NOT NULL DEFAULT 'clean-grid';

ALTER TABLE public.catalog_items 
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
