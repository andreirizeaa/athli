-- ================================================
-- 140: Fix Demo Client Cleanup on Coach Account Deletion
-- ================================================
-- The previous handle_coach_auth_cleanup function wasn't reliably cleaning up
-- demo client data. This migration improves the cleanup logic by:
-- 1. Deleting client_profiles BEFORE user_profiles (to satisfy FK constraints)
-- 2. Adding explicit deletion of coach_client_assignments for demo (self-referencing) entries
-- 3. Removing the exception swallowing that hid failures
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_coach_auth_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- For demo clients, the coach is their own client (coach_id = client_id)
  -- We need to clean up in the right order to avoid FK violations

  -- Step 1: Delete any coach_client_assignments where this user is the client
  -- (In case cascade from coach_profiles didn't catch all of them)
  DELETE FROM public.coach_client_assignments
  WHERE client_id = OLD.id;

  -- Step 2: Delete client_profiles for this user (demo client)
  -- Must happen before user_profiles due to FK constraint
  DELETE FROM public.client_profiles
  WHERE client_id = OLD.id;

  -- Step 3: Delete user_profiles entry with user_type='client' (demo)
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'client';

  -- Step 4: Delete the coach's user_profiles entry
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'coach';

  -- Step 5: Delete from auth.users (cascades to other auth-related tables)
  DELETE FROM auth.users
  WHERE id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION public.handle_coach_auth_cleanup() FROM PUBLIC;

-- Ensure the trigger exists (in case it was dropped)
DROP TRIGGER IF EXISTS trg_coach_auth_cleanup ON public.coach_profiles;
CREATE TRIGGER trg_coach_auth_cleanup
  AFTER DELETE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coach_auth_cleanup();
