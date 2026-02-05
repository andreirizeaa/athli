-- Migration 040: Fix broken athletes_grid_view (Corrected)
-- Purpose: Recreate athletes_grid_view which was referencing dropped columns.
-- Correctly sourcing derived fields from coach_client_assignments (cca).

DROP VIEW IF EXISTS public.athletes_grid_view CASCADE;

CREATE OR REPLACE VIEW public.athletes_grid_view
WITH (security_invoker = true)
AS
SELECT
  cp.client_id AS id,
  up.name,
  up.profile_picture_url AS avatar,
  up.email,
  
  -- Training Summary Data
  cts.last_activity,
  COALESCE(cts.last_7_days_training_completed, 0)  AS "last7DaysTraining",
  COALESCE(cts.last_30_days_training_completed, 0) AS "last30DaysTraining",
  
  -- Profile Data
  cp.phone,
  cp.country,
  cp.city,
  cp.gender,
  cp.height_cm,
  
  -- Moved to Assignments (cca)
  cca.category,
  cca.is_active,
  cca.is_archived,
  (cca.status = 'connected') AS connected,
  cca.status AS "connectionStatus",
  
  -- Computed/Derived from Assignments
  CASE WHEN cca.connected_at IS NOT NULL THEN (CURRENT_DATE - cca.connected_at::DATE) ELSE 0 END AS "clientFor",
  CASE WHEN cp.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(cp.date_of_birth))::INTEGER ELSE NULL END AS age,
  
  -- Coach ID derived from Assignments
  cca.coach_id,
  
  cp.created_at,
  cp.updated_at
FROM public.client_profiles cp
LEFT JOIN public.user_profiles up ON cp.client_id = up.id
LEFT JOIN public.client_training_summary cts ON cp.client_id = cts.client_id
LEFT JOIN public.coach_client_assignments cca ON cp.client_id = cca.client_id;
