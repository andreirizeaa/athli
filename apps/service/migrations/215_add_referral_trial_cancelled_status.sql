-- ============================================================================
-- Migration 215: Add trial_cancelled status to referrals
-- ============================================================================
-- When a referred coach deletes their account during the free trial
-- (without converting to paid), we mark the referral as 'trial_cancelled'
-- so the referrer can see what happened.
-- ============================================================================

-- ─── Update the status CHECK constraint ──────────────────────────────────────

ALTER TABLE public.coach_referrals
DROP CONSTRAINT IF EXISTS coach_referrals_status_check;

ALTER TABLE public.coach_referrals
ADD CONSTRAINT coach_referrals_status_check
CHECK (status IN ('trial_started', 'trial_ended', 'trial_cancelled', 'converted'));

-- ─── Add trial_cancelled_at timestamp column ─────────────────────────────────

ALTER TABLE public.coach_referrals
ADD COLUMN IF NOT EXISTS trial_cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.coach_referrals.trial_cancelled_at IS 'When the referred coach deleted their account during the trial period.';

-- ============================================================================
-- Status meanings:
--   - trial_started: Referred coach signed up and started free trial
--   - trial_ended: Referred coach's trial expired without subscribing
--   - trial_cancelled: Referred coach deleted their account during trial
--   - converted: Referred coach subscribed to a paid plan (credit earned!)
-- ============================================================================
