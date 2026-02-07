-- ================================================
-- 136: Delete Demo Client on Coach Account Deletion
-- ================================================
-- Demo clients use the same user ID as the coach, with a user_profiles
-- entry where user_type='client'. Clean this up when coach deletes account.
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_coach_auth_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete demo client data (user_profiles entry with user_type='client' for same ID)
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'client';

  -- Delete client_profiles entry if exists (for demo)
  DELETE FROM public.client_profiles
  WHERE client_id = OLD.id;

  -- coach_client_assignments where coach is their own client will cascade

  -- Delete the coach's user_profiles entry
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'coach';

  -- Delete from auth.users (cascades to other auth-related tables)
  DELETE FROM auth.users
  WHERE id = OLD.id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error cleaning up auth for coach %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.handle_coach_auth_cleanup() FROM PUBLIC;
