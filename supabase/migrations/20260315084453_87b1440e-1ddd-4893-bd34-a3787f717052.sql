
-- Community posts table
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  comment text,
  design_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read community_posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own community_posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own community_posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Matrix requests table
CREATE TABLE public.matrix_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  theme text NOT NULL,
  category text,
  comment text,
  votes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.matrix_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read matrix_requests"
  ON public.matrix_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own matrix_requests"
  ON public.matrix_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own matrix_requests"
  ON public.matrix_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Matrix request votes table
CREATE TABLE public.matrix_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id uuid NOT NULL REFERENCES public.matrix_requests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, request_id)
);

ALTER TABLE public.matrix_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read votes"
  ON public.matrix_request_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own votes"
  ON public.matrix_request_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own votes"
  ON public.matrix_request_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Function to increment/decrement votes_count
CREATE OR REPLACE FUNCTION public.update_votes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE matrix_requests SET votes_count = votes_count + 1 WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE matrix_requests SET votes_count = votes_count - 1 WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_vote_change
  AFTER INSERT OR DELETE ON public.matrix_request_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_votes_count();

-- Storage bucket for community photos
INSERT INTO storage.buckets (id, name, public) VALUES ('community-photos', 'community-photos', true);

CREATE POLICY "Anyone authenticated can upload community photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-photos');

CREATE POLICY "Anyone can view community photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'community-photos');

CREATE POLICY "Users can delete own community photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
