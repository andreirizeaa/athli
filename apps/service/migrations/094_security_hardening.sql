-- ================================================
-- Security Hardening Migration
-- ================================================
-- This migration addresses security vulnerabilities:
-- 1. Revokes EXECUTE permissions from PUBLIC/anon on sensitive functions
-- 2. Grants EXECUTE only to authenticated users for callable RPC functions
-- 3. Adds auth.uid() checks to callable RPC functions
-- 4. Ensures SECURITY DEFINER functions have immutable search_path

-- ================================================
-- STEP 1: Revoke EXECUTE from PUBLIC/anon on all public functions
-- ================================================

-- Revoke PUBLIC execute on all functions in public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ================================================
-- STEP 2: Grant EXECUTE only to authenticated users for callable RPC functions
-- ================================================

-- Note: Trigger functions and internal-use functions don't need direct EXECUTE grants
-- since they're invoked by the system. Only grant to user-callable functions.

GRANT EXECUTE ON FUNCTION public.get_coach_notification_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

-- ================================================
-- STEP 3: Add auth checks to callable RPC functions
-- ================================================

-- 3.1: get_coach_notification_settings - verify caller is the coach
CREATE OR REPLACE FUNCTION public.get_coach_notification_settings(coach_uuid UUID)
RETURNS TABLE (
    event_id UUID,
    event_key TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verify caller is authenticated and is the coach requesting their own settings
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() != coach_uuid THEN
        RAISE EXCEPTION 'Unauthorized: Can only access your own notification settings';
    END IF;

    RETURN QUERY
    SELECT
      ane.id AS event_id,
      ane.event_key,
      ane.name,
      ane.description,
      ane.category,
      COALESCE(cnp.enabled, ane.default_enabled) AS enabled
    FROM public.available_notification_events ane
    LEFT JOIN public.coach_notification_preferences cnp
      ON ane.id = cnp.event_id
      AND cnp.coach_id = coach_uuid
    ORDER BY ane.category, ane.event_key;
END;
$$;

-- 3.2: is_conversation_participant - verify caller is the user being checked
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Only allow checking participation for yourself
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only check your own participation';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
END;
$$;

-- 3.3: get_or_create_conversation - verify caller is one of the participants
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_coach_id UUID,
  p_client_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify caller is either the coach or the client in this conversation
  IF auth.uid() != p_coach_id AND auth.uid() != p_client_id THEN
    RAISE EXCEPTION 'Unauthorized: You must be a participant in the conversation';
  END IF;

  -- Ensure no self-messaging
  IF p_coach_id = p_client_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE coach_id = p_coach_id
    AND client_id = p_client_id;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (p_coach_id, p_client_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- ================================================
-- STEP 4: Ensure trigger functions have SET search_path
-- ================================================

-- 4.1: update_conversation_on_message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.sent_at,
    last_message_type = NEW.message_type,
    last_message_preview = CASE
      WHEN NEW.is_deleted THEN NULL
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Photo'
      WHEN NEW.message_type = 'video' THEN '🎥 Video'
      WHEN NEW.message_type = 'audio' THEN '🎵 Voice Message'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      ELSE 'Message'
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

-- 4.2: create_participant_records
CREATE OR REPLACE FUNCTION public.create_participant_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Create participant record for coach
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.coach_id, NEW.client_id
  );

  -- Create participant record for client
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.client_id, NEW.coach_id
  );

  -- Create initial read receipt records
  INSERT INTO public.message_read_receipts (conversation_id, user_id)
  VALUES
    (NEW.id, NEW.coach_id),
    (NEW.id, NEW.client_id);

  RETURN NEW;
END;
$$;

-- 4.3: update_message_status_on_read
CREATE OR REPLACE FUNCTION public.update_message_status_on_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update all unread messages sent before the new read time
  UPDATE public.messages
  SET
    status = 'read',
    read_at = NEW.last_read_at
  WHERE conversation_id = NEW.conversation_id
    AND sender_id <> NEW.user_id -- Not the reader's own messages
    AND sent_at <= NEW.last_read_at
    AND status = 'sent'; -- Only update if not already read

  RETURN NEW;
END;
$$;

-- 4.4: create_conversation_on_client_assignment
CREATE OR REPLACE FUNCTION public.create_conversation_on_client_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only create conversation when status becomes 'connected'
  IF NEW.status = 'connected' AND (OLD IS NULL OR OLD.status <> 'connected') THEN

    -- Create conversation (trigger will create participant records automatically)
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (NEW.coach_id, NEW.client_id)
    ON CONFLICT (coach_id, client_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- ================================================
-- STEP 5: Re-grant execute permissions on trigger functions for system use
-- ================================================

-- These trigger functions need to be executable by the roles that trigger them
-- Triggers typically run with the privileges of the table owner in PostgreSQL,
-- but we still grant to authenticated to ensure proper operation

GRANT EXECUTE ON FUNCTION public.update_conversation_on_message() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_participant_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_message_status_on_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_on_client_assignment() TO authenticated;

-- ================================================
-- STEP 6: Grant execute on common utility functions to authenticated
-- ================================================

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;

-- ================================================
-- Verification queries (run manually to verify)
-- ================================================
-- SELECT proname, proacl FROM pg_proc
-- WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
-- AND proname IN ('get_coach_notification_settings', 'get_or_create_conversation', 'is_conversation_participant');
