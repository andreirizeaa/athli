-- ================================================
-- Conversation Presence
-- ================================================
-- Tracks which users currently have a conversation open (on any device).
-- Used by the message-push-notification edge function to suppress
-- notifications when the recipient is actively viewing the chat.
--
-- Rows are upserted on focus/visibility and heartbeated every 30s.
-- A cron job cleans up stale rows (app crash / missed cleanup).

CREATE TABLE public.conversation_presence (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Index for edge function lookups: "is this user present in this conversation?"
CREATE INDEX idx_conversation_presence_user ON public.conversation_presence (user_id, conversation_id);

-- RLS
ALTER TABLE public.conversation_presence ENABLE ROW LEVEL SECURITY;

-- Users can manage their own presence rows
CREATE POLICY "Users can insert own presence"
  ON public.conversation_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence"
  ON public.conversation_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own presence"
  ON public.conversation_presence FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Conversation participants can read presence (for typing indicators, etc.)
CREATE POLICY "Participants can view presence"
  ON public.conversation_presence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Cron: clean up stale presence rows (older than 5 minutes)
SELECT cron.schedule(
  'clean-stale-conversation-presence',
  '*/5 * * * *',
  $$DELETE FROM public.conversation_presence WHERE last_active_at < now() - interval '5 minutes'$$
);
