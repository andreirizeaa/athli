-- ================================================
-- ATHLI Messaging System v2: WhatsApp-like Realtime Messaging
-- ================================================
-- This migration completely rebuilds the messaging system with:
-- - Optimized 1-1 conversations (coach-client)
-- - Message status tracking (sending→sent→read OR failed)
-- - Message threading (replies)
-- - Predefined reactions (👍❤️😂😮😢🙏)
-- - Read receipts (double checkmarks)
-- - File attachments (images, videos, audio, PDFs)
-- - Realtime subscriptions
-- - Optimistic UI updates support
-- - Comprehensive RLS policies
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Drop Old Messaging Tables and Objects
-- ================================================

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.message_read_receipts CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.create_conversation_participants() CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS public.create_participant_records() CASCADE;
DROP FUNCTION IF EXISTS public.update_message_status_on_read() CASCADE;
DROP FUNCTION IF EXISTS public.create_conversation_on_client_assignment() CASCADE;

-- Drop storage policies (storage.objects always exists)
DROP POLICY IF EXISTS "storage_message_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_message_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_message_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_message_attachments_delete" ON storage.objects;

-- ================================================
-- STEP 2: Create New Tables
-- ================================================

-- 2.1: conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Coach and client participants
  coach_id UUID NOT NULL,
  client_id UUID NOT NULL,

  -- Denormalized for conversation list performance
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_type TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign keys
  CONSTRAINT fk_conv_coach
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_client
    FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT chk_no_self_messaging
    CHECK (coach_id <> client_id),
  CONSTRAINT uq_conversation_coach_client
    UNIQUE (coach_id, client_id)
);

-- Indexes for conversation lookup and sorting
CREATE INDEX idx_conv_coach ON public.conversations(coach_id);
CREATE INDEX idx_conv_client ON public.conversations(client_id);
CREATE INDEX idx_conv_last_message ON public.conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conv_coach_last_msg ON public.conversations(coach_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conv_client_last_msg ON public.conversations(client_id, last_message_at DESC NULLS LAST);

-- 2.2: messages table
CREATE TABLE public.messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,

  -- Content
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),

  -- Threading support
  parent_message_id UUID,

  -- Status tracking (sending → sent → read OR failed)
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sending', 'sent', 'read', 'failed')),

  -- Timestamps
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,

  -- Soft delete (WhatsApp-style: delete for me vs delete for everyone)
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by_sender BOOLEAN DEFAULT FALSE,
  deleted_by_recipient BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign keys
  CONSTRAINT fk_msg_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_parent
    FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE SET NULL,

  -- Content validation
  CONSTRAINT chk_content_required
    CHECK (
      (message_type = 'text' AND content IS NOT NULL) OR
      (message_type IN ('image', 'video', 'audio', 'file'))
    )
);

-- Indexes for message queries
CREATE INDEX idx_msg_conversation_sent ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX idx_msg_sender ON public.messages(sender_id);
CREATE INDEX idx_msg_sent_at ON public.messages(sent_at DESC);
CREATE INDEX idx_msg_parent ON public.messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_msg_status ON public.messages(conversation_id, status) WHERE status IN ('sending', 'failed');

-- Partial index for active (non-deleted) messages
CREATE INDEX idx_msg_active ON public.messages(conversation_id, sent_at DESC) WHERE is_deleted = FALSE;

-- 2.3: message_attachments table
CREATE TABLE public.message_attachments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL, -- Denormalized for RLS performance

  -- Storage details
  bucket_id TEXT NOT NULL DEFAULT 'message_attachments',
  file_path TEXT NOT NULL, -- {conversation_id}/{message_id}/{filename}
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,

  -- Media metadata (for UI rendering without fetching files)
  thumbnail_path TEXT, -- For images/videos
  width INTEGER, -- For images/videos
  height INTEGER,
  duration_seconds INTEGER, -- For audio/video

  -- Upload status tracking (for retry logic)
  upload_status TEXT NOT NULL DEFAULT 'completed'
    CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign keys
  CONSTRAINT fk_attach_message
    FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_attach_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT chk_bucket_id
    CHECK (bucket_id = 'message_attachments'),
  CONSTRAINT chk_file_path_format
    CHECK (file_path ~ '^[0-9a-f-]+/[0-9a-f-]+/.+$')
);

-- Indexes
CREATE INDEX idx_attach_message ON public.message_attachments(message_id);
CREATE INDEX idx_attach_conversation ON public.message_attachments(conversation_id);
CREATE UNIQUE INDEX uq_attach_file_path ON public.message_attachments(bucket_id, file_path);

