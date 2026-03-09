
CREATE TABLE public.catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own catalogs" ON public.catalogs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own catalogs" ON public.catalogs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own catalogs" ON public.catalogs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own catalogs" ON public.catalogs FOR DELETE TO authenticated USING (auth.uid() = user_id);
