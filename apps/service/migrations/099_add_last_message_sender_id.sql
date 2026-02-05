-- Add last_message_sender_id column to track who sent the last message
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS last_message_sender_id uuid;

-- Backfill existing conversations with sender from last message
UPDATE public.conversations c
SET last_message_sender_id = (
  SELECT m.sender_id
  FROM public.messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.sent_at DESC
  LIMIT 1
);

-- Update trigger function to also set last_message_sender_id
CREATE OR REPLACE FUNCTION public.update_conversation_on_message() RETURNS trigger
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
      WHEN NEW.message_type = 'image' THEN 'Photo'
      WHEN NEW.message_type = 'video' THEN 'Video'
      WHEN NEW.message_type = 'audio' THEN 'Voice Message'
      WHEN NEW.message_type = 'file' THEN 'File'
      ELSE 'Message'
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
