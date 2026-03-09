
CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(catalog_id, design_id)
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert items to own catalogs" ON public.catalog_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.catalogs WHERE id = catalog_id AND user_id = auth.uid()));

CREATE POLICY "Users can view items from own catalogs" ON public.catalog_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.catalogs WHERE id = catalog_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete items from own catalogs" ON public.catalog_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.catalogs WHERE id = catalog_id AND user_id = auth.uid()));
