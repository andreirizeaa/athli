-- ================================================
-- 143: Mark Missed Workouts via pg_cron
-- ================================================
-- Runs every hour. For each client, computes "today" in their timezone
-- (from user_profiles.timezone, falls back to their coach's timezone, then UTC).
-- Any workouts from yesterday (or the day before, as catch-up) that have
-- no row in client_training_history get inserted with status = 'missed'.
--
-- Idempotent via ON CONFLICT DO NOTHING.
-- ================================================

-- ============================================================================
-- 1. Log table to track cron runs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.missed_workout_cron_log (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  rows_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mwcl_started_at
  ON public.missed_workout_cron_log (started_at DESC);

-- RLS
ALTER TABLE public.missed_workout_cron_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage missed workout log"
  ON public.missed_workout_cron_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. Core function: mark_missed_workouts()
-- ============================================================================
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

  INSERT INTO public.client_training_history
    (client_id, coach_id, date, workout_id, status)
  SELECT
    ct.client_id,
    ct.coach_id,
    ct.date,
    wk.workout_id,
    'missed'
  FROM public.client_training ct
  -- Client's timezone
  LEFT JOIN public.user_profiles client_up
    ON client_up.id = ct.client_id AND client_up.user_type = 'client'
  -- Coach's timezone as fallback
  LEFT JOIN public.user_profiles coach_up
    ON coach_up.id = ct.coach_id AND coach_up.user_type = 'coach'
  CROSS JOIN LATERAL jsonb_object_keys(ct.training_data) AS wk(workout_id)
  LEFT JOIN public.client_training_history cth
    ON  cth.client_id  = ct.client_id
    AND cth.coach_id   = ct.coach_id
    AND cth.date       = ct.date
    AND cth.workout_id = wk.workout_id
  WHERE
    -- Only process dates before "today" in the resolved timezone
    ct.date < (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date
    -- Limit lookback to 2 days to keep the query fast
    AND ct.date >= (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date - 2
    -- No existing history row = workout was never started
    AND cth.client_id IS NULL
    -- Skip empty training_data objects
    AND ct.training_data != '{}'::jsonb
  ON CONFLICT (client_id, coach_id, date, workout_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- ============================================================================
-- 3. Wrapper called by pg_cron (handles logging)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_mark_missed_workouts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id UUID;
  v_rows   INTEGER;
BEGIN
  -- Create log entry
  INSERT INTO public.missed_workout_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  -- Run the core logic
  v_rows := public.mark_missed_workouts();

  -- Update log with result
  UPDATE public.missed_workout_cron_log
  SET completed_at = now(),
      rows_inserted = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'mark_missed_workouts: inserted % rows', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the cron job
  UPDATE public.missed_workout_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'mark_missed_workouts failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_missed_workouts() TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_mark_missed_workouts() TO service_role;

-- ============================================================================
-- 4. Schedule pg_cron job (runs at :05 past every hour)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    BEGIN
      PERFORM cron.unschedule('mark-missed-workouts-hourly');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Job didn't exist, that's fine
    END;

    -- Schedule: minute 5 of every hour
    PERFORM cron.schedule(
      'mark-missed-workouts-hourly',
      '5 * * * *',
      'SELECT public.trigger_mark_missed_workouts()'
    );

    RAISE NOTICE 'Cron job scheduled: mark-missed-workouts-hourly at :05 past every hour';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Manual setup required:';
    RAISE NOTICE 'SELECT cron.schedule(''mark-missed-workouts-hourly'', ''5 * * * *'', ''SELECT public.trigger_mark_missed_workouts()'')';
  END IF;
END;
$$;

-- ============================================================================
-- 5. Permissions for log table
-- ============================================================================
GRANT SELECT ON public.missed_workout_cron_log TO service_role;
GRANT INSERT, UPDATE ON public.missed_workout_cron_log TO service_role;

-- ============================================================================
-- 6. Cleanup: auto-delete log entries older than 30 days
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_missed_workout_logs(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.missed_workout_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
