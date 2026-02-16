-- ================================================
-- Referral Push Notifications
-- ================================================
-- Sends push notifications to the referring coach when a referral event
-- occurs (trial started, converted, trial ended, trial cancelled).
-- Triggers on INSERT to coach_referral_events and invokes the edge
-- function via pg_net using Vault secrets.

CREATE OR REPLACE FUNCTION public.notify_referral_event()
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
      url := v_supabase_url || '/functions/v1/referral-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'referrer_coach_id', NEW.referrer_coach_id,
        'event_type', NEW.event_type,
        'referred_coach_name', NEW.referred_coach_name,
        'credit_cents', NEW.credit_cents
      )
    ) INTO v_request_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_referral_event: pg_net call failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Only fire when referrer_coach_id is set (skip if referrer deleted their account)
CREATE TRIGGER trg_notify_referral_event
  AFTER INSERT ON public.coach_referral_events
  FOR EACH ROW
  WHEN (NEW.referrer_coach_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_referral_event();
