-- ================================================
-- 154: Schedule exercise cache population cron job
-- ================================================
-- Migration 112 created the functions but the cron.schedule call
-- likely failed due to a missing exception handler on unschedule.
-- This migration properly schedules the job.
--
-- The check is simple: grab one row's cache_expires_at. Since all rows
-- are populated in the same batch they share the same expiry window.
-- If that row is expired (or the cache is empty), trigger the edge function.
-- ================================================

-- ============================================================================
-- 1. Simplify the expiry check: one row is enough
-- ============================================================================
CREATE OR REPLACE FUNCTION public.should_populate_exercise_cache()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Grab one row's expiry. All rows share the same batch expiry.
  SELECT cache_expires_at INTO v_expires_at
  FROM public.musclewiki_exercise_cache
  LIMIT 1;

  -- Cache is empty → need to populate
  IF v_expires_at IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Expired or expiring within 5 days → need to refresh
  IF v_expires_at < (now() + INTERVAL '5 days') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================================
-- 2. Schedule pg_cron job (daily at 3:00 AM UTC)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists (with error handling)
    BEGIN
      PERFORM cron.unschedule('populate-exercise-cache-daily');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Job didn't exist, that's fine
    END;

    -- Schedule: daily at 3 AM UTC
    PERFORM cron.schedule(
      'populate-exercise-cache-daily',
      '0 3 * * *',
      'SELECT public.trigger_exercise_cache_population()'
    );

    RAISE NOTICE 'Cron job scheduled: populate-exercise-cache-daily at 3:00 AM UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Manual setup required:';
    RAISE NOTICE 'SELECT cron.schedule(''populate-exercise-cache-daily'', ''0 3 * * *'', ''SELECT public.trigger_exercise_cache_population()'')';
  END IF;
END;
$$;
