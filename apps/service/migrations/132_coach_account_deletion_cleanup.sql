-- ================================================
-- 132: Coach Account Deletion Cleanup
-- ================================================
-- This migration creates triggers to properly cleanup all coach data
-- when a coach deletes their account from the web app settings.
--
-- Storage buckets to clean:
-- - coach_files/{coach_id}/* - coach's library files
-- - coach-company/{coach_id}/* - company logos
-- - exercise_videos/{coach_id}/* - exercise videos
-- - profile-pictures/{coach_id}/* - coach avatar
-- - client_photos/*/{coach_id}/* - all client photos uploaded by this coach
-- - message_attachments/{conversation_id}/* - for all coach's conversations
--
-- Table data: Handled by CASCADE from coach_profiles deletion
-- Auth cleanup: AFTER DELETE trigger deletes user_profiles and auth.users
-- ================================================

-- ================================================
-- STEP 1: Create storage cleanup function (BEFORE DELETE)
-- ================================================
-- This function deletes all files belonging to a coach from storage buckets
-- before the coach_profiles row is deleted.

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

  -- 5. Delete client_photos for this coach (new path: client_id/coach_id/...)
  -- Match pattern: */{coach_id}/* to find all client photos uploaded by this coach
  DELETE FROM storage.objects
  WHERE bucket_id = 'client_photos'
    AND name ~ ('^[^/]+/' || OLD.id::text || '/');

  -- 6. Delete message_attachments for all coach's conversations
  -- First, collect all conversation IDs where this coach is involved
  SELECT ARRAY_AGG(id) INTO v_conversation_ids
  FROM public.conversations
  WHERE coach_id = OLD.id;

  -- Delete attachments for each conversation
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
    -- Log error but don't fail the deletion - data cleanup is best effort
    RAISE WARNING 'Error cleaning up coach storage for coach %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, storage;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION public.handle_coach_account_deletion() FROM PUBLIC;

-- ================================================
-- STEP 2: Create BEFORE DELETE trigger on coach_profiles
-- ================================================
-- This trigger fires before the coach_profiles row is deleted,
-- giving us a chance to clean up storage before cascades run.

DROP TRIGGER IF EXISTS trg_coach_account_deletion ON public.coach_profiles;
CREATE TRIGGER trg_coach_account_deletion
  BEFORE DELETE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coach_account_deletion();

-- ================================================
-- STEP 3: Create AFTER DELETE trigger to clean up auth.users
-- ================================================
-- When a coach deletes their profile, we should also clean up:
-- 1. user_profiles table (coach type)
-- 2. auth.users table (the actual auth record)
--
-- Note: Client user_profiles, client_profiles, and auth.users are preserved
-- so clients can still use the app with other coaches or return later.

CREATE OR REPLACE FUNCTION public.handle_coach_auth_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the coach's user_profiles entry
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'coach';

  -- Delete from auth.users (this will cascade to other auth-related tables)
  DELETE FROM auth.users
  WHERE id = OLD.id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - the main profile is already deleted
    RAISE WARNING 'Error cleaning up auth for coach %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION public.handle_coach_auth_cleanup() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_coach_auth_cleanup ON public.coach_profiles;
CREATE TRIGGER trg_coach_auth_cleanup
  AFTER DELETE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coach_auth_cleanup();

-- ================================================
-- STEP 4: Add RLS policy for coaches to delete their own profile
-- ================================================
-- Ensure coaches can delete their own profile row

DROP POLICY IF EXISTS "coach_profiles_delete_own" ON public.coach_profiles;
CREATE POLICY "coach_profiles_delete_own" ON public.coach_profiles
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = id);

-- ================================================
-- Migration Complete
-- ================================================
-- When a coach deletes their account from the web app:
-- 1. Service calls DELETE on coach_profiles where id = coach_id
-- 2. BEFORE DELETE trigger cleans up all storage buckets
-- 3. CASCADE deletes clean up all related table data (assignments, etc.)
-- 4. AFTER DELETE trigger cleans up user_profiles and auth.users
--
-- What is preserved (for clients with other coaches):
-- - Client user_profiles entries
-- - Client client_profiles entries
-- - Client auth.users entries
-- - Client data with OTHER coaches is untouched
-- ================================================
