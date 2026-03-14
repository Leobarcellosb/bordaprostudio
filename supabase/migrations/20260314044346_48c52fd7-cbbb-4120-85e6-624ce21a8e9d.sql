
-- Kits table
CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  description text,
  cover_image text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read kits"
  ON public.kits FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage kits"
  ON public.kits FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Kit designs relation table
CREATE TABLE public.kit_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  UNIQUE(kit_id, design_id)
);

ALTER TABLE public.kit_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read kit_designs"
  ON public.kit_designs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage kit_designs"
  ON public.kit_designs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));
