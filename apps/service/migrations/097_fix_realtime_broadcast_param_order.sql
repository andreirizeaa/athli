-- ================================================
-- 097: Fix Realtime Broadcast Parameter Order
--
-- Fixes the realtime.send() call to use correct parameter order:
-- payload, event, topic, is_private
-- ================================================

-- Update the broadcast trigger function with correct parameter order
CREATE OR REPLACE FUNCTION public.broadcast_message_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  topic TEXT;
  payload JSONB;
BEGIN
  -- Topic format: conversation:{id}:messages
  topic := 'conversation:' || COALESCE(NEW.conversation_id, OLD.conversation_id) || ':messages';

  -- Build payload with message data
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'id', OLD.id,
      'conversation_id', OLD.conversation_id
    );
  ELSE
    payload := jsonb_build_object(
      'type', TG_OP,
      'id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'content', NEW.content,
      'message_type', NEW.message_type,
      'parent_message_id', NEW.parent_message_id,
      'status', NEW.status,
      'sent_at', NEW.sent_at,
      'read_at', NEW.read_at,
      'edited_at', NEW.edited_at,
      'is_deleted', NEW.is_deleted,
      'deleted_at', NEW.deleted_at,
      'created_at', NEW.created_at
    );
  END IF;

  -- Send broadcast using realtime.send
  -- Correct parameter order: payload, event, topic, is_private
  PERFORM realtime.send(
    payload,              -- JSONB payload
    'message_change',     -- event name
    topic,                -- topic/channel name
    true                  -- private = true (requires RLS)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.broadcast_message_changes() IS
  'Broadcasts message changes to Supabase Realtime channel for real-time messaging (fixed param order)';
