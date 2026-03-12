ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS raw_filename text,
  ADD COLUMN IF NOT EXISTS generated_title text;