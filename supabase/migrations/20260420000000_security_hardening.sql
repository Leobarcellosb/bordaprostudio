-- Security hardening: tighten RLS, storage policies, and owner validation.
-- Generated 2026-04-20. REVISE AND TEST em ambiente de staging antes de aplicar em prod.

-- ============================================================================
-- 1. designs: restringir SELECT a publicados (exceto admin)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone authenticated can read published designs" ON public.designs;
DROP POLICY IF EXISTS "Anyone can read published designs" ON public.designs;

CREATE POLICY "designs_read_published_or_admin"
  ON public.designs
  FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================================================
-- 2. community_posts: SELECT só owner + admin (se tabela existe)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'community_posts'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read community posts" ON public.community_posts';
    EXECUTE 'DROP POLICY IF EXISTS "community_posts_select" ON public.community_posts';
    EXECUTE $policy$
      CREATE POLICY "community_posts_read_owner_or_admin"
        ON public.community_posts
        FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    $policy$;
  END IF;
END
$$;

-- ============================================================================
-- 3. matrix_requests: SELECT só owner + admin
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'matrix_requests'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view matrix requests" ON public.matrix_requests';
    EXECUTE 'DROP POLICY IF EXISTS "matrix_requests_select" ON public.matrix_requests';
    EXECUTE $policy$
      CREATE POLICY "matrix_requests_read_owner_or_admin"
        ON public.matrix_requests
        FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    $policy$;
  END IF;
END
$$;

-- ============================================================================
-- 4. matrix_request_votes: SELECT só owner + admin
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'matrix_request_votes'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view matrix votes" ON public.matrix_request_votes';
    EXECUTE $policy$
      CREATE POLICY "matrix_request_votes_read_owner_or_admin"
        ON public.matrix_request_votes
        FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    $policy$;
  END IF;
END
$$;

-- ============================================================================
-- 5. Storage: policies de INSERT exigem path = user_id
-- ============================================================================

-- avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "avatars_insert_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "avatars_update_own_folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "avatars_delete_own_folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- community-photos (se bucket existir)
DROP POLICY IF EXISTS "Anyone authenticated can upload community photos" ON storage.objects;
CREATE POLICY "community_photos_insert_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- design-covers, kit-covers, kit-files: restringir INSERT/UPDATE/DELETE a admin
DROP POLICY IF EXISTS "Anyone authenticated can upload design covers" ON storage.objects;
CREATE POLICY "design_covers_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'design-covers'
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Anyone authenticated can upload kit covers" ON storage.objects;
CREATE POLICY "kit_covers_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kit-covers'
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Anyone authenticated can upload kit files" ON storage.objects;
CREATE POLICY "kit_files_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kit-files'
    AND public.has_role(auth.uid(), 'admin')
  );

-- ============================================================================
-- 6. FORCE RLS em tabelas sensíveis (impede bypass por role com BYPASSRLS)
-- ============================================================================
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Revogar SELECT público em categories (se policy permitir anônimos)
-- ============================================================================
-- Deixe categorias abertas a authenticated apenas.
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "categories_read_authenticated"
  ON public.categories FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