-- 2.4: message_reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL, -- Denormalized for RLS performance
  user_id UUID NOT NULL,

  -- Predefined reactions (WhatsApp style)
  reaction TEXT NOT NULL CHECK (reaction IN ('👍', '❤️', '😂', '😮', '😢', '🙏')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign keys
  CONSTRAINT fk_reaction_message
    FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_reaction_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_reaction_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Only one reaction per user per message
  CONSTRAINT uq_reaction_user_message
    UNIQUE (message_id, user_id)
);

-- Indexes
CREATE INDEX idx_reaction_message ON public.message_reactions(message_id);
CREATE INDEX idx_reaction_user ON public.message_reactions(user_id);
CREATE INDEX idx_reaction_conversation ON public.message_reactions(conversation_id);

-- 2.5: message_read_receipts table
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Watermark-style read tracking (last message read)
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign keys
  CONSTRAINT fk_receipt_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_receipt_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_receipt_message
    FOREIGN KEY (last_read_message_id) REFERENCES public.messages(id) ON DELETE SET NULL,

  -- One receipt record per user per conversation
  CONSTRAINT uq_receipt_user_conversation
    UNIQUE (conversation_id, user_id)
);

-- Indexes
CREATE INDEX idx_receipt_conversation ON public.message_read_receipts(conversation_id);
CREATE INDEX idx_receipt_user ON public.message_read_receipts(user_id);
CREATE INDEX idx_receipt_message ON public.message_read_receipts(last_read_message_id) WHERE last_read_message_id IS NOT NULL;

-- 2.6: conversation_participants table (per-user settings)
CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  other_user_id UUID NOT NULL, -- Denormalized for convenience

  -- Per-user settings
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

  archived_at TIMESTAMPTZ,
  muted_at TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (conversation_id, user_id),

  -- Foreign keys
  CONSTRAINT fk_cp_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_other_user
    FOREIGN KEY (other_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT chk_cp_no_self
    CHECK (user_id <> other_user_id)
);

-- Indexes for conversation list queries
CREATE INDEX idx_cp_user ON public.conversation_participants(user_id);
CREATE INDEX idx_cp_user_archived ON public.conversation_participants(user_id, is_archived);
CREATE INDEX idx_cp_user_pinned ON public.conversation_participants(user_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_cp_other_user ON public.conversation_participants(other_user_id);

-- ================================================
-- STEP 3: Create Helper Functions
-- ================================================

-- 3.1: Function to check if user is participant in conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3.2: Function to get or create conversation between coach and client
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_coach_id UUID,
  p_client_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 4: Create Trigger Functions
-- ================================================

-- 4.1: Trigger function to update conversation timestamp on new/updated message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 4.2: Trigger function to create participant records on new conversation
CREATE OR REPLACE FUNCTION public.create_participant_records()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 4.3: Trigger function to update message status on read receipt update
CREATE OR REPLACE FUNCTION public.update_message_status_on_read()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 4.4: Trigger function to auto-create conversation when coach adds client
CREATE OR REPLACE FUNCTION public.create_conversation_on_client_assignment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- ================================================
-- STEP 5: Create Triggers
-- ================================================

-- Trigger: Update conversation timestamp on new/updated message
DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON public.messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT OR UPDATE OF content, is_deleted, message_type ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- Trigger: Create participant records on new conversation
DROP TRIGGER IF EXISTS trg_create_participant_records ON public.conversations;
CREATE TRIGGER trg_create_participant_records
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_participant_records();

-- Trigger: Update message status on read receipt update
DROP TRIGGER IF EXISTS trg_update_message_status_on_read ON public.message_read_receipts;
CREATE TRIGGER trg_update_message_status_on_read
  AFTER INSERT OR UPDATE OF last_read_at ON public.message_read_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_message_status_on_read();

-- Trigger: Auto-create conversation when coach adds client
DROP TRIGGER IF EXISTS trg_create_conversation_on_client_assignment ON public.coach_client_assignments;
CREATE TRIGGER trg_create_conversation_on_client_assignment
  AFTER INSERT OR UPDATE OF status ON public.coach_client_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_conversation_on_client_assignment();

-- Trigger: Auto-update updated_at on conversations
DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on conversation_participants
DROP TRIGGER IF EXISTS trg_participants_updated_at ON public.conversation_participants;
CREATE TRIGGER trg_participants_updated_at
  BEFORE UPDATE ON public.conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on message_read_receipts
DROP TRIGGER IF EXISTS trg_receipts_updated_at ON public.message_read_receipts;
CREATE TRIGGER trg_receipts_updated_at
  BEFORE UPDATE ON public.message_read_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- STEP 6: Enable Row Level Security
-- ================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 7: RLS Policies - conversations
-- ================================================

-- Users can view conversations they participate in
CREATE POLICY "Users view own conversations"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = coach_id OR
    auth.uid() = client_id
  );

