-- ================================================
-- 101: Include Attachments and Reactions in Realtime Broadcasts
--
-- Modifies the broadcast_message_changes trigger function to include
-- message_attachments and message_reactions as JSON arrays in the
-- broadcast payload. This eliminates the need for delayed refetch
-- after receiving realtime messages.
--
-- Also adds a trigger on message_attachments to re-broadcast the
-- parent message when attachments are inserted (since attachments
-- may be inserted after the message).
--
-- Adds attachment_count column to messages table so receivers know
-- how many attachments to expect before showing the message.
-- ================================================

BEGIN;

-- Add attachment_count column to messages table
-- This tells receivers how many attachments to expect
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

-- Enhanced trigger function with attachments and reactions
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
    -- Query attachments for this message
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

-- Trigger to re-broadcast message when attachments are added
-- This handles the case where attachments are inserted after the message
CREATE OR REPLACE FUNCTION public.broadcast_message_on_attachment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trigger an UPDATE broadcast for the parent message
  -- by performing a no-op update (this fires the message broadcast trigger)
  UPDATE public.messages
  SET created_at = created_at
  WHERE id = NEW.message_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_message_on_attachment ON public.message_attachments;
CREATE TRIGGER trg_broadcast_message_on_attachment
  AFTER INSERT ON public.message_attachments
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_message_on_attachment();

-- Add comments for documentation
COMMENT ON FUNCTION public.broadcast_message_changes() IS
  'Broadcasts message changes to Supabase Realtime channel with attachments and reactions included';

COMMENT ON FUNCTION public.broadcast_message_on_attachment() IS
  'Re-broadcasts parent message when an attachment is inserted to ensure clients receive complete data';

COMMIT;
