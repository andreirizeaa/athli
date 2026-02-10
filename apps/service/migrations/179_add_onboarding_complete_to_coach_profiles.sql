-- Add onboarding_complete flag to coach_profiles
ALTER TABLE coach_profiles
ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
