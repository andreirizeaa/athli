-- ================================================
-- Migration 145: Add timezone to coach_profiles_full view
-- ================================================
-- Migration 142 added timezone to user_profiles and updated client_profiles_full,
-- but did NOT update coach_profiles_full. This migration recreates the view
-- to include up.timezone.

DROP VIEW IF EXISTS public.coach_profiles_full CASCADE;

CREATE OR REPLACE VIEW public.coach_profiles_full
WITH (security_invoker = true)
AS SELECT
  cp.id,
  up.email,
  COALESCE(up.name, '') AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email') AS signin_method,
  up.timezone,
  cp.is_active,
  cp.is_archived,
  cp.status,
  cp.unique_code,
  cp.getting_started_checklist_complete,
  cp.created_at,
  cp.updated_at
FROM public.coach_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.id AND up.user_type = 'coach';

COMMENT ON VIEW public.coach_profiles_full IS
'Complete coach profile view merging coach_profiles with user_profiles.
Use this view to get full coach data including name, email, profile picture, and timezone.';

GRANT SELECT ON public.coach_profiles_full TO authenticated;
