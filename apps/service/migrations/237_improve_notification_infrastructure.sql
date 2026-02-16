-- ================================================
-- 237: Improve Notification Infrastructure
-- ================================================
-- A. Expand client_push_notification_log CHECK constraint for new types
-- B. Create coach_push_notification_log table for coach digest dedup
-- C. Cron trigger function for coach missed digest edge function
-- ================================================

-- ============================================================================
-- A. Expand client_push_notification_log CHECK constraint
-- ============================================================================
-- Add: afternoon_tasks, afternoon_workouts, morning_overdue

ALTER TABLE public.client_push_notification_log
  DROP CONSTRAINT IF EXISTS client_push_notification_log_notification_type_check;

ALTER TABLE public.client_push_notification_log
  ADD CONSTRAINT client_push_notification_log_notification_type_check
  CHECK (notification_type IN (
    'morning_tasks', 'morning_workouts',
    'evening_tasks', 'evening_workouts',
    'afternoon_tasks', 'afternoon_workouts',
    'morning_overdue'
  ));

-- ============================================================================
-- B. Create coach_push_notification_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('morning_missed_digest')),
  notification_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, notification_type, notification_date)
);

CREATE INDEX IF NOT EXISTS idx_cpnl_coach_date
  ON public.coach_push_notification_log (coach_id, notification_date);

ALTER TABLE public.coach_push_notification_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "coach_pnl_service" ON public.coach_push_notification_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON public.coach_push_notification_log TO service_role;

-- ============================================================================
-- C. Cron trigger function for coach missed digest
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_coach_missed_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions, vault
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Vault secrets not configured for coach missed digest';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/coach-missed-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );
END;
$$;

-- Schedule at :20 and :50 (offset from client notifications at :10/:40)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'coach-missed-digest',
      '20,50 * * * *',
      'SELECT public.trigger_coach_missed_digest()'
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Manually schedule: SELECT cron.schedule(''coach-missed-digest'', ''20,50 * * * *'', ''SELECT public.trigger_coach_missed_digest()'')';
  END IF;
END;
$$;
