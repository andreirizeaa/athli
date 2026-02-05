-- ================================================
-- 030: Add Invitation Token to coach_client_assignments
-- ================================================

-- 1. Drop dependent view first
DROP VIEW IF EXISTS public.coach_clients_view CASCADE;

-- 2. Add invitation_token column or update type if it already exists as UUID
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coach_client_assignments' AND column_name = 'invitation_token'
  ) THEN
    ALTER TABLE public.coach_client_assignments ADD COLUMN invitation_token VARCHAR(8);
  ELSIF (
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'coach_client_assignments' AND column_name = 'invitation_token'
  ) = 'uuid' THEN
    ALTER TABLE public.coach_client_assignments ALTER COLUMN invitation_token TYPE VARCHAR(8) USING invitation_token::text;
  END IF;
END $$;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cca_invitation_token ON public.coach_client_assignments(invitation_token);

-- 3. Update coach_clients_view to include invitation_token
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
  cca.invitation_token, -- ADDED
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
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;
