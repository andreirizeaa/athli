-- ================================================
-- 105: Fix Conversation Update Trigger
--
-- PROBLEM: When mobile app sends a message, the 
-- update_conversation_on_message trigger fails to update
-- the conversations table because:
-- 1. The trigger function doesn't have SECURITY DEFINER
-- 2. There's no UPDATE RLS policy on conversations table
--
-- The trigger runs with the calling user's context, and
-- RLS blocks the UPDATE operation.
--
-- SOLUTION: Add SECURITY DEFINER to the trigger function
-- so it runs with elevated privileges and bypasses RLS.
-- This is safe because the trigger only updates based on
-- the NEW message row, not arbitrary user input.
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Recreate the trigger function with SECURITY DEFINER
-- ================================================

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

COMMENT ON FUNCTION public.update_conversation_on_message() IS
  'Updates conversation preview when a new message is sent. Uses SECURITY DEFINER to bypass RLS.';

-- ================================================
-- STEP 2: Ensure trigger is properly attached
-- ================================================
-- (No change needed, but recreate for safety)

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON public.messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT OR UPDATE OF content, is_deleted, message_type ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

COMMIT;
