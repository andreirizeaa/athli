-- ============================================================================
-- Migration 217: Update expire_free_trials to create referral events
-- ============================================================================
-- When a referred coach's trial expires without converting to paid,
-- we need to:
-- 1. Update the referral status to 'trial_ended'
-- 2. Create a 'trial_ended' event in coach_referral_events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_free_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rows INTEGER;
  v_coach RECORD;
BEGIN
  -- Update coaches whose 30-day trial has expired.
  --
  -- Timezone resolution order:
  --   1. Coach's timezone (user_profiles where id = coach.id)
  --   2. 'UTC' fallback
  --
  -- We only mark trials as completed when:
  --   1. free_trial_completed is currently FALSE
  --   2. 30 days have elapsed since created_at
  --   3. It's just after midnight (hour = 0) in the coach's timezone
  --
  -- The midnight check ensures the trial expires at the start of day 31.

  -- First, get all coaches whose trials are expiring and process referrals
  FOR v_coach IN
    SELECT
      cp.id AS coach_id,
      up.name AS coach_name,
      up.profile_picture_url AS coach_picture,
      cr.id AS referral_id,
      cr.referrer_coach_id
    FROM public.coach_profiles cp
    JOIN public.user_profiles up ON up.id = cp.id AND up.user_type = 'coach'
    LEFT JOIN public.coach_referrals cr ON cr.referred_coach_id = cp.id AND cr.status = 'trial_started'
    WHERE
      cp.free_trial_completed = FALSE
      AND cp.created_at < NOW() - INTERVAL '30 days'
      AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) = 0
  LOOP
    -- If this coach was referred and still in trial_started status, update referral
    IF v_coach.referral_id IS NOT NULL THEN
      -- Update referral status
      UPDATE public.coach_referrals
      SET
        status = 'trial_ended',
        trial_ended_at = NOW(),
        -- Store coach info in case they delete their account later
        referred_coach_name = COALESCE(referred_coach_name, v_coach.coach_name),
        referred_coach_profile_picture_url = COALESCE(referred_coach_profile_picture_url, v_coach.coach_picture)
      WHERE id = v_coach.referral_id;

      -- Create trial_ended event
      INSERT INTO public.coach_referral_events (
        referral_id,
        referrer_coach_id,
        event_type,
        referred_coach_name,
        referred_coach_profile_picture_url,
        created_at
      ) VALUES (
        v_coach.referral_id,
        v_coach.referrer_coach_id,
        'trial_ended',
        COALESCE(v_coach.coach_name, 'Unknown'),
        v_coach.coach_picture,
        NOW()
      );
    END IF;
  END LOOP;

  -- Now do the actual update to mark trials as completed
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
  RETURN v_rows;
END;
$$;

-- ============================================================================
-- Summary:
-- When a referred coach's free trial expires (30 days without subscribing):
-- - Referral status changes from 'trial_started' to 'trial_ended'
-- - A 'trial_ended' event is created in coach_referral_events
-- - The coach's name/picture is stored for future reference
-- ============================================================================
