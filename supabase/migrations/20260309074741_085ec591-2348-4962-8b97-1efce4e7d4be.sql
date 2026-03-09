
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-covers', 'design-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read design covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'design-covers');

CREATE POLICY "Authenticated users can upload design covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'design-covers');

CREATE POLICY "Service role can manage design covers"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'design-covers');
