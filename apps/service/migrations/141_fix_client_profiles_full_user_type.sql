-- ================================================
-- 141: Fix client_profiles_full to filter by user_type='client'
-- ================================================
-- The view was joining user_profiles without filtering by user_type,
-- causing duplicate/ambiguous rows when a user has both coach and client profiles
-- (e.g., demo client where coach_id = client_id).
-- This is the same fix applied to coach_clients_view in migration 139.
-- ================================================

DROP VIEW IF EXISTS public.client_profiles_full;

CREATE OR REPLACE VIEW public.client_profiles_full
WITH (security_invoker = true)
AS SELECT
  cp.client_id,
  up.email,
  COALESCE(up.name, '') AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email') AS signin_method,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  cp.created_at,
  cp.updated_at
FROM public.client_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.client_id AND up.user_type = 'client';

COMMENT ON VIEW public.client_profiles_full IS
'Complete client profile view merging client_profiles with user_profiles. Filters user_profiles by user_type=client to prevent duplicates when coach_id=client_id (demo clients).';

GRANT SELECT ON public.client_profiles_full TO authenticated;
