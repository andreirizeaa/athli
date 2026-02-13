-- ============================================================================
-- Migration 216: Fix referrals to preserve history when referred coach deletes account
-- ============================================================================
-- Changes:
-- 1. Store referred coach name and profile picture directly (so we have it if they delete)
-- 2. Change FK to SET NULL instead of CASCADE (preserve referral record)
-- 3. Create coach_referral_events table for activity timeline
-- ============================================================================

-- ─── Add columns to store referred coach info directly ───────────────────────

ALTER TABLE public.coach_referrals
ADD COLUMN IF NOT EXISTS referred_coach_name TEXT,
ADD COLUMN IF NOT EXISTS referred_coach_profile_picture_url TEXT;

COMMENT ON COLUMN public.coach_referrals.referred_coach_name IS 'Stored copy of referred coach name (preserved if they delete account)';
COMMENT ON COLUMN public.coach_referrals.referred_coach_profile_picture_url IS 'Stored copy of referred coach profile picture (preserved if they delete account)';

-- ─── Change FK to SET NULL instead of CASCADE ────────────────────────────────

ALTER TABLE public.coach_referrals
DROP CONSTRAINT IF EXISTS coach_referrals_referred_coach_id_fkey;

-- Make the column nullable so SET NULL can work
ALTER TABLE public.coach_referrals
ALTER COLUMN referred_coach_id DROP NOT NULL;

ALTER TABLE public.coach_referrals
ADD CONSTRAINT coach_referrals_referred_coach_id_fkey
FOREIGN KEY (referred_coach_id) REFERENCES public.coach_profiles(id) ON DELETE SET NULL;

-- ─── Backfill existing referrals with coach info ─────────────────────────────

UPDATE public.coach_referrals cr
SET
  referred_coach_name = up.name,
  referred_coach_profile_picture_url = up.profile_picture_url
FROM public.user_profiles up
WHERE cr.referred_coach_id = up.id
  AND up.user_type = 'coach'
  AND cr.referred_coach_name IS NULL;

-- ─── Create referral events table for activity timeline ──────────────────────

CREATE TABLE IF NOT EXISTS public.coach_referral_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to the referral
    referral_id UUID NOT NULL REFERENCES public.coach_referrals(id) ON DELETE CASCADE,

    -- The coach who made the referral (denormalized for easy querying)
    referrer_coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,

    -- Event type matches referral statuses
    event_type TEXT NOT NULL CHECK (event_type IN ('trial_started', 'trial_ended', 'trial_cancelled', 'converted')),

    -- Store referred coach info directly (in case they delete their account)
    referred_coach_name TEXT NOT NULL,
    referred_coach_profile_picture_url TEXT,

    -- Credit info (only for 'converted' events)
    credit_cents INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_referral_events_referrer
