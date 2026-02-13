-- ============================================================================
-- Migration 207: Coach Referral System
-- ============================================================================
-- Implements a referral system where:
-- 1. A coach can refer another coach using their unique_code
-- 2. When the referred coach subscribes (first payment), both get $20 credit
-- 3. Credit is applied via Stripe customer balance (negative = credit)
--
-- Referral statuses (shown to referring coach):
--   - trial_started: Referred coach signed up and started free trial
--   - trial_ended: Referred coach's trial expired without subscribing
--   - converted: Referred coach subscribed to a paid plan (credit earned!)
-- ============================================================================

-- ─── Add referrer tracking to coach_profiles ───────────────────────────────

ALTER TABLE public.coach_profiles
ADD COLUMN IF NOT EXISTS referrer_coach_id UUID REFERENCES public.coach_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coach_profiles_referrer
ON public.coach_profiles(referrer_coach_id)
WHERE referrer_coach_id IS NOT NULL;

COMMENT ON COLUMN public.coach_profiles.referrer_coach_id IS 'The coach who referred this coach. Set during signup if a referral code was used.';

-- ─── Create referrals tracking table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The coach who made the referral
    referrer_coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,

    -- The coach who was referred
    referred_coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,

    -- Status tracking (timeline events for the referring coach to see)
    -- trial_started: Coach signed up with referral code
    -- trial_ended: Trial expired without payment
    -- converted: Coach subscribed (both parties get credit)
    status TEXT NOT NULL DEFAULT 'trial_started' CHECK (status IN ('trial_started', 'trial_ended', 'converted')),

    -- Credit tracking (in cents) - $20 = 2000 cents
    referrer_credit_cents INTEGER NOT NULL DEFAULT 0,
    referred_credit_cents INTEGER NOT NULL DEFAULT 0,

    -- When credits were applied
    referrer_credit_applied_at TIMESTAMPTZ,
    referred_credit_applied_at TIMESTAMPTZ,

    -- Event timestamps (for timeline display)
    trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    trial_ended_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent duplicate referrals
    UNIQUE (referred_coach_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_referrals_referrer
ON public.coach_referrals(referrer_coach_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_referrals_status
ON public.coach_referrals(status);

COMMENT ON TABLE public.coach_referrals IS 'Tracks coach-to-coach referrals and credit earned. Used for the Refer & Earn feature.';

-- ─── RLS Policies ──────────────────────────────────────────────────────────

ALTER TABLE public.coach_referrals ENABLE ROW LEVEL SECURITY;

-- Referrers can see their own referrals
CREATE POLICY "Coaches can view their referrals"
ON public.coach_referrals
FOR SELECT
TO authenticated
USING (referrer_coach_id = (SELECT auth.uid()));

-- Service role can do everything
CREATE POLICY "Service role full access"
ON public.coach_referrals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── Update coach_profiles_full view ───────────────────────────────────────

DROP VIEW IF EXISTS public.coach_profiles_full;

CREATE OR REPLACE VIEW public.coach_profiles_full WITH (security_invoker = true) AS
SELECT
  cp.id,
  up.email,
  COALESCE(up.name, ''::character varying) AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email'::character varying) AS signin_method,
  cp.is_active,
  cp.is_archived,
  cp.status,
  up.timezone,
  cp.created_at,
  cp.updated_at,
  cp.free_trial_completed,
  cp.referrer_coach_id
FROM public.coach_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.id AND up.user_type::text = 'coach'::text;

COMMENT ON VIEW public.coach_profiles_full IS 'Complete coach profile view merging coach_profiles with user_profiles.';

-- ─── Trigger to auto-create referral record ────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_coach_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- If a referrer is set, create a referral record (trial_started event)
    IF NEW.referrer_coach_id IS NOT NULL AND (OLD IS NULL OR OLD.referrer_coach_id IS NULL) THEN
        INSERT INTO public.coach_referrals (
            referrer_coach_id,
            referred_coach_id,
            status,
            trial_started_at
        ) VALUES (
            NEW.referrer_coach_id,
            NEW.id,
            'trial_started',
            NOW()
        )
        ON CONFLICT (referred_coach_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_coach_referral ON public.coach_profiles;
CREATE TRIGGER trigger_coach_referral
    AFTER INSERT OR UPDATE OF referrer_coach_id ON public.coach_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_coach_referral();

-- ─── Updated_at trigger ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_coach_referrals_updated_at ON public.coach_referrals;
CREATE TRIGGER update_coach_referrals_updated_at
    BEFORE UPDATE ON public.coach_referrals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Grants ────────────────────────────────────────────────────────────────

GRANT SELECT ON public.coach_referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.coach_referrals TO service_role;

-- ─── Update expire_free_trials to also mark referrals as trial_ended ───────
-- This replaces the function from migration 205 to also handle referral status

CREATE OR REPLACE FUNCTION public.expire_free_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rows INTEGER;
  v_referral_rows INTEGER;
BEGIN
  -- Update coaches whose 30-day trial has expired.
  -- Only mark trials as completed when:
  --   1. free_trial_completed is currently FALSE
  --   2. 30 days have elapsed since created_at
  --   3. It's just after midnight (hour = 0) in the coach's timezone

  UPDATE public.coach_profiles cp
  SET free_trial_completed = TRUE
  FROM public.user_profiles up
  WHERE
    up.id = cp.id
    AND up.user_type = 'coach'
    AND cp.free_trial_completed = FALSE
    AND cp.created_at < NOW() - INTERVAL '30 days'
    AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) = 0;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Also update referral status to 'trial_ended' for referred coaches
  -- whose trial just expired (and who haven't converted yet)
  UPDATE public.coach_referrals cr
  SET
    status = 'trial_ended',
    trial_ended_at = NOW()
  FROM public.coach_profiles cp
  WHERE
    cr.referred_coach_id = cp.id
    AND cr.status = 'trial_started'  -- Only if still in trial_started status
    AND cp.free_trial_completed = TRUE  -- Trial just expired
    AND cr.converted_at IS NULL;  -- Haven't converted to paid

  GET DIAGNOSTICS v_referral_rows = ROW_COUNT;

  IF v_referral_rows > 0 THEN
    RAISE NOTICE 'expire_free_trials: marked % referrals as trial_ended', v_referral_rows;
  END IF;

  RETURN v_rows;
END;
$$;
