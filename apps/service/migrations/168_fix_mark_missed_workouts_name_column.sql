-- ================================================
-- 168: Fix mark_missed_workouts() name column reference
-- ================================================
-- The function was referencing up.first_name and up.last_name which don't exist.
-- user_profiles only has a 'name' field.
-- Also added user_type = 'client' filter since the same id can exist for both client and coach.
-- ================================================

CREATE OR REPLACE FUNCTION public.mark_missed_workouts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  -- Insert a 'missed' row for every workout that exists in client_training
  -- but has no corresponding row in client_training_history.
  --
  -- Timezone resolution order:
  --   1. Client's own timezone (user_profiles where user_type='client')
  --   2. Coach's timezone (user_profiles where id = coach_id)
  --   3. 'UTC' fallback
  --
  -- We look back 2 days (yesterday + day before) as a catch-up window
  -- in case a previous cron run failed.
  --
  -- The ON CONFLICT DO NOTHING makes this fully idempotent.

  WITH missed AS (
    INSERT INTO public.client_training_history
      (client_id, coach_id, date, workout_id, status)
    SELECT
      ct.client_id,
      ct.coach_id,
      ct.date,
      wk.workout_id,
      'missed'
    FROM public.client_training ct
    LEFT JOIN public.user_profiles client_up
      ON client_up.id = ct.client_id AND client_up.user_type = 'client'
    LEFT JOIN public.user_profiles coach_up
      ON coach_up.id = ct.coach_id AND coach_up.user_type = 'coach'
    CROSS JOIN LATERAL jsonb_object_keys(ct.training_data) AS wk(workout_id)
    LEFT JOIN public.client_training_history cth
      ON  cth.client_id  = ct.client_id
      AND cth.coach_id   = ct.coach_id
      AND cth.date       = ct.date
      AND cth.workout_id = wk.workout_id
    WHERE
      ct.date < (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date
      AND ct.date >= (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date - 2
      AND cth.client_id IS NULL
      AND ct.training_data != '{}'::jsonb
    ON CONFLICT (client_id, coach_id, date, workout_id) DO NOTHING
    RETURNING client_id, coach_id, date, workout_id
  )
  -- Create a coach notification for each missed workout
  INSERT INTO public.coach_notifications
    (coach_id, client_id, notification_type, title, description, metadata)
  SELECT
    m.coach_id,
    m.client_id,
    'workout_missed',
    'Workout missed',
    COALESCE(up.name, 'Client') || ' missed a workout on ' || to_char(m.date, 'Mon DD, YYYY'),
    jsonb_build_object('workout_id', m.workout_id, 'date', m.date)
  FROM missed m
  LEFT JOIN public.user_profiles up ON up.id = m.client_id AND up.user_type = 'client';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;
