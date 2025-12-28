-- ================================================
-- Filter Archived Clients from coach_clients_view
-- ================================================
-- This migration updates the coach_clients_view to exclude
-- archived clients at the database level, removing the need
-- for application-level filtering.
-- ================================================

DROP VIEW IF EXISTS public.coach_clients_view CASCADE;

CREATE OR REPLACE VIEW public.coach_clients_view AS
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
  -- Client personal data from client_profiles
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.city,
  cp.unit_system,
  -- Client identity from user_profiles or auth.users (fallback)
  COALESCE(cp.name, up.name, au.raw_user_meta_data->>'name', au.email) AS full_name,
  COALESCE(cp.email, up.email, au.email) AS email,
  COALESCE(cp.profile_picture_url, up.profile_picture_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  -- Training summary
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id
LEFT JOIN auth.users au ON au.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id
-- Only include non-archived clients
WHERE cca.is_archived = false;

-- ================================================
-- Migration Complete
-- ================================================
-- The view now automatically filters out archived clients,
-- so application code no longer needs to filter manually.
-- ================================================
