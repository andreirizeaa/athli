-- Add is_active column to coach_onboardings table
-- This allows coaches to publish/unpublish onboarding flows

ALTER TABLE public.coach_onboardings
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering active onboardings
CREATE INDEX idx_coach_onboardings_active ON public.coach_onboardings (coach_id, is_active) WHERE is_active = true;
