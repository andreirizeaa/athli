-- 1. Add onboarding_id column to coach_unique_codes (nullable = default/general invite code)
ALTER TABLE public.coach_unique_codes
  ADD COLUMN IF NOT EXISTS onboarding_id UUID REFERENCES public.coach_onboardings(id) ON DELETE SET NULL;

-- 2. Add onboarding_id column to coach_client_assignments (for manual invites with onboarding)
ALTER TABLE public.coach_client_assignments
  ADD COLUMN IF NOT EXISTS onboarding_id UUID REFERENCES public.coach_onboardings(id) ON DELETE SET NULL;

-- 3. Regenerate existing codes to 12-char length using md5-based approach
UPDATE public.coach_unique_codes
SET code = upper(substring(md5(random()::text || clock_timestamp()::text || coach_id::text) from 1 for 12))
WHERE LENGTH(code) < 12;
