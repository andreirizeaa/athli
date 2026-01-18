BEGIN;

-- ================================================
-- Add missing UPDATE policy for message_reactions
-- (Required for upsert operations to work with RLS)
-- ================================================
DROP POLICY IF EXISTS "Users update own reactions" ON public.message_reactions;
CREATE POLICY "Users update own reactions"
  ON public.message_reactions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================
-- Trigger to broadcast message with reactions when they change
-- ================================================
CREATE OR REPLACE FUNCTION public.broadcast_message_on_reaction()
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
  msg RECORD;
  reaction_message_id UUID;
BEGIN
  -- Get the message ID from either NEW or OLD
  reaction_message_id := COALESCE(NEW.message_id, OLD.message_id);

  -- Get the parent message
  SELECT * INTO msg FROM public.messages WHERE id = reaction_message_id;

  IF msg IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build topic
  topic := 'conversation:' || msg.conversation_id || ':messages';

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
  WHERE ma.message_id = reaction_message_id;

  -- Query ALL reactions for this message (including the one just inserted)
  -- For INSERT/UPDATE, include NEW; for DELETE, exclude OLD
  IF TG_OP = 'DELETE' THEN
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
    WHERE mr.message_id = reaction_message_id
    AND mr.id != OLD.id;  -- Exclude deleted reaction
  ELSE
    -- For INSERT, we need to include the NEW reaction explicitly
    -- since it may not be visible in the table yet
    SELECT COALESCE(jsonb_agg(reaction_obj), '[]'::jsonb)
    INTO reactions_json
    FROM (
      -- Existing reactions (excluding NEW.id to avoid duplicates)
      SELECT jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      ) as reaction_obj
      FROM public.message_reactions mr
      WHERE mr.message_id = reaction_message_id
      AND mr.id != NEW.id
      UNION ALL
      -- Include the NEW reaction explicitly
      SELECT jsonb_build_object(
        'id', NEW.id,
        'message_id', NEW.message_id,
        'conversation_id', NEW.conversation_id,
        'user_id', NEW.user_id,
        'reaction', NEW.reaction,
        'created_at', NEW.created_at
      ) as reaction_obj
    ) combined;
  END IF;

  -- Build payload
  payload := jsonb_build_object(
    'type', 'UPDATE',
    'id', msg.id,
    'conversation_id', msg.conversation_id,
    'sender_id', msg.sender_id,
    'content', msg.content,
    'message_type', msg.message_type,
    'parent_message_id', msg.parent_message_id,
    'status', msg.status,
    'sent_at', msg.sent_at,
    'read_at', msg.read_at,
    'edited_at', msg.edited_at,
    'is_deleted', msg.is_deleted,
    'deleted_at', msg.deleted_at,
    'created_at', msg.created_at,
    'attachment_count', COALESCE(msg.attachment_count, 0),
    'attachments', attachments_json,
    'reactions', reactions_json
  );

  -- Send broadcast
  PERFORM realtime.send(
    payload,
    'message_change',
    topic,
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_message_on_reaction ON public.message_reactions;
CREATE TRIGGER trg_broadcast_message_on_reaction
  AFTER INSERT OR UPDATE OR DELETE ON public.message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_message_on_reaction();

COMMENT ON FUNCTION public.broadcast_message_on_reaction() IS
  'Broadcasts parent message with reactions when a reaction is inserted, updated, or removed';

COMMIT;
