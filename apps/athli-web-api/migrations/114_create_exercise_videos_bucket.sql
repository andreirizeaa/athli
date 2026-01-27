-- Migration: Create exercise_videos storage bucket
-- This bucket stores custom exercise videos uploaded by coaches
-- Videos here are NOT tracked in coach_files table

-- Create the exercise_videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise_videos',
  'exercise_videos',
  false,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for exercise_videos bucket

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Coaches can upload exercise videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise_videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own videos
CREATE POLICY "Coaches can read their exercise videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exercise_videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Coaches can delete their exercise videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise_videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role full access (for signed URLs)
CREATE POLICY "Service role has full access to exercise videos"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'exercise_videos')
WITH CHECK (bucket_id = 'exercise_videos');
