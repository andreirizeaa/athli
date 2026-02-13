-- ============================================================================
-- Migration 219: Update expire_free_trials to downgrade entitlements
-- ============================================================================
-- When a coach's free trial expires, we need to:
-- 1. Set free_trial_completed = TRUE on coach_profiles
-- 2. Update coach_entitlements to starter plan (5 clients, no addons)
-- 3. Update referral status to 'trial_ended' and create event (from migration 217)
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
  -- Process coaches whose 30-day trial has expired.
  --
  -- Timezone resolution:
  --   1. Coach's timezone (user_profiles where id = coach.id)
  --   2. 'UTC' fallback
  --
  -- We only process when:
  --   1. free_trial_completed is currently FALSE
  --   2. 30 days have elapsed since created_at
  --   3. It's just after midnight (hour = 0) in the coach's timezone
  --
  -- The midnight check ensures the trial expires at the start of day 31.

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
    -- 1. Mark trial as completed on coach_profiles
    UPDATE public.coach_profiles
    SET free_trial_completed = TRUE
    WHERE id = v_coach.coach_id;

    -- 2. Downgrade entitlements to starter plan
    UPDATE public.coach_entitlements
    SET
      plan_type = 'starter',
      client_limit = 5,
      -- Disable all paid features
      has_ai_workout_builder = false,
      has_custom_exercises = false,
      has_questionnaires = false,
      has_habits_metrics = false,
      storage_limit_gb = 0,
      has_broadcast_messaging = false,
      has_ai_todo_list = false,
      has_priority_support = false,
      -- Disable all add-ons
      has_automations = false,
      has_ai_assistant = false,
      has_payments = false,
      -- Update status
      subscription_status = 'active',
      is_trial = false,
      trial_ends_at = NULL,
      updated_at = NOW()
    WHERE coach_id = v_coach.coach_id;

    -- 3. If this coach was referred and still in trial_started status, update referral
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

  -- Get count of processed coaches
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- ============================================================================
-- Summary:
-- When a coach's free trial expires:
-- 1. coach_profiles.free_trial_completed = TRUE
-- 2. coach_entitlements downgraded to starter (5 clients, no features, no addons)
-- 3. If referred: referral status → 'trial_ended', event created
-- ============================================================================
