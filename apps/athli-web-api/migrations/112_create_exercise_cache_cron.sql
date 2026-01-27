-- Migration: Create pg_cron job for MuscleWiki exercise cache population
-- Purpose: Automatically refresh the exercise cache before it expires
--
-- This migration:
-- 1. Creates a function that can be called to trigger cache population
-- 2. Sets up a pg_cron job to run daily (cache expires in 7 days, so daily is safe)
-- 3. Creates a secrets entry for the service token
--
-- Prerequisites:
-- - pg_cron extension must be enabled in Supabase
-- - Edge function 'populate-exercise-cache' must be deployed
-- - CACHE_POPULATE_SERVICE_TOKEN environment variable must be set
-- ============================================================================

-- ============================================================================
-- 1. Create table to track cache population runs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.musclewiki_cache_population_log (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
  total_fetched INTEGER DEFAULT 0,
  total_cached INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_message TEXT,
  triggered_by TEXT DEFAULT 'cron', -- 'cron', 'manual', 'initial'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcpl_started_at ON public.musclewiki_cache_population_log(started_at DESC);
CREATE INDEX idx_mcpl_status ON public.musclewiki_cache_population_log(status);

-- ============================================================================
-- 2. Create function to check if cache population is needed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.should_populate_exercise_cache()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_cached INTEGER;
  v_expired_count INTEGER;
  v_last_population TIMESTAMPTZ;
BEGIN
  -- Check total cached exercises
  SELECT COUNT(*) INTO v_total_cached
  FROM public.musclewiki_exercise_cache;

  -- If cache is empty, definitely need to populate
  IF v_total_cached < 100 THEN
    RETURN TRUE;
  END IF;

  -- Check how many are expired or expiring soon (within 2 days)
  SELECT COUNT(*) INTO v_expired_count
  FROM public.musclewiki_exercise_cache
  WHERE cache_expires_at < (now() + INTERVAL '2 days');

  -- If more than 10% are expired/expiring, need to refresh
  IF v_expired_count > (v_total_cached * 0.1) THEN
    RETURN TRUE;
  END IF;

  -- Check last successful population
  SELECT started_at INTO v_last_population
  FROM public.musclewiki_cache_population_log
  WHERE status = 'success'
  ORDER BY started_at DESC
  LIMIT 1;

  -- If never populated or last population was more than 5 days ago
  IF v_last_population IS NULL OR v_last_population < (now() - INTERVAL '5 days') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================================
-- 3. Create function to start cache population (called by cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.start_exercise_cache_population()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Create a log entry
  INSERT INTO public.musclewiki_cache_population_log (status, triggered_by)
  VALUES ('running', 'cron')
  RETURNING id INTO v_log_id;

  -- The actual population will be done by the edge function
  -- This function just creates the log entry

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- 4. Create function to update cache population log
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_exercise_cache_population(
  p_log_id UUID,
  p_status TEXT,
  p_total_fetched INTEGER DEFAULT 0,
  p_total_cached INTEGER DEFAULT 0,
  p_errors INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.musclewiki_cache_population_log
  SET
    completed_at = now(),
    status = p_status,
    total_fetched = p_total_fetched,
    total_cached = p_total_cached,
    errors = p_errors,
    error_message = p_error_message
  WHERE id = p_log_id;
END;
$$;

-- ============================================================================
-- 5. Create function to get cache stats
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_exercise_cache_stats()
RETURNS TABLE (
  total_cached BIGINT,
  valid_cached BIGINT,
  expired_cached BIGINT,
  expiring_soon BIGINT,
  last_population TIMESTAMPTZ,
  needs_refresh BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache)::BIGINT AS total_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at > now())::BIGINT AS valid_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at <= now())::BIGINT AS expired_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at BETWEEN now() AND (now() + INTERVAL '2 days'))::BIGINT AS expiring_soon,
    (SELECT started_at FROM public.musclewiki_cache_population_log WHERE status = 'success' ORDER BY started_at DESC LIMIT 1) AS last_population,
    public.should_populate_exercise_cache() AS needs_refresh;
