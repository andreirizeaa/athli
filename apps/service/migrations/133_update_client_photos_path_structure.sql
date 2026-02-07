-- ================================================
-- 133: Update client_photos Storage Path Structure
-- ================================================
-- This migration updates the storage policies to reflect the new path structure:
--
-- OLD path: {client_id}/{date}/{category}/{timestamp}_{random}.ext
-- NEW path: {client_id}/{coach_id}/{date}/{category}/{timestamp}_{random}.ext
--
-- This change allows each coach's data for a client to be isolated and deleted
-- independently when:
-- - A coach removes a client (only their photos are deleted)
-- - A coach deletes their account (only their photos are deleted across all clients)
--
-- Access rules:
-- - Coaches can access: client_photos/{client_id}/{coach_id}/* where they are the coach
-- - Clients can access: client_photos/{client_id}/*/* for their own photos (all coaches)
-- ================================================

-- ================================================
-- STEP 1: Drop existing policies
-- ================================================

DROP POLICY IF EXISTS storage_client_photos_manage ON storage.objects;
DROP POLICY IF EXISTS storage_coach_read_client_photos ON storage.objects;
DROP POLICY IF EXISTS storage_coach_manage_client_photos ON storage.objects;

-- ================================================
-- STEP 2: Create new policy for coaches to manage client photos
-- ================================================
-- Coaches can upload/update/delete photos in: {client_id}/{coach_id}/*
-- This requires:
-- - First folder (client_id) matches a client assigned to the coach
-- - Second folder matches the coach's own ID

CREATE POLICY storage_coach_manage_client_photos
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'client_photos'
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
  bucket_id = 'client_photos'
  -- Second folder must be the coach's ID
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  -- First folder (client_id) must be a client assigned to this coach
  AND EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_id = (SELECT auth.uid())
      AND cca.client_id::text = (storage.foldername(name))[1]
  )
);

-- ================================================
-- STEP 3: Create new policy for clients to read their own photos
-- ================================================
-- Clients can read all photos in their folder: {client_id}/*/*
-- This allows clients to see photos from all their coaches

CREATE POLICY storage_client_read_own_photos
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client_photos'
  -- First folder must be the client's ID
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- ================================================
-- Migration Complete
-- ================================================
-- New path structure: {client_id}/{coach_id}/{date}/{category}/{filename}
--
-- Coach access:
-- - Can upload/manage photos at client_photos/{client_id}/{coach_id}/*
-- - Can only access their own subfolder for each client
--
-- Client access:
-- - Can read all photos in client_photos/{client_id}/*/* (from all coaches)
-- - Cannot upload (photos are managed by coaches)
--
-- Deletion behavior:
-- - When coach removes client: Delete client_photos/{client_id}/{coach_id}/*
-- - When coach deletes account: Delete client_photos/*/{coach_id}/* (all clients)
-- - Other coaches' data for same client is preserved
-- ================================================
