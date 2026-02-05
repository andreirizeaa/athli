-- ================================================
-- 098: Enable Realtime Publication for Messages
--
-- Adds messages table to Supabase Realtime publication.
-- RLS authorization is already handled by existing "Users view own messages" policy.
-- ================================================

-- Enable realtime for messages table (idempotent - will not error if already added)
-- This is required for Supabase Realtime to broadcast changes for this table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END;
$$;

-- Also add conversations table to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END;
$$;

-- Note: RLS authorization for realtime broadcasts is handled by existing policies:
-- - "Users view own messages" (migration 095) - allows SELECT on messages in user's conversations
-- - "Users view their own conversations" - allows SELECT on user's conversations
