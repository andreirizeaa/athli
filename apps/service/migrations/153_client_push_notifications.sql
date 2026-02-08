-- ================================================
-- Client Push Notifications
-- ================================================
-- Infrastructure for sending push notifications to clients about
-- daily tasks and workouts (morning alerts + evening reminders).

-- ------------------------------------------------
-- 1. client_push_tokens — mirrors coach_push_tokens
-- ------------------------------------------------
CREATE TABLE public.client_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, expo_push_token)
);

CREATE INDEX idx_client_pt_client ON public.client_push_tokens (client_id);
CREATE INDEX idx_client_pt_token ON public.client_push_tokens (expo_push_token);

ALTER TABLE public.client_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own push tokens"
  ON public.client_push_tokens FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can insert own push tokens"
  ON public.client_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own push tokens"
  ON public.client_push_tokens FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can delete own push tokens"
  ON public.client_push_tokens FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

-- ------------------------------------------------
-- 2. client_push_notification_log — deduplication
-- ------------------------------------------------
CREATE TABLE public.client_push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('morning_tasks', 'morning_workouts', 'evening_tasks', 'evening_workouts')),
  notification_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, notification_type, notification_date)
);

CREATE INDEX idx_cpnl_client_date ON public.client_push_notification_log (client_id, notification_date);

ALTER TABLE public.client_push_notification_log ENABLE ROW LEVEL SECURITY;

-- Only service_role accesses this table (from edge function)
-- No authenticated user policies needed

-- ------------------------------------------------
-- 3. Cleanup old log entries (older than 7 days)
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_client_push_notification_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.client_push_notification_log
  WHERE notification_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- Schedule cleanup daily at 2:00 AM UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-client-push-notification-log',
      '0 2 * * *',
      'SELECT public.cleanup_client_push_notification_log()'
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Manually schedule: SELECT cron.schedule(''cleanup-client-push-notification-log'', ''0 2 * * *'', ''SELECT public.cleanup_client_push_notification_log()'')';
  END IF;
END;
$$;

-- ------------------------------------------------
-- 4. Trigger function to call client push notification edge function
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_client_push_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get Supabase settings
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase settings not configured. Set app.settings.supabase_url and app.settings.service_role_key';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Supabase settings not configured';
    RETURN;
  END IF;

  -- Call the edge function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/client-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );
END;
$$;

-- Schedule every 30 minutes at :10 and :40 (offset from task generation at :05/:35)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'client-push-notifications',
      '10,40 * * * *',
      'SELECT public.trigger_client_push_notifications()'
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Manually schedule: SELECT cron.schedule(''client-push-notifications'', ''10,40 * * * *'', ''SELECT public.trigger_client_push_notifications()'')';
  END IF;
END;
$$;
