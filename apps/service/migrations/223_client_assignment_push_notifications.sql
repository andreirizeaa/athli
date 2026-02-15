-- ================================================
-- Client Assignment Push Notifications
-- ================================================
-- Sends instant push notifications to clients when a coach assigns new
-- items (habits, metrics, files, check-ins, questionnaires).
-- Uses a queue + debounce pattern so multiple assignments in quick
-- succession produce one batched notification per (client, coach) pair.

-- ------------------------------------------------
-- 1. Notification queue table
-- ------------------------------------------------
CREATE TABLE public.client_assignment_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('habit', 'metric', 'file', 'check_in', 'questionnaire')),
  item_name TEXT NOT NULL,
  schedule_config JSONB,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup for unprocessed entries per (client, coach)
CREATE INDEX idx_canq_unprocessed
  ON public.client_assignment_notification_queue (client_id, coach_id)
  WHERE processed = FALSE;

ALTER TABLE public.client_assignment_notification_queue ENABLE ROW LEVEL SECURITY;
-- Only service_role accesses this table (from edge function / triggers)
-- No authenticated user policies needed

-- ------------------------------------------------
-- 2. Trigger function — enqueue + invoke edge function
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions, vault
AS $$
DECLARE
  v_item_type TEXT;
  v_item_name TEXT;
  v_schedule_config JSONB;
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Determine item_type and item_name from the source table
  CASE TG_TABLE_NAME
    WHEN 'client_habits' THEN
      v_item_type := 'habit';
      v_item_name := NEW.name;
    WHEN 'client_metrics' THEN
      v_item_type := 'metric';
      v_item_name := NEW.name;
    WHEN 'client_files' THEN
      v_item_type := 'file';
      v_item_name := COALESCE(NEW.display_name, NEW.filename);
    WHEN 'client_checkins' THEN
      v_item_type := 'check_in';
      v_item_name := NEW.name;
      v_schedule_config := NEW.schedule_config;
    WHEN 'client_questionnaires' THEN
      v_item_type := 'questionnaire';
      v_item_name := NEW.name;
    ELSE
      RETURN NEW;
  END CASE;

  -- Enqueue the notification
  INSERT INTO public.client_assignment_notification_queue
    (client_id, coach_id, item_type, item_name, schedule_config)
  VALUES
    (NEW.client_id, NEW.coach_id, v_item_type, v_item_name, v_schedule_config);

  -- Invoke the edge function via pg_net (best-effort, non-blocking)
  -- Use Vault for secrets (current_setting is only available in cron context)
  BEGIN
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/client-assignment-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'client_id', NEW.client_id,
          'coach_id', NEW.coach_id
        )
      ) INTO v_request_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- pg_net call failed — queue entry still exists for the next invocation
    RAISE WARNING 'notify_client_assignment: pg_net call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------
-- 3. Triggers on client assignment tables
-- ------------------------------------------------

-- 3a. Habits — always notify on INSERT
CREATE TRIGGER trg_notify_client_habit_assignment
  AFTER INSERT ON public.client_habits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_assignment();

-- 3b. Metrics — always notify on INSERT
CREATE TRIGGER trg_notify_client_metric_assignment
  AFTER INSERT ON public.client_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_assignment();

-- 3c. Files — always notify on INSERT
CREATE TRIGGER trg_notify_client_file_assignment
  AFTER INSERT ON public.client_files
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_assignment();

-- 3d. Check-ins — notify when status = 'live' (library assignment inserts as 'live')
CREATE TRIGGER trg_notify_client_checkin_assignment
  AFTER INSERT ON public.client_checkins
  FOR EACH ROW
  WHEN (NEW.status = 'live')
  EXECUTE FUNCTION public.notify_client_assignment();

-- 3e. Check-ins — notify when draft transitions to 'live' (private check-in publish)
CREATE TRIGGER trg_notify_client_checkin_publish
  AFTER UPDATE ON public.client_checkins
  FOR EACH ROW
  WHEN (NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live')
  EXECUTE FUNCTION public.notify_client_assignment();

-- 3f. Questionnaires — notify when status = 'pending' (library assignment)
CREATE TRIGGER trg_notify_client_questionnaire_assignment
  AFTER INSERT ON public.client_questionnaires
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_client_assignment();

-- 3g. Questionnaires — notify when draft transitions to 'pending' (send action)
CREATE TRIGGER trg_notify_client_questionnaire_send
  AFTER UPDATE ON public.client_questionnaires
  FOR EACH ROW
  WHEN (NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending')
  EXECUTE FUNCTION public.notify_client_assignment();

-- ------------------------------------------------
-- 4. RPC — atomically claim unprocessed queue entries
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_assignment_notifications(
  p_client_id UUID,
  p_coach_id UUID
)
RETURNS TABLE (
  id UUID,
  item_type TEXT,
  item_name TEXT,
  schedule_config JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.client_assignment_notification_queue q
  SET processed = TRUE
  WHERE q.client_id = p_client_id
    AND q.coach_id = p_coach_id
    AND q.processed = FALSE
  RETURNING q.id, q.item_type, q.item_name, q.schedule_config;
END;
$$;

-- ------------------------------------------------
-- 5. Cleanup — delete processed entries older than 1 day
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_assignment_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.client_assignment_notification_queue
  WHERE processed = TRUE
    AND created_at < now() - INTERVAL '1 day';
END;
$$;

-- Schedule cleanup daily at 3:00 AM UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-assignment-notification-queue',
      '0 3 * * *',
      'SELECT public.cleanup_assignment_notification_queue()'
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Manually schedule: SELECT cron.schedule(''cleanup-assignment-notification-queue'', ''0 3 * * *'', ''SELECT public.cleanup_assignment_notification_queue()'')';
  END IF;
END;
$$;
