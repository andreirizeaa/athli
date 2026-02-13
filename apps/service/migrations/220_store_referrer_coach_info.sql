-- ============================================================================
-- Migration 220: Store referrer coach info in referrals
-- ============================================================================
-- When Coach A refers Coach B, we need to store Coach A's name and profile
-- picture so that if Coach A deletes their account, Coach B can still see
-- who referred them.
-- ============================================================================

-- Add columns to store referrer coach info
ALTER TABLE public.coach_referrals
ADD COLUMN IF NOT EXISTS referrer_coach_name TEXT,
ADD COLUMN IF NOT EXISTS referrer_coach_profile_picture_url TEXT;

COMMENT ON COLUMN public.coach_referrals.referrer_coach_name IS 'Stored copy of referrer coach name (preserved if they delete account)';
COMMENT ON COLUMN public.coach_referrals.referrer_coach_profile_picture_url IS 'Stored copy of referrer coach profile picture (preserved if they delete account)';

-- Backfill existing referrals with referrer coach info
UPDATE public.coach_referrals cr
SET
  referrer_coach_name = up.name,
  referrer_coach_profile_picture_url = up.profile_picture_url
FROM public.user_profiles up
WHERE cr.referrer_coach_id = up.id
  AND up.user_type = 'coach'
  AND cr.referrer_coach_name IS NULL;

-- ============================================================================
-- Update the handle_coach_referral trigger to also store referrer info
-- ============================================================================

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
                COALESCE(v_referred_coach_name, 'Unknown'),
                v_referred_coach_picture,
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- Summary:
-- - Added referrer_coach_name and referrer_coach_profile_picture_url columns
-- - Updated trigger to store referrer info when referral is created
-- - Backfilled existing referrals with referrer info
-- ============================================================================
