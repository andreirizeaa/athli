-- ================================================
-- 139: Fix coach_clients_view to filter by user_type='client'
-- ================================================
-- The view was joining user_profiles without filtering by user_type,
-- causing duplicate rows when a user has both coach and client profiles
-- (e.g., demo client where coach_id = client_id).
-- ================================================

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
