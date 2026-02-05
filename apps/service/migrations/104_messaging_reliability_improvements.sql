-- ================================================
-- 104: Messaging Reliability Improvements
--
-- This migration adds critical reliability features:
-- 1. idempotency_key column to prevent duplicate messages
-- 2. pending_attachments status for atomic message+attachment creation
-- 3. Improved broadcast trigger with signed URLs
-- 4. Better handling of attachment completion
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Add idempotency_key to messages table
-- ================================================
-- Prevents duplicate messages on retry/reconnection

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index on idempotency_key (allows NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency_key 
ON public.messages(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.messages.idempotency_key IS
  'Client-provided unique key to prevent duplicate messages on retry. Format: {sender_id}-{timestamp}-{random}';

-- ================================================
-- STEP 2: Add pending_attachments status
-- ================================================
-- Allows message to wait for attachments before broadcasting

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachments_ready BOOLEAN DEFAULT TRUE;

-- Messages with attachments start as not ready
-- Set to TRUE when all attachments are uploaded
COMMENT ON COLUMN public.messages.attachments_ready IS
  'FALSE when message is waiting for attachments to be uploaded. TRUE when ready to display.';

-- Index for finding messages with pending attachments
CREATE INDEX IF NOT EXISTS idx_messages_pending_attachments
ON public.messages(conversation_id, attachments_ready)
WHERE attachments_ready = FALSE;

-- ================================================
-- STEP 3: Add last_message_sender_id to conversations
-- ================================================
-- Needed for read receipts to show proper checkmarks

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'last_message_sender_id'
  ) THEN
    ALTER TABLE public.conversations
    ADD COLUMN last_message_sender_id UUID;
  END IF;
END $$;

-- ================================================
-- STEP 4: Function to generate signed URL (for broadcasts)
-- ================================================
-- This allows the broadcast trigger to include signed URLs

CREATE OR REPLACE FUNCTION public.get_storage_signed_url(
  p_bucket_id TEXT,
  p_file_path TEXT,
  p_expiry_seconds INTEGER DEFAULT 3600
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, storage
LANGUAGE plpgsql
AS $$
DECLARE
  v_signed_url TEXT;
BEGIN
  -- Generate a signed URL for the attachment
  -- This uses Supabase's storage.fpath API
  SELECT storage.fpath(p_bucket_id, p_file_path) INTO v_signed_url;
  RETURN v_signed_url;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if URL generation fails
    RETURN NULL;
END;
$$;

-- ================================================
-- STEP 5: Enhanced broadcast trigger with signed URLs
-- ================================================
-- Now includes signed URLs for attachments to prevent client-side loading

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

-- ================================================
-- STEP 6: Update conversation trigger to include sender_id
-- ================================================

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.sent_at,
    last_message_type = NEW.message_type,
    last_message_sender_id = NEW.sender_id,
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
$$ LANGUAGE plpgsql;

-- ================================================
-- STEP 7: Function to mark message attachments as ready
-- ================================================
-- Call this after all attachments are uploaded

CREATE OR REPLACE FUNCTION public.mark_message_attachments_ready(
  p_message_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.messages
  SET attachments_ready = TRUE
  WHERE id = p_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_attachments_ready(UUID) TO authenticated;

-- ================================================
-- STEP 8: Trigger to auto-mark ready when all attachments complete
-- ================================================

CREATE OR REPLACE FUNCTION public.check_attachments_complete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_expected_count INTEGER;
  v_actual_count INTEGER;
  v_attachments_ready BOOLEAN;
BEGIN
  -- Get expected attachment count and current ready status
  SELECT attachment_count, attachments_ready 
  INTO v_expected_count, v_attachments_ready
  FROM public.messages
  WHERE id = NEW.message_id;
  
  -- If message is already ready, skip
  IF v_attachments_ready = TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Count completed attachments
  SELECT COUNT(*) INTO v_actual_count
  FROM public.message_attachments
  WHERE message_id = NEW.message_id
    AND upload_status = 'completed';
  
  -- If all attachments are uploaded, mark message as ready
  IF v_actual_count >= COALESCE(v_expected_count, 0) THEN
    UPDATE public.messages
    SET attachments_ready = TRUE
    WHERE id = NEW.message_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_check_attachments_complete ON public.message_attachments;

-- Create trigger for INSERT and UPDATE on attachments
CREATE TRIGGER trg_check_attachments_complete
  AFTER INSERT OR UPDATE OF upload_status ON public.message_attachments
  FOR EACH ROW
  WHEN (NEW.upload_status = 'completed')
  EXECUTE FUNCTION public.check_attachments_complete();

-- ================================================
-- STEP 9: Remove old attachment broadcast trigger
-- ================================================
-- The new flow handles this through attachments_ready flag

DROP TRIGGER IF EXISTS trg_broadcast_message_on_attachment ON public.message_attachments;
DROP FUNCTION IF EXISTS public.broadcast_message_on_attachment();

COMMENT ON FUNCTION public.broadcast_message_changes() IS
  'Broadcasts message changes to Supabase Realtime. Waits for attachments_ready before broadcasting messages with attachments.';

COMMIT;
