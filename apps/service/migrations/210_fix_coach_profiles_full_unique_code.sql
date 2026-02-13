-- ============================================================
-- Migration 211: Fix coach_profiles_full view to include unique_code
-- ============================================================
-- The unique_code column was removed from coach_profiles in migration 180
-- and moved to coach_unique_codes table. This updates the view to include
-- the code by joining with coach_unique_codes.
-- ============================================================

-- Drop and recreate the view with unique_code from coach_unique_codes
DROP VIEW IF EXISTS public.coach_profiles_full;

CREATE OR REPLACE VIEW public.coach_profiles_full WITH (security_invoker = true) AS
SELECT
  cp.id,
  up.email,
  COALESCE(up.name, ''::character varying) AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email'::character varying) AS signin_method,
  cp.is_active,
  cp.is_archived,
  cp.status,
  up.timezone,
  cp.created_at,
  cp.updated_at,
  cp.free_trial_completed,
  cp.referrer_coach_id,
  cuc.code AS unique_code
FROM public.coach_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.id AND up.user_type::text = 'coach'::text
LEFT JOIN public.coach_unique_codes cuc ON cuc.coach_id = cp.id AND cuc.onboarding_id IS NULL;

COMMENT ON VIEW public.coach_profiles_full IS 'Complete coach profile view merging coach_profiles with user_profiles and unique_code from coach_unique_codes.';

-- Grant permissions
GRANT SELECT ON public.coach_profiles_full TO authenticated;
GRANT SELECT ON public.coach_profiles_full TO service_role;
