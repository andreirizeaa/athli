-- ================================================
-- 215: Add timezone to coach_clients_view and coach_clients_all_view
-- ================================================
-- Adding timezone from user_profiles to both views so that
-- the /clients/detail endpoint returns all needed profile data.
-- ================================================

-- Update coach_clients_view to include timezone
DROP VIEW IF EXISTS public.coach_clients_view;

CREATE VIEW public.coach_clients_view
WITH (security_invoker = true)
AS SELECT
  cca.coach_id,
  cca.client_id,
  cca.category,
  cca.status,
  cca.is_active,
  cca.is_archived,
  cca.invitation_sent_at,
  cca.connected_at,
  cca.invitation_token,
  cca.onboarding_id,
  cca.created_at,
  cca.updated_at,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  COALESCE(up.name, up.email) AS full_name,
  up.email,
  up.profile_picture_url AS avatar_url,
  up.timezone,
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

COMMENT ON VIEW public.coach_clients_view IS
'Coach view of all their clients with merged profile data. Filters user_profiles by user_type=client to prevent duplicates when coach_id=client_id (demo clients).';

GRANT SELECT ON public.coach_clients_view TO authenticated;

-- Update coach_clients_all_view to include timezone
DROP VIEW IF EXISTS public.coach_clients_all_view;

CREATE OR REPLACE VIEW public.coach_clients_all_view AS
SELECT
  cca.coach_id,
  cca.client_id,
  cca.category,
  cca.status,
  cca.is_active,
  cca.is_archived,
  cca.invitation_sent_at,
  cca.connected_at,
  cca.created_at,
  cca.updated_at,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  COALESCE(up.name, au.raw_user_meta_data->>'name', au.email) AS full_name,
  COALESCE(up.email, au.email) AS email,
  COALESCE(up.profile_picture_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  up.timezone,
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
LEFT JOIN auth.users au ON au.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

-- ================================================
-- Migration Complete
-- ================================================
