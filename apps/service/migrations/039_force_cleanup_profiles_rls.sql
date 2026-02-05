-- Migration 039: Force cleanup of client_profiles RLS policies
-- Purpose: Remove any lingering references to cp.coach_id in client_profiles policies

-- 1. Drop ALL policies on client_profiles to be safe
DROP POLICY IF EXISTS cp_select ON public.client_profiles;
DROP POLICY IF EXISTS cp_update ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_insert ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_delete ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_select ON public.client_profiles;
DROP POLICY IF EXISTS cp_client_select ON public.client_profiles;

-- 2. Recreate clean policies using ONLY coach_client_assignments for coach checks
CREATE POLICY cp_select
ON public.client_profiles
FOR SELECT
TO authenticated
USING (
  -- User is the client
  client_id = (select auth.uid())
  -- User is the assigned coach
  OR EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_profiles.client_id
      AND cca.coach_id = (select auth.uid())
  )
);

CREATE POLICY cp_update
ON public.client_profiles
FOR UPDATE
TO authenticated
USING (
  -- User is the client (can update own profile)
  client_id = (select auth.uid())
  -- Coach can update? (Usually via controller, but RLS might allow)
  OR EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_profiles.client_id
      AND cca.coach_id = (select auth.uid())
  )
)
WITH CHECK (
  client_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_profiles.client_id
      AND cca.coach_id = (select auth.uid())
  )
);

CREATE POLICY cp_insert_coach
ON public.client_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow if there's a corresponding assignment (created transactionally)
  -- Or if the user is the client themselves (self-signup)
  client_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_profiles.client_id
      AND cca.coach_id = (select auth.uid())
  )
);

-- 3. Also check `storage_coach_read_client_photos` again
DROP POLICY IF EXISTS storage_coach_read_client_photos ON storage.objects;
CREATE POLICY storage_coach_read_client_photos
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client_photos'
  AND EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id::text = (storage.foldername(name))[1]
      AND (cca.coach_id = (select auth.uid()) OR cca.client_id = (select auth.uid()))
  )
);
