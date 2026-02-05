-- ================================================
-- 027: Client Account Deletion Cleanup
-- ================================================
-- This migration creates triggers to properly cleanup all client data
-- when a client deletes their account from the mobile app.
--
-- Table data: Already handled by ON DELETE CASCADE constraints
-- Storage data: Requires manual cleanup via trigger
-- ================================================

-- ================================================
-- STEP 1: Create storage cleanup function
-- ================================================
-- This function deletes all files belonging to a client from storage buckets
-- before the client_profiles row is deleted.

CREATE OR REPLACE FUNCTION public.handle_client_account_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_file_paths TEXT[];
  v_path TEXT;
BEGIN
  -- Collect all photo paths from client_photo_logs before they cascade delete
  SELECT ARRAY_AGG(DISTINCT path) INTO v_file_paths
  FROM (
    SELECT front_photo_path AS path FROM public.client_photo_logs WHERE client_id = OLD.client_id AND front_photo_path IS NOT NULL
    UNION
    SELECT side_photo_path AS path FROM public.client_photo_logs WHERE client_id = OLD.client_id AND side_photo_path IS NOT NULL
    UNION
    SELECT back_photo_path AS path FROM public.client_photo_logs WHERE client_id = OLD.client_id AND back_photo_path IS NOT NULL
  ) AS paths;

  -- Delete each file from client_photos bucket
  IF v_file_paths IS NOT NULL THEN
    FOREACH v_path IN ARRAY v_file_paths
    LOOP
      DELETE FROM storage.objects 
      WHERE bucket_id = 'client_photos' 
        AND name = v_path;
    END LOOP;
  END IF;

  -- Also delete any files that follow the {client_id}/... pattern
  -- This catches any files that might not be tracked in photo_logs
  DELETE FROM storage.objects 
  WHERE bucket_id = 'client_photos' 
    AND name LIKE OLD.client_id::text || '/%';

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the deletion - data cleanup is best effort
    RAISE WARNING 'Error cleaning up client storage for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, storage;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION public.handle_client_account_deletion() FROM PUBLIC;

-- ================================================
-- STEP 2: Create BEFORE DELETE trigger on client_profiles
-- ================================================
-- This trigger fires before the client_profiles row is deleted,
-- giving us a chance to clean up storage before cascades run.

DROP TRIGGER IF EXISTS trg_client_account_deletion ON public.client_profiles;
CREATE TRIGGER trg_client_account_deletion
  BEFORE DELETE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_account_deletion();

-- ================================================
-- STEP 3: Create AFTER DELETE trigger to clean up auth.users
-- ================================================
-- When a client deletes their profile, we should also clean up:
-- 1. user_profiles table (for backward compatibility)
-- 2. auth.users table (the actual auth record)
--
-- Note: The cascade from client_profiles to auth.users might not exist
-- (client_profiles references auth.users, not the other way around)

CREATE OR REPLACE FUNCTION public.handle_client_auth_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from user_profiles (if exists)
  DELETE FROM public.user_profiles 
  WHERE id = OLD.client_id;

  -- Delete from auth.users (this will cascade to other auth-related tables)
  DELETE FROM auth.users 
  WHERE id = OLD.client_id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - the main profile is already deleted
    RAISE WARNING 'Error cleaning up auth for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION public.handle_client_auth_cleanup() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_client_auth_cleanup ON public.client_profiles;
CREATE TRIGGER trg_client_auth_cleanup
  AFTER DELETE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_auth_cleanup();

-- ================================================
-- STEP 4: Add RLS policy for clients to delete their own profile
-- ================================================
-- Ensure clients can delete their own profile row

DROP POLICY IF EXISTS "cp_client_delete" ON public.client_profiles;
CREATE POLICY "cp_client_delete" ON public.client_profiles
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = client_id);

-- ================================================
-- Migration Complete
-- ================================================
-- When a client deletes their account from the mobile app:
-- 1. Client calls DELETE on client_profiles where client_id = auth.uid()
-- 2. BEFORE DELETE trigger cleans up storage (client_photos bucket)
-- 3. CASCADE deletes clean up all related table data
-- 4. AFTER DELETE trigger cleans up user_profiles and auth.users
-- ================================================
