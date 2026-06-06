-- ============================================================================
-- CAPTURA do estado real de prod (storage + funcs de admin/assinatura).
-- Versiona objetos criados FORA das migrations (dashboard) pra que um deploy
-- de schema limpo reproduza o prod. Conteúdo VERBATIM do pg_get_functiondef /
-- pg_policies / storage.buckets lidos em prod (2026-06-06).
--
-- NÃO É PRA RODAR EM PROD (prod já tem isso) — registrar só via:
--   supabase migration repair --status applied 20260606130000
-- É idempotente (CREATE OR REPLACE / ON CONFLICT / DROP+CREATE) caso rode num
-- ambiente novo.
-- ============================================================================

-- [1] FUNÇÕES (verbatim)
CREATE OR REPLACE FUNCTION public.borda_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin');
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = user_uuid AND status = 'active'
    AND (access_expires_at IS NULL OR access_expires_at > now()));
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_uuid AND role = 'admin');
$function$;

-- [2] BUCKETS (verificado 100% contra prod)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars','avatars',true),
  ('community','community',true),
  ('community-photos','community-photos',true),
  ('design-covers','design-covers',true),
  ('design-files','design-files',false),
  ('designs','designs',true),
  ('kit-covers','kit-covers',true),
  ('kit-files','kit-files',false),
  ('kit-zips','kit-zips',false),
  ('premium-kit-files','premium-kit-files',false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- [3] POLICIES de storage.objects (18, verbatim do pg_policies)
DROP POLICY IF EXISTS "Avatar delete próprio" ON storage.objects;
CREATE POLICY "Avatar delete próprio" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Avatar público" ON storage.objects;
CREATE POLICY "Avatar público" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'avatars'::text);

DROP POLICY IF EXISTS "Avatar upload próprio" ON storage.objects;
CREATE POLICY "Avatar upload próprio" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Community público" ON storage.objects;
CREATE POLICY "Community público" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'community'::text);

DROP POLICY IF EXISTS "Community upload autenticado" ON storage.objects;
CREATE POLICY "Community upload autenticado" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'community'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Designs público" ON storage.objects;
CREATE POLICY "Designs público" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'designs'::text);

DROP POLICY IF EXISTS "Designs upload admin" ON storage.objects;
CREATE POLICY "Designs upload admin" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'designs'::text) AND borda_is_admin());

DROP POLICY IF EXISTS "community_photos_insert" ON storage.objects;
CREATE POLICY "community_photos_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'community-photos'::text) AND (auth.role() = 'authenticated'::text));

DROP POLICY IF EXISTS "community_photos_select" ON storage.objects;
CREATE POLICY "community_photos_select" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'community-photos'::text);

DROP POLICY IF EXISTS "design_covers_admin_write" ON storage.objects;
CREATE POLICY "design_covers_admin_write" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'design-covers'::text) AND is_admin());

DROP POLICY IF EXISTS "design_covers_insert" ON storage.objects;
CREATE POLICY "design_covers_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'design-covers'::text) AND is_admin());

DROP POLICY IF EXISTS "design_covers_public_read" ON storage.objects;
CREATE POLICY "design_covers_public_read" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'design-covers'::text);

DROP POLICY IF EXISTS "design_covers_select" ON storage.objects;
CREATE POLICY "design_covers_select" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'design-covers'::text);

DROP POLICY IF EXISTS "design_files_insert" ON storage.objects;
CREATE POLICY "design_files_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'design-files'::text) AND is_admin());

DROP POLICY IF EXISTS "kit_covers_admin_write" ON storage.objects;
CREATE POLICY "kit_covers_admin_write" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'kit-covers'::text) AND is_admin());

DROP POLICY IF EXISTS "kit_covers_public_read" ON storage.objects;
CREATE POLICY "kit_covers_public_read" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'kit-covers'::text);

DROP POLICY IF EXISTS "private_files_admin_write" ON storage.objects;
CREATE POLICY "private_files_admin_write" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = ANY (ARRAY['design-files'::text, 'kit-files'::text, 'kit-zips'::text, 'premium-kit-files'::text])) AND is_admin());

DROP POLICY IF EXISTS "private_files_read" ON storage.objects;
CREATE POLICY "private_files_read" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = ANY (ARRAY['design-files'::text, 'kit-files'::text, 'kit-zips'::text, 'premium-kit-files'::text])) AND has_active_subscription());