-- Users can create conversations (must be participant)
CREATE POLICY "Users create own conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id OR
    auth.uid() = client_id
  );

-- ================================================
-- STEP 8: RLS Policies - messages
-- ================================================

-- Users can view messages in their conversations
CREATE POLICY "Users view own messages"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can edit their own messages
CREATE POLICY "Users edit own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Users can delete (soft delete) their own messages
CREATE POLICY "Users delete own messages"
  ON public.messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- ================================================
-- STEP 9: RLS Policies - message_attachments
-- ================================================

-- Users can view attachments in their conversations
CREATE POLICY "Users view attachments in conversations"
  ON public.message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_attachments.conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can upload attachments to their conversations
CREATE POLICY "Users upload attachments to conversations"
  ON public.message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can update attachments in their conversations (for upload status)
CREATE POLICY "Users update attachments in conversations"
  ON public.message_attachments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- ================================================
-- STEP 10: RLS Policies - message_reactions
-- ================================================

-- Users can view reactions in their conversations
CREATE POLICY "Users view reactions"
  ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_reactions.conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users add reactions"
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users remove own reactions"
  ON public.message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- ================================================
-- STEP 11: RLS Policies - message_read_receipts
-- ================================================

-- Users can view read receipts in their conversations
CREATE POLICY "Users view read receipts"
  ON public.message_read_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_read_receipts.conversation_id
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can update their own read receipts
CREATE POLICY "Users update own read receipts"
  ON public.message_read_receipts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own read receipts
CREATE POLICY "Users insert own read receipts"
  ON public.message_read_receipts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ================================================
-- STEP 12: RLS Policies - conversation_participants
-- ================================================

-- Users can view their own participant records
CREATE POLICY "Users view own participant records"
  ON public.conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own participant records (archive, mute, pin)
CREATE POLICY "Users update own participant records"
  ON public.conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================
-- STEP 13: Storage Policies - message_attachments bucket
-- ================================================

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('message_attachments', 'message_attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Users can read attachments from their conversations
CREATE POLICY "storage_message_attachments_read"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'message_attachments' AND
    EXISTS (
      SELECT 1 FROM public.message_attachments ma
      JOIN public.conversations c ON c.id = ma.conversation_id
      WHERE ma.file_path = storage.objects.name
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can upload attachments to their conversations
CREATE POLICY "storage_message_attachments_upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'message_attachments' AND
    -- Path format: {conversation_id}/{message_id}/{filename}
    -- Extract conversation_id from path and verify participation
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can update attachments in their conversations
CREATE POLICY "storage_message_attachments_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'message_attachments' AND
    EXISTS (
      SELECT 1 FROM public.message_attachments ma
      JOIN public.conversations c ON c.id = ma.conversation_id
      WHERE ma.file_path = storage.objects.name
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Users can delete attachments from their conversations
CREATE POLICY "storage_message_attachments_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'message_attachments' AND
    EXISTS (
      SELECT 1 FROM public.message_attachments ma
      JOIN public.conversations c ON c.id = ma.conversation_id
      WHERE ma.file_path = storage.objects.name
      AND (c.coach_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- ================================================
-- STEP 14: Enable Realtime
-- ================================================

-- Enable realtime for messages (most important for instant messaging)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for read receipts (for "seen" indicators)
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;

-- Enable realtime for reactions (for instant reaction updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Enable realtime for conversation participants (for archive/mute/pin updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Enable realtime for conversations (for conversation list updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ================================================
-- STEP 15: Grant Permissions
-- ================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_read_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

-- ================================================
-- STEP 16: Backfill Conversations for Existing Clients
-- ================================================

-- Create conversations for all existing connected coach-client pairs
INSERT INTO public.conversations (coach_id, client_id)
SELECT coach_id, client_id
FROM public.coach_client_assignments
WHERE status = 'connected'
ON CONFLICT (coach_id, client_id) DO NOTHING;

COMMIT;

-- ================================================
-- Migration Complete
-- ================================================
-- Next steps:
-- 1. Update TypeScript types to match new schema
-- 2. Implement realtime hooks in mobile app
-- 3. Replace mock services with Supabase queries
-- 4. Implement optimistic UI updates
-- 5. Test messaging flow end-to-end
-- ================================================
