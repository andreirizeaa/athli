-- Add free trial tracking to coach_profiles
-- free_trial_completed: prevents coaches from getting multiple free trials

ALTER TABLE public.coach_profiles
ADD COLUMN IF NOT EXISTS free_trial_completed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.coach_profiles.free_trial_completed IS 'Whether the coach has completed/used their 14-day free trial. Set to TRUE when trial expires or when they subscribe.';

-- Update the coach_profiles_full view to include the new column
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
  cp.free_trial_completed
FROM public.coach_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.id AND up.user_type::text = 'coach'::text;

COMMENT ON VIEW public.coach_profiles_full IS 'Complete coach profile view merging coach_profiles with user_profiles.';
