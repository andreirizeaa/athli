-- ================================================
-- Create coach_clients_all_view for Including Archived Clients
-- ================================================
-- This migration creates a new view that includes ALL clients
-- (both active and archived) for use in the archived clients
-- endpoint and "Show archived clients" feature.
--
-- The existing coach_clients_view remains unchanged and continues
-- to filter out archived clients for normal operations.
-- ================================================

-- Create the new view that includes all clients (no is_archived filter)
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
  -- Client personal data from client_profiles
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  -- Client identity from user_profiles or auth.users (fallback)
  -- Filter user_profiles to 'client' type to avoid duplicates when user has multiple profiles
  COALESCE(up.name, au.raw_user_meta_data->>'name', au.email) AS full_name,
  COALESCE(up.email, au.email) AS email,
  COALESCE(up.profile_picture_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  -- Training summary
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
-- Note: No WHERE clause - includes all clients regardless of is_archived status

-- ================================================
-- Migration Complete
-- ================================================
-- The new coach_clients_all_view includes all clients.
-- Use this view when you need to fetch archived clients.
-- The existing coach_clients_view still filters to active only.
-- ================================================