END;
$$;

-- ============================================================================
-- 6. Create function to trigger cache population via HTTP
-- This function is called by pg_cron and handles the conditional logic
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_exercise_cache_population()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only proceed if cache needs refresh
  IF NOT public.should_populate_exercise_cache() THEN
    RAISE NOTICE 'Cache is up to date, skipping population';
    RETURN;
  END IF;

  -- Get Supabase settings (these need to be configured in your database)
  -- You can set these via: ALTER DATABASE postgres SET app.settings.supabase_url = 'your-url';
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase settings not configured. Set app.settings.supabase_url and app.settings.service_role_key';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Supabase URL or service key not configured';
    RETURN;
  END IF;

  -- Call the edge function via pg_net
  -- Note: pg_net extension must be enabled
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/populate-exercise-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );

  RAISE NOTICE 'Cache population triggered successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to trigger cache population: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_exercise_cache_population() TO service_role;

-- ============================================================================
-- 7. Create the pg_cron job (runs daily at 3 AM UTC)
-- Note: pg_cron must be enabled in Supabase project settings
-- ============================================================================

-- Schedule the cron job if pg_cron is available
-- This needs to be run separately or via Supabase dashboard if pg_cron isn't available yet
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    PERFORM cron.unschedule('populate-exercise-cache-daily');
    
    -- Schedule the job
    PERFORM cron.schedule(
      'populate-exercise-cache-daily',
      '0 3 * * *',
      'SELECT public.trigger_exercise_cache_population()'
    );
    
    RAISE NOTICE 'Cron job scheduled successfully: populate-exercise-cache-daily at 3 AM UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Cron job not created.';
    RAISE NOTICE 'Enable pg_cron in Supabase dashboard and run:';
    RAISE NOTICE 'SELECT cron.schedule(''populate-exercise-cache-daily'', ''0 3 * * *'', ''SELECT public.trigger_exercise_cache_population()'')';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create cron job: %. Manual setup may be required.', SQLERRM;
    RAISE NOTICE 'Run manually: SELECT cron.schedule(''populate-exercise-cache-daily'', ''0 3 * * *'', ''SELECT public.trigger_exercise_cache_population()'')';
END;
$$;

-- ============================================================================
-- 8. Grant permissions
-- ============================================================================
GRANT SELECT ON public.musclewiki_cache_population_log TO authenticated;
GRANT SELECT ON public.musclewiki_cache_population_log TO service_role;
GRANT INSERT, UPDATE ON public.musclewiki_cache_population_log TO service_role;

GRANT EXECUTE ON FUNCTION public.should_populate_exercise_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.start_exercise_cache_population() TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_exercise_cache_population(UUID, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_exercise_cache_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_cache_stats() TO service_role;

-- ============================================================================
-- 9. RLS policies for cache population log
-- ============================================================================
ALTER TABLE public.musclewiki_cache_population_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage cache population log"
  ON public.musclewiki_cache_population_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view cache population log"
  ON public.musclewiki_cache_population_log
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 10. Initial trigger - run cache population if needed
-- Note: This will be triggered by calling the edge function manually
-- ============================================================================
DO $$
DECLARE
  v_needs_refresh BOOLEAN;
BEGIN
  SELECT public.should_populate_exercise_cache() INTO v_needs_refresh;
  
  IF v_needs_refresh THEN
    RAISE NOTICE 'Exercise cache needs population. Call the edge function or API endpoint to populate.';
    RAISE NOTICE 'POST /api/v1/exercises/cache/populate with X-Service-Token header';
    RAISE NOTICE 'Or invoke edge function: populate-exercise-cache';
  ELSE
    RAISE NOTICE 'Exercise cache is up to date. No population needed.';
  END IF;
END;
$$;