ON public.coach_referral_events(referrer_coach_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_referral_events_referral
ON public.coach_referral_events(referral_id);

COMMENT ON TABLE public.coach_referral_events IS 'Activity timeline for referrals. One row per status change event.';

-- ─── RLS Policies for events table ───────────────────────────────────────────

ALTER TABLE public.coach_referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their referral events"
ON public.coach_referral_events
FOR SELECT
TO authenticated
USING (referrer_coach_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access on referral events"
ON public.coach_referral_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT SELECT ON public.coach_referral_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_referral_events TO service_role;

-- ─── Backfill events from existing referrals ─────────────────────────────────

-- Insert trial_started events for all existing referrals
INSERT INTO public.coach_referral_events (
    referral_id,
    referrer_coach_id,
    event_type,
    referred_coach_name,
    referred_coach_profile_picture_url,
    created_at
)
SELECT
    cr.id,
    cr.referrer_coach_id,
    'trial_started',
    COALESCE(cr.referred_coach_name, up.name, 'Unknown'),
    COALESCE(cr.referred_coach_profile_picture_url, up.profile_picture_url),
    cr.trial_started_at
FROM public.coach_referrals cr
LEFT JOIN public.user_profiles up ON up.id = cr.referred_coach_id AND up.user_type = 'coach'
WHERE cr.trial_started_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert trial_ended events
INSERT INTO public.coach_referral_events (
    referral_id,
    referrer_coach_id,
    event_type,
    referred_coach_name,
    referred_coach_profile_picture_url,
    created_at
)
SELECT
    cr.id,
    cr.referrer_coach_id,
    'trial_ended',
    COALESCE(cr.referred_coach_name, up.name, 'Unknown'),
    COALESCE(cr.referred_coach_profile_picture_url, up.profile_picture_url),
    cr.trial_ended_at
FROM public.coach_referrals cr
LEFT JOIN public.user_profiles up ON up.id = cr.referred_coach_id AND up.user_type = 'coach'
WHERE cr.trial_ended_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert trial_cancelled events
INSERT INTO public.coach_referral_events (
    referral_id,
    referrer_coach_id,
    event_type,
    referred_coach_name,
    referred_coach_profile_picture_url,
    created_at
)
SELECT
    cr.id,
    cr.referrer_coach_id,
    'trial_cancelled',
    COALESCE(cr.referred_coach_name, up.name, 'Unknown'),
    COALESCE(cr.referred_coach_profile_picture_url, up.profile_picture_url),
    cr.trial_cancelled_at
FROM public.coach_referrals cr
LEFT JOIN public.user_profiles up ON up.id = cr.referred_coach_id AND up.user_type = 'coach'
WHERE cr.trial_cancelled_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert converted events
INSERT INTO public.coach_referral_events (
    referral_id,
    referrer_coach_id,
    event_type,
    referred_coach_name,
    referred_coach_profile_picture_url,
    credit_cents,
    created_at
)
SELECT
    cr.id,
    cr.referrer_coach_id,
    'converted',
    COALESCE(cr.referred_coach_name, up.name, 'Unknown'),
    COALESCE(cr.referred_coach_profile_picture_url, up.profile_picture_url),
    cr.referrer_credit_cents,
    cr.converted_at
FROM public.coach_referrals cr
LEFT JOIN public.user_profiles up ON up.id = cr.referred_coach_id AND up.user_type = 'coach'
WHERE cr.converted_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── Update the handle_coach_referral trigger to also create event ───────────

CREATE OR REPLACE FUNCTION public.handle_coach_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_referral_id UUID;
    v_coach_name TEXT;
    v_coach_picture TEXT;
BEGIN
    -- If a referrer is set, create a referral record (trial_started event)
    IF NEW.referrer_coach_id IS NOT NULL AND (OLD IS NULL OR OLD.referrer_coach_id IS NULL) THEN
        -- Get the referred coach's info
        SELECT name, profile_picture_url INTO v_coach_name, v_coach_picture
        FROM public.user_profiles
        WHERE id = NEW.id AND user_type = 'coach';

        -- Create the referral record
        INSERT INTO public.coach_referrals (
            referrer_coach_id,
            referred_coach_id,
            referred_coach_name,
            referred_coach_profile_picture_url,
            status,
            trial_started_at
        ) VALUES (
            NEW.referrer_coach_id,
            NEW.id,
            v_coach_name,
            v_coach_picture,
            'trial_started',
            NOW()
        )
        ON CONFLICT (referred_coach_id) DO NOTHING
        RETURNING id INTO v_referral_id;

        -- Create the trial_started event
        IF v_referral_id IS NOT NULL THEN
            INSERT INTO public.coach_referral_events (
                referral_id,
                referrer_coach_id,
                event_type,
                referred_coach_name,
                referred_coach_profile_picture_url,
                created_at
            ) VALUES (
                v_referral_id,
                NEW.referrer_coach_id,
                'trial_started',
                COALESCE(v_coach_name, 'Unknown'),
                v_coach_picture,
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- Summary:
-- - coach_referrals: One row per referral, stores current status + coach info
-- - coach_referral_events: Activity timeline, one row per status change
-- - When referred coach deletes account: referral preserved, referred_coach_id set to NULL
-- ============================================================================
