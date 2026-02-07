ALTER TABLE public.coach_client_assignments
  ADD COLUMN IF NOT EXISTS onboarding_executed_at TIMESTAMPTZ;
