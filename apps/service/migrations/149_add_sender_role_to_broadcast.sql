-- ================================================
-- 149: Add sender_role to message broadcast payload
--
-- The broadcast trigger was missing sender_role from the payload,
-- so realtime messages fell back to sender_id comparison for
-- determining message alignment. This breaks self-conversations
-- (demo: coach_id === client_id) where sender_id === currentUserId
-- is always true.
-- ================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.broadcast_message_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  topic TEXT;
  payload JSONB;
  attachments_json JSONB;
  reactions_json JSONB;
BEGIN
  -- Topic format: conversation:{id}:messages
  topic := 'conversation:' || COALESCE(NEW.conversation_id, OLD.conversation_id) || ':messages';

  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'id', OLD.id,
      'conversation_id', OLD.conversation_id
    );
  ELSE
    -- Skip broadcast if message is waiting for attachments
    -- (unless it's being marked as ready)
    IF NEW.attachments_ready = FALSE AND
       (TG_OP = 'INSERT' OR (OLD.attachments_ready = FALSE AND NEW.attachments_ready = FALSE)) THEN
      -- Don't broadcast yet - waiting for attachments
      RETURN NEW;
    END IF;

    -- Query attachments for this message with pre-generated URLs
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ma.id,
        'message_id', ma.message_id,
        'conversation_id', ma.conversation_id,
        'bucket_id', ma.bucket_id,
        'file_path', ma.file_path,
        'filename', ma.filename,
        'mime_type', ma.mime_type,
        'size_bytes', ma.size_bytes,
        'thumbnail_path', ma.thumbnail_path,
        'width', ma.width,
        'height', ma.height,
        'duration_seconds', ma.duration_seconds,
        'upload_status', ma.upload_status,
        'created_at', ma.created_at
      )
    ), '[]'::jsonb)
    INTO attachments_json
    FROM public.message_attachments ma
    WHERE ma.message_id = NEW.id;

    -- Query reactions for this message
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      )
    ), '[]'::jsonb)
    INTO reactions_json
    FROM public.message_reactions mr
    WHERE mr.message_id = NEW.id;

    payload := jsonb_build_object(
      'type', TG_OP,
      'id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_role', NEW.sender_role,
      'content', NEW.content,
      'message_type', NEW.message_type,
      'parent_message_id', NEW.parent_message_id,
      'status', NEW.status,
      'sent_at', NEW.sent_at,
      'read_at', NEW.read_at,
      'edited_at', NEW.edited_at,
      'is_deleted', NEW.is_deleted,
      'deleted_at', NEW.deleted_at,
      'created_at', NEW.created_at,
      'attachment_count', COALESCE(NEW.attachment_count, 0),
      'attachments_ready', COALESCE(NEW.attachments_ready, TRUE),
      'idempotency_key', NEW.idempotency_key,
      'attachments', attachments_json,
      'reactions', reactions_json
    );
  END IF;

  -- Send broadcast using realtime.send
  PERFORM realtime.send(
    payload,
    'message_change',
    topic,
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMIT;
