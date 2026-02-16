-- ================================================
-- Replicate coach push tokens to client push tokens
-- ================================================
-- A coach is always also a client (same user ID). When the coach accepts
-- notifications on the mobile app, the token is saved to coach_push_tokens.
-- This trigger replicates it to client_push_tokens so the client-side
-- notifications (assignment alerts, etc.) also reach that device.

CREATE OR REPLACE FUNCTION public.replicate_coach_push_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_push_tokens (client_id, expo_push_token, device_id)
    VALUES (NEW.coach_id, NEW.expo_push_token, NEW.device_id)
    ON CONFLICT (client_id, expo_push_token) DO NOTHING;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Token changed — update the client copy
    UPDATE public.client_push_tokens
    SET expo_push_token = NEW.expo_push_token,
        device_id = NEW.device_id,
        updated_at = now()
    WHERE client_id = OLD.coach_id
      AND expo_push_token = OLD.expo_push_token;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.client_push_tokens
    WHERE client_id = OLD.coach_id
      AND expo_push_token = OLD.expo_push_token;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_replicate_coach_push_token
  AFTER INSERT OR UPDATE OR DELETE ON public.coach_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.replicate_coach_push_token();

-- Backfill: copy any existing coach tokens that are missing from client_push_tokens
INSERT INTO public.client_push_tokens (client_id, expo_push_token, device_id)
SELECT coach_id, expo_push_token, device_id
FROM public.coach_push_tokens
ON CONFLICT (client_id, expo_push_token) DO NOTHING;
