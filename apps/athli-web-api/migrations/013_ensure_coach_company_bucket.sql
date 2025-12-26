-- ================================================
-- Ensure 'coach-company' bucket exists and has correct policies
-- ================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-company', 'coach-company', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Ensure RLS is enabled on storage.objects (usually is by default in Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public company logos are viewable by anyone" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can upload company logo" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update company logo" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete company logo" ON storage.objects;

-- 4. Create refined policies

-- Policy 1: Public access to view company logos
CREATE POLICY "Public company logos are viewable by anyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'coach-company');

-- Policy 2: Coaches can upload their own logo
-- Files must be in folder named after their UID
CREATE POLICY "Coaches can upload company logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-company' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Coaches can update their own logo
CREATE POLICY "Coaches can update company logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-company' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Coaches can delete their own logo
CREATE POLICY "Coaches can delete company logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-company' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
