-- ================================================
-- ATHLI Storage Bucket Policies for Profile Pictures
-- ================================================
-- Run this AFTER creating the 'profile-pictures' bucket
-- in the Supabase Dashboard (Storage section)
-- ================================================

-- ================================================
-- IMPORTANT: Create the bucket first!
-- ================================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "Create a new bucket"
-- 3. Name: profile-pictures
-- 4. Public bucket: ✅ YES (checked)
-- 5. Click "Create bucket"
-- 6. THEN run this SQL script
-- ================================================

-- ================================================
-- Storage Policies
-- ================================================

-- Policy 1: Anyone can view profile pictures (public bucket)
CREATE POLICY "Public profile pictures are viewable by anyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Policy 2: Authenticated users can upload their own profile picture
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can update their own profile picture
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own profile picture
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ================================================
-- File Structure
-- ================================================
-- Profile pictures should be stored as:
-- profile-pictures/{user_id}/{filename}
--
-- Example:
-- profile-pictures/550e8400-e29b-41d4-a716-446655440000/avatar.jpg
-- ================================================

-- ================================================
-- How the policies work:
-- ================================================
-- 1. Anyone can SELECT/view pictures (public bucket)
-- 2. Users can only INSERT files in their own folder ({user_id}/)
-- 3. Users can only UPDATE files in their own folder
-- 4. Users can only DELETE files in their own folder
-- 5. The folder name MUST match the authenticated user's ID
-- ================================================
