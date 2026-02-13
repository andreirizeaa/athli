-- ============================================================================
-- Migration 222: Preserve referral history when referrer coach deletes account
-- ============================================================================
-- Problem:
-- When Coach A (referrer) deletes their account, Coach B (referred) loses all
-- referral history because referrer_coach_id has ON DELETE CASCADE.
--
-- Solution:
-- 1. Change referrer_coach_id FK to SET NULL instead of CASCADE
-- 2. Update RLS policies so referred coaches can also view their referral record
-- ============================================================================

-- ─── coach_referrals: Change referrer_coach_id to SET NULL ─────────────────

-- Drop the existing FK constraint
ALTER TABLE public.coach_referrals
DROP CONSTRAINT IF EXISTS coach_referrals_referrer_coach_id_fkey;

-- Make the column nullable
ALTER TABLE public.coach_referrals
ALTER COLUMN referrer_coach_id DROP NOT NULL;

-- Add the new FK with SET NULL
ALTER TABLE public.coach_referrals
ADD CONSTRAINT coach_referrals_referrer_coach_id_fkey
FOREIGN KEY (referrer_coach_id) REFERENCES public.coach_profiles(id) ON DELETE SET NULL;

-- ─── coach_referral_events: Change referrer_coach_id to SET NULL ───────────

-- Drop the existing FK constraint
ALTER TABLE public.coach_referral_events
DROP CONSTRAINT IF EXISTS coach_referral_events_referrer_coach_id_fkey;

-- Make the column nullable
ALTER TABLE public.coach_referral_events
ALTER COLUMN referrer_coach_id DROP NOT NULL;

-- Add the new FK with SET NULL
ALTER TABLE public.coach_referral_events
ADD CONSTRAINT coach_referral_events_referrer_coach_id_fkey
FOREIGN KEY (referrer_coach_id) REFERENCES public.coach_profiles(id) ON DELETE SET NULL;

-- ─── Add referrer info to events table (like we did for referrals) ─────────

ALTER TABLE public.coach_referral_events
ADD COLUMN IF NOT EXISTS referrer_coach_name TEXT,
ADD COLUMN IF NOT EXISTS referrer_coach_profile_picture_url TEXT;

-- Backfill existing events with referrer info
UPDATE public.coach_referral_events cre
SET
  referrer_coach_name = up.name,
  referrer_coach_profile_picture_url = up.profile_picture_url
FROM public.user_profiles up
WHERE cre.referrer_coach_id = up.id
  AND up.user_type = 'coach'
  AND cre.referrer_coach_name IS NULL;

-- ─── Update RLS policies to allow referred coaches to view ─────────────────

-- Drop existing select policy on coach_referrals
DROP POLICY IF EXISTS "Coaches can view their referrals" ON public.coach_referrals;

-- Create new policy that allows both referrers AND referred coaches to view
CREATE POLICY "Coaches can view their referrals"
ON public.coach_referrals
FOR SELECT
TO authenticated
USING (
    referrer_coach_id = (SELECT auth.uid())
    OR referred_coach_id = (SELECT auth.uid())
);

-- Drop existing select policy on coach_referral_events
DROP POLICY IF EXISTS "Coaches can view their referral events" ON public.coach_referral_events;

-- Create new policy that allows referred coaches to view their events too
-- We need to join through coach_referrals to check referred_coach_id
CREATE POLICY "Coaches can view their referral events"
ON public.coach_referral_events
FOR SELECT
TO authenticated
USING (
    referrer_coach_id = (SELECT auth.uid())
    OR referral_id IN (
        SELECT id FROM public.coach_referrals
        WHERE referred_coach_id = (SELECT auth.uid())
    )
);

-- ─── Update trigger to also store referrer info in events ──────────────────

CREATE OR REPLACE FUNCTION public.handle_coach_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_referral_id UUID;
    v_referred_coach_name TEXT;
    v_referred_coach_picture TEXT;
    v_referrer_coach_name TEXT;
    v_referrer_coach_picture TEXT;
BEGIN
    -- If a referrer is set, create a referral record (trial_started event)
    IF NEW.referrer_coach_id IS NOT NULL AND (OLD IS NULL OR OLD.referrer_coach_id IS NULL) THEN
        -- Get the referred coach's info (the new coach signing up)
        SELECT name, profile_picture_url INTO v_referred_coach_name, v_referred_coach_picture
        FROM public.user_profiles
        WHERE id = NEW.id AND user_type = 'coach';

        -- Get the referrer coach's info (Coach A who shared the link)
        SELECT name, profile_picture_url INTO v_referrer_coach_name, v_referrer_coach_picture
        FROM public.user_profiles
        WHERE id = NEW.referrer_coach_id AND user_type = 'coach';

        -- Create the referral record
        INSERT INTO public.coach_referrals (
            referrer_coach_id,
            referred_coach_id,
            referred_coach_name,
            referred_coach_profile_picture_url,
            referrer_coach_name,
            referrer_coach_profile_picture_url,
            status,
            trial_started_at
        ) VALUES (
            NEW.referrer_coach_id,
            NEW.id,
            v_referred_coach_name,
            v_referred_coach_picture,
            v_referrer_coach_name,
            v_referrer_coach_picture,
            'trial_started',
            NOW()
        )
        ON CONFLICT (referred_coach_id) DO NOTHING
        RETURNING id INTO v_referral_id;

        -- Create the trial_started event (now with referrer info)
        IF v_referral_id IS NOT NULL THEN
            INSERT INTO public.coach_referral_events (
                referral_id,
                referrer_coach_id,
                event_type,
                referred_coach_name,
                referred_coach_profile_picture_url,
                referrer_coach_name,
                referrer_coach_profile_picture_url,
                created_at
            ) VALUES (
                v_referral_id,
                NEW.referrer_coach_id,
                'trial_started',
                COALESCE(v_referred_coach_name, 'Unknown'),
                v_referred_coach_picture,
                v_referrer_coach_name,
                v_referrer_coach_picture,
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- Summary:
-- - referrer_coach_id now uses SET NULL instead of CASCADE on both tables
-- - Referrer info is stored in events table (for history preservation)
-- - RLS policies updated so referred coaches can view their referral records
-- - When Coach A deletes their account:
--   - Referral record preserved with referrer_coach_id = NULL
--   - Referrer name/picture still available from stored columns
--   - Coach B can still see their referral history
-- ============================================================================
