-- ================================================
-- 031: Fix client_profiles coach_id references
-- ================================================
-- This migration fixes references to the non-existent coach_id column in client_profiles
-- and redirects them to the coach_client_assignments table.

-- 1. Update RLS policies for client_profiles
DROP POLICY IF EXISTS cp_select ON public.client_profiles;
DROP POLICY IF EXISTS cp_update ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_insert ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_delete ON public.client_profiles;

CREATE POLICY cp_select
ON public.client_profiles
FOR SELECT
TO authenticated
USING (
  client_id = (select auth.uid())
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
  client_id = (select auth.uid())
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

-- Note: Coach insert logic usually happens via coach-clients.controller.ts
-- which bypasses RLS if using service role, or needs specific permission.
CREATE POLICY cp_coach_insert
ON public.client_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_profiles.client_id
      AND cca.coach_id = (select auth.uid())
  )
);

CREATE POLICY cp_coach_delete
ON public.client_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_profiles.client_id
      AND cca.coach_id = (select auth.uid())
  )
);

-- 2. Update Trigger Functions for Data Integrity

-- enforce_photo_log_integrity
CREATE OR REPLACE FUNCTION public.enforce_photo_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Search in assignments instead of profiles
  SELECT cca.coach_id INTO v_coach 
  FROM public.coach_client_assignments cca 
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN 
    RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id; 
  END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;

-- enforce_coach_private_integrity
CREATE OR REPLACE FUNCTION public.enforce_coach_private_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Search in assignments instead of profiles
  SELECT cca.coach_id INTO v_coach 
  FROM public.coach_client_assignments cca 
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN 
    RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id; 
  END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;

-- 3. Update Storage Policies
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

-- Update client_training_summary policy if it still references cp.coach_id
DROP POLICY IF EXISTS cts_select ON public.client_training_summary;
CREATE POLICY cts_select
ON public.client_training_summary
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_training_summary.client_id
      AND cca.coach_id = (select auth.uid())
  )
);
