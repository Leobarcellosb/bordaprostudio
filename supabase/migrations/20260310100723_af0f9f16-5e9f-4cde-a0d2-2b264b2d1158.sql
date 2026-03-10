
CREATE TABLE public.premium_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image text,
  designs_count integer NOT NULL DEFAULT 0,
  zip_url text,
  access_rule text NOT NULL DEFAULT 'included_in_annual' CHECK (access_rule IN ('included_in_annual', 'purchase_required', 'both')),
  price numeric,
  purchase_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.premium_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage premium_kits" ON public.premium_kits
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can read published premium_kits" ON public.premium_kits
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Storage bucket for kit covers and files
INSERT INTO storage.buckets (id, name, public) VALUES ('premium-kit-files', 'premium-kit-files', true);

CREATE POLICY "Admins can upload premium kit files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'premium-kit-files' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read premium kit files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'premium-kit-files');

CREATE POLICY "Admins can delete premium kit files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'premium-kit-files' AND has_role(auth.uid(), 'admin'));
