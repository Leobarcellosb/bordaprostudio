
-- Categories table
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Designs table (replaces "kits")
CREATE TABLE public.designs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    cover_image text,
    category_id uuid REFERENCES public.categories(id),
    tags_text text DEFAULT '',
    stitch_count integer,
    colors_count integer,
    width_mm numeric,
    height_mm numeric,
    is_published boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read published designs" ON public.designs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage designs" ON public.designs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Kit arquivos (embroidery files linked to designs)
CREATE TABLE public.kit_arquivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id uuid REFERENCES public.designs(id) ON DELETE CASCADE NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    format text NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.kit_arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read kit_arquivos" ON public.kit_arquivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage kit_arquivos" ON public.kit_arquivos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Favorites table
CREATE TABLE public.favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    kit_id uuid REFERENCES public.designs(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, kit_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid());

-- Downloads tracking
CREATE TABLE public.downloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    kit_id uuid REFERENCES public.designs(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own downloads" ON public.downloads FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all downloads" ON public.downloads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Product ideas
CREATE TABLE public.product_ideas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id uuid REFERENCES public.designs(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.product_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own product_ideas" ON public.product_ideas FOR ALL TO authenticated USING (user_id = auth.uid());

-- Profiles table
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    email text,
    plan text DEFAULT 'basic',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Insert profile for existing user
INSERT INTO public.profiles (id, email, name)
SELECT id, email, split_part(email, '@', 1) FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('kit-covers', 'kit-covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kit-files', 'kit-files', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can read kit-covers" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kit-covers');
CREATE POLICY "Admins can upload kit-covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kit-covers');
CREATE POLICY "Authenticated users can read kit-files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kit-files');
CREATE POLICY "Admins can upload kit-files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kit-files');
