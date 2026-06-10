-- Reconciliação de prod (mepvdblcphcgebsxpykk): a função search_designs em prod
-- estava numa versão ANTIGA (4 params: p_format, p_stitch_max, p_stitch_min,
-- search_term) — pré-repo, nunca recebeu as migrations 20260314043011 /
-- 20260317060232 / 20260317192058. O frontend (useSeasonalCalendar,
-- useCollectionDetector, useKitSuggestions, SmartKitBuilder) e a edge function
-- build-kit-draft chamam a versão NOVA (9 params) → PostgREST 404 PGRST202.
-- Este arquivo recria a versão nova (idempotente). Conteúdo = 20260317192058
-- + garantia da extensão unaccent (criada em 20260314043011, que também pode
-- não ter chegado em prod).
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.search_designs(
  search_term text,
  p_category_id uuid DEFAULT NULL,
  p_hoop_size text DEFAULT NULL,
  p_stitch_min integer DEFAULT NULL,
  p_stitch_max integer DEFAULT NULL,
  p_sort text DEFAULT 'recent',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 24,
  p_machine_format text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, name text, generated_title text, raw_filename text, cover_image text,
  description text, category_id uuid, hoop_size text, width_mm numeric, height_mm numeric,
  stitch_count integer, colors_count integer, tags_text text, is_published boolean,
  featured_for_daily_inspiration boolean, created_at timestamptz, updated_at timestamptz,
  category_name text, relevance integer, total_count bigint, is_compatible boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_term text;
BEGIN
  normalized_term := lower(unaccent(coalesce(search_term, '')));

  RETURN QUERY
  WITH base AS (
    SELECT
      d.id, d.name, d.generated_title, d.raw_filename, d.cover_image,
      d.description, d.category_id, d.hoop_size, d.width_mm, d.height_mm,
      d.stitch_count, d.colors_count, d.tags_text, d.is_published,
      d.featured_for_daily_inspiration, d.created_at, d.updated_at,
      c.name AS cat_name,
      CASE
        WHEN normalized_term = '' THEN 0
        WHEN lower(unaccent(coalesce(d.name, ''))) = normalized_term THEN 100
        WHEN lower(unaccent(coalesce(d.generated_title, ''))) = normalized_term THEN 95
        WHEN lower(unaccent(coalesce(d.name, ''))) LIKE normalized_term || '%' THEN 80
        WHEN lower(unaccent(coalesce(d.generated_title, ''))) LIKE normalized_term || '%' THEN 75
        WHEN lower(unaccent(coalesce(d.name, ''))) LIKE '%' || normalized_term || '%' THEN 60
        WHEN lower(unaccent(coalesce(d.generated_title, ''))) LIKE '%' || normalized_term || '%' THEN 55
        WHEN lower(unaccent(coalesce(d.tags_text, ''))) LIKE '%' || normalized_term || '%' THEN 40
        WHEN lower(unaccent(coalesce(c.name, ''))) LIKE '%' || normalized_term || '%' THEN 30
        WHEN lower(unaccent(coalesce(d.raw_filename, ''))) LIKE '%' || normalized_term || '%' THEN 20
        ELSE 0
      END AS rel_score,
      CASE WHEN p_hoop_size IS NULL OR d.hoop_size = p_hoop_size THEN true ELSE false END AS hoop_match,
      CASE WHEN p_machine_format IS NULL OR EXISTS (
        SELECT 1 FROM kit_arquivos ka WHERE ka.design_id = d.id AND lower(ka.format) = lower(p_machine_format)
      ) THEN true ELSE false END AS format_match
    FROM designs d
    LEFT JOIN categories c ON c.id = d.category_id
    WHERE d.is_published = true
      AND (p_category_id IS NULL OR d.category_id = p_category_id)
      AND (p_stitch_min IS NULL OR d.stitch_count >= p_stitch_min)
      AND (p_stitch_max IS NULL OR d.stitch_count <= p_stitch_max)
      AND (
        normalized_term = ''
        OR lower(unaccent(coalesce(d.name, ''))) LIKE '%' || normalized_term || '%'
        OR lower(unaccent(coalesce(d.generated_title, ''))) LIKE '%' || normalized_term || '%'
        OR lower(unaccent(coalesce(d.raw_filename, ''))) LIKE '%' || normalized_term || '%'
        OR lower(unaccent(coalesce(d.tags_text, ''))) LIKE '%' || normalized_term || '%'
        OR lower(unaccent(coalesce(c.name, ''))) LIKE '%' || normalized_term || '%'
      )
  ),
  counted AS (
    SELECT count(*) AS cnt FROM base WHERE base.rel_score > 0 OR normalized_term = ''
  )
  SELECT
    f.id, f.name, f.generated_title, f.raw_filename, f.cover_image,
    f.description, f.category_id, f.hoop_size, f.width_mm, f.height_mm,
    f.stitch_count, f.colors_count, f.tags_text, f.is_published,
    f.featured_for_daily_inspiration, f.created_at, f.updated_at,
    f.cat_name,
    f.rel_score,
    counted.cnt,
    (f.hoop_match AND f.format_match) AS is_compat
  FROM base f, counted
  WHERE f.rel_score > 0 OR normalized_term = ''
  ORDER BY
    CASE WHEN f.hoop_match AND f.format_match THEN 0
         WHEN f.format_match THEN 1
         WHEN f.hoop_match THEN 2
         ELSE 3 END,
    CASE WHEN normalized_term != '' THEN -f.rel_score ELSE 0 END,
    CASE WHEN p_sort = 'name_asc' THEN f.name END ASC,
    f.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$function$;
