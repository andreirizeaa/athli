-- ================================================
-- 134: Form Files Bucket and Path Structure Fixes
-- ================================================
-- This migration:
-- 1. Creates the form_files storage bucket (was missing!)
-- 2. Sets up proper RLS policies with coach isolation
-- 3. Updates path structure expectation: {client_id}/{coach_id}/...
--
-- Form file types stored:
-- - Signatures: {client_id}/{coach_id}/signatures/{questionnaire_id}/...
-- - Images: {client_id}/{coach_id}/images/{questionnaire_id}/...
-- - Videos: {client_id}/{coach_id}/videos/{questionnaire_id}/...
--
-- Access rules:
-- - Coaches can manage files for their clients: form_files/{client_id}/{coach_id}/*
-- - Clients can read their own files: form_files/{client_id}/*/*
-- ================================================

-- ================================================
-- STEP 1: Create form_files bucket
-- ================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form_files',
  'form_files',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- STEP 2: Create RLS policies for form_files
-- ================================================

-- Drop any existing policies (in case they exist from manual setup)
DROP POLICY IF EXISTS storage_form_files_coach_manage ON storage.objects;
DROP POLICY IF EXISTS storage_form_files_client_read ON storage.objects;

-- Coaches can manage files for their clients
-- Path: {client_id}/{coach_id}/...
CREATE POLICY storage_form_files_coach_manage
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'form_files'
  -- Second folder must be the coach's ID
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  -- First folder (client_id) must be a client assigned to this coach
  AND EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_id = (SELECT auth.uid())
      AND cca.client_id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'form_files'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_id = (SELECT auth.uid())
      AND cca.client_id::text = (storage.foldername(name))[1]
  )
);

-- Clients can read their own files (from any coach)
CREATE POLICY storage_form_files_client_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'form_files'
  -- First folder must be the client's ID
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- Clients can also upload files for themselves (e.g., submitting questionnaires)
CREATE POLICY storage_form_files_client_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form_files'
  -- First folder must be the client's ID
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- ================================================
-- STEP 3: Update coach deletion trigger to clean form_files
-- ================================================
-- Add form_files cleanup to the existing coach deletion function

CREATE OR REPLACE FUNCTION public.handle_coach_account_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_ids UUID[];
  v_conversation_id UUID;
BEGIN
  -- 1. Delete coach_files bucket files
  DELETE FROM storage.objects
  WHERE bucket_id = 'coach_files'
    AND name LIKE OLD.id::text || '/%';

  -- 2. Delete coach-company bucket files
  DELETE FROM storage.objects
  WHERE bucket_id = 'coach-company'
    AND name LIKE OLD.id::text || '/%';

  -- 3. Delete exercise_videos bucket files
  DELETE FROM storage.objects
  WHERE bucket_id = 'exercise_videos'
    AND name LIKE OLD.id::text || '/%';

  -- 4. Delete profile-pictures bucket files
  DELETE FROM storage.objects
  WHERE bucket_id = 'profile-pictures'
    AND name LIKE OLD.id::text || '/%';

  -- 5. Delete client_photos for this coach (path: client_id/coach_id/...)
  DELETE FROM storage.objects
  WHERE bucket_id = 'client_photos'
    AND name ~ ('^[^/]+/' || OLD.id::text || '/');

  -- 6. Delete form_files for this coach (path: client_id/coach_id/...)
  DELETE FROM storage.objects
  WHERE bucket_id = 'form_files'
    AND name ~ ('^[^/]+/' || OLD.id::text || '/');

  -- 7. Delete message_attachments for all coach's conversations
  SELECT ARRAY_AGG(id) INTO v_conversation_ids
  FROM public.conversations
  WHERE coach_id = OLD.id;

  IF v_conversation_ids IS NOT NULL THEN
    FOREACH v_conversation_id IN ARRAY v_conversation_ids
    LOOP
      DELETE FROM storage.objects
      WHERE bucket_id = 'message_attachments'
        AND name LIKE v_conversation_id::text || '/%';
    END LOOP;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error cleaning up coach storage for coach %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, storage;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION public.handle_coach_account_deletion() FROM PUBLIC;

-- ================================================
-- Migration Complete
-- ================================================
-- Storage buckets with client data now use coach-isolated paths:
--
-- client_photos: {client_id}/{coach_id}/{date}/{category}/{filename}
-- form_files: {client_id}/{coach_id}/{type}/{questionnaire_id}/{filename}
--
-- Profile pictures ({user_id}/...) are NOT deleted when coach removes client
-- because they belong to the client's account, not the coach-client relationship.
--
-- When coach deletes account: All their data across all buckets is cleaned up
-- When coach removes client: Their data for that client is cleaned up
-- ================================================
