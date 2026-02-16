-- ================================================
-- Fix: Use Vault secrets for assignment notification trigger
-- ================================================
-- The trigger function from migration 223 used current_setting() to read
-- secrets, which only works in pg_cron context. In PostgREST trigger
-- context those settings are NULL, so the pg_net call was silently skipped.
-- This switches to vault.decrypted_secrets (matching migration 181) and
-- adds the correct search_path.

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
