-- ================================================
-- Coach Push Notification Trigger
-- ================================================
-- Triggers the coach-push-notification edge function on INSERT to
-- coach_notifications. Uses pg_net to HTTP POST the webhook payload
-- to the edge function, matching the WebhookPayload interface it expects.

CREATE OR REPLACE FUNCTION public.notify_coach_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions, vault
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/coach-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'coach_notifications',
        'schema', 'public',
        'record', jsonb_build_object(
          'id', NEW.id,
          'coach_id', NEW.coach_id,
          'client_id', NEW.client_id,
          'notification_type', NEW.notification_type,
          'title', NEW.title,
          'description', NEW.description,
          'metadata', NEW.metadata,
          'read_at', NEW.read_at,
          'created_at', NEW.created_at
        ),
        'old_record', null
      )
    ) INTO v_request_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_coach_push_notification: pg_net call failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_coach_push_notification
  AFTER INSERT ON public.coach_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_coach_push_notification();
