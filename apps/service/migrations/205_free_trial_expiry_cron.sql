-- ================================================
-- 205: Free Trial Expiry via pg_cron
-- ================================================
-- Runs every 30 minutes. For each coach, computes "now" in their timezone
-- (from user_profiles.timezone, falls back to UTC).
-- If 30 days have elapsed since their created_at timestamp AND
-- it's just after midnight (12:00 AM - 12:30 AM) in their timezone,
-- sets free_trial_completed to TRUE.
--
-- Idempotent: only updates coaches where free_trial_completed is still FALSE.
-- ================================================

-- ============================================================================
-- 1. Log table to track cron runs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.free_trial_expiry_cron_log (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  rows_updated INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ftecl_started_at
  ON public.free_trial_expiry_cron_log (started_at DESC);

-- RLS
ALTER TABLE public.free_trial_expiry_cron_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage free trial expiry log" ON public.free_trial_expiry_cron_log;
CREATE POLICY "Service role can manage free trial expiry log"
  ON public.free_trial_expiry_cron_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. Core function: expire_free_trials()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_free_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rows INTEGER;
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

  UPDATE public.coach_profiles cp
  SET free_trial_completed = TRUE
  FROM public.user_profiles up
  WHERE
    -- Join to get timezone
    up.id = cp.id
    AND up.user_type = 'coach'
    -- Only process coaches who haven't completed trial yet
    AND cp.free_trial_completed = FALSE
    -- 30 days have elapsed since account creation
    AND cp.created_at < NOW() - INTERVAL '30 days'
    -- It's midnight hour (12:00 AM - 12:59 AM) in the coach's timezone
    AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) = 0;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- ============================================================================
-- 3. Wrapper called by pg_cron (handles logging)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_expire_free_trials()
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
  INSERT INTO public.free_trial_expiry_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  -- Run the core logic
  v_rows := public.expire_free_trials();

  -- Update log with result
  UPDATE public.free_trial_expiry_cron_log
  SET completed_at = now(),
      rows_updated = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'expire_free_trials: updated % rows', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the cron job
  UPDATE public.free_trial_expiry_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'expire_free_trials failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_free_trials() TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_expire_free_trials() TO service_role;

-- ============================================================================
-- 4. Schedule pg_cron job (runs every 30 minutes at :00 and :30)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    BEGIN
      PERFORM cron.unschedule('expire-free-trials');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Job didn't exist, that's fine
    END;

    -- Schedule: every 30 minutes (at :00 and :30)
    PERFORM cron.schedule(
      'expire-free-trials',
      '0,30 * * * *',
      'SELECT public.trigger_expire_free_trials()'
    );

    RAISE NOTICE 'Cron job scheduled: expire-free-trials every 30 minutes';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Manual setup required:';
    RAISE NOTICE 'SELECT cron.schedule(''expire-free-trials'', ''0,30 * * * *'', ''SELECT public.trigger_expire_free_trials()'')';
  END IF;
END;
$$;

-- ============================================================================
-- 5. Permissions for log table
-- ============================================================================
GRANT SELECT ON public.free_trial_expiry_cron_log TO service_role;
GRANT INSERT, UPDATE ON public.free_trial_expiry_cron_log TO service_role;

-- ============================================================================
-- 6. Cleanup: auto-delete log entries older than 30 days
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_free_trial_expiry_logs(
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
  DELETE FROM public.free_trial_expiry_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_free_trial_expiry_logs(INTEGER) TO service_role;
