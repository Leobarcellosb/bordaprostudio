ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Generate slugs from existing names
UPDATE public.categories SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;