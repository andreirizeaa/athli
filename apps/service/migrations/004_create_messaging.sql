-- ================================================
-- ATHLI Messaging System: 1-1 Realtime Messaging
-- ================================================
-- This migration creates a complete messaging system with:
-- - 1-1 conversations (coach-client)
-- - Messages with attachments
-- - Read receipts
-- - Realtime capabilities
-- - Comprehensive RLS policies
-- ================================================

-- ================================================
-- STEP 0: Extensions
-- ================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure Storage Bucket Exists (Idempotent)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message_attachments', 'message_attachments', false) 
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- STEP 1: Drop existing objects (Idempotent)
-- ================================================
-- Note: DROP POLICY will fail if table doesn't exist, so we drop tables first
-- Storage policies can be dropped safely as storage.objects always exists

-- Drop tables (CASCADE will drop associated policies)
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.message_read_receipts CASCADE;
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.create_conversation_participants() CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID) CASCADE;

-- Drop storage policies (storage.objects always exists)
DROP POLICY IF EXISTS "storage_message_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_message_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_message_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_message_attachments_delete" ON storage.objects;

-- ================================================
-- STEP 2: conversations table
-- ================================================
CREATE TABLE public.conversations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Enforce 1-1 relationship with ordered UUIDs
  participant_1_id UUID NOT NULL,
  participant_2_id UUID NOT NULL,
  
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_conv_participant_1
    FOREIGN KEY (participant_1_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_participant_2
    FOREIGN KEY (participant_2_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    
  -- Ensure participant_1 is always the lower UUID for deterministic lookup
  CONSTRAINT chk_participant_order
    CHECK (participant_1_id < participant_2_id),
    
  -- Ensure no self-messaging
  CONSTRAINT chk_no_self_messaging
    CHECK (participant_1_id <> participant_2_id),
    
  -- Unique constraint: only one conversation per pair
  CONSTRAINT uq_conversation_participants
    UNIQUE (participant_1_id, participant_2_id)
);

-- Indexes for conversation lookup and sorting
CREATE INDEX idx_conv_participant_1 ON public.conversations(participant_1_id);
CREATE INDEX idx_conv_participant_2 ON public.conversations(participant_2_id);
CREATE INDEX idx_conv_last_message ON public.conversations(last_message_at DESC NULLS LAST);

-- Composite index for user's conversation list
CREATE INDEX idx_conv_p1_last_msg ON public.conversations(participant_1_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conv_p2_last_msg ON public.conversations(participant_2_id, last_message_at DESC NULLS LAST);

-- ================================================
-- STEP 3: messages table
-- ================================================
CREATE TABLE public.messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'video', 'file', 'audio', 'system')),
  
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  
  -- Soft delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_msg_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    
  -- Content validation
  CONSTRAINT chk_content_or_attachment
    CHECK (
      (message_type = 'text' AND content IS NOT NULL) OR
      (message_type IN ('image', 'video', 'file', 'audio') AND content IS NULL) OR
      (message_type = 'system')
    )
);

-- Indexes for message queries
CREATE INDEX idx_msg_conversation_sent ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX idx_msg_sender ON public.messages(sender_id);
CREATE INDEX idx_msg_sent_at ON public.messages(sent_at DESC);

-- Partial index for active (non-deleted) messages
CREATE INDEX idx_msg_active ON public.messages(conversation_id, sent_at DESC) 
  WHERE is_deleted = FALSE;

-- ================================================
-- STEP 4: message_attachments table
-- ================================================
CREATE TABLE public.message_attachments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL, -- Denormalized for RLS performance
  
  bucket_id TEXT NOT NULL DEFAULT 'message_attachments',
  file_path TEXT NOT NULL, -- {conversation_id}/{message_id}/{filename}
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  
  -- Optional metadata
  thumbnail_path TEXT, -- For images/videos
  duration_seconds INTEGER, -- For audio/video
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_attach_message
    FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_attach_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
    
  CONSTRAINT chk_bucket_id 
    CHECK (bucket_id = 'message_attachments'),
    
  -- Ensure file_path follows convention
  CONSTRAINT chk_file_path_format
    CHECK (file_path ~ '^[0-9a-f-]+/[0-9a-f-]+/.+$')
);

-- Indexes
CREATE INDEX idx_attach_message ON public.message_attachments(message_id);
CREATE INDEX idx_attach_conversation ON public.message_attachments(conversation_id);
CREATE UNIQUE INDEX uq_attach_file_path ON public.message_attachments(bucket_id, file_path);

-- ================================================
-- STEP 5: message_read_receipts table
-- ================================================
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
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
-- FK index for last_read_message_id (linter requirement, nullable)
CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts(last_read_message_id) WHERE last_read_message_id IS NOT NULL;

-- ================================================
-- STEP 6: conversation_participants table
-- ================================================
-- Denormalized table for easier querying and per-user settings
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
  
  CONSTRAINT fk_cp_conversation
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_other_user
    FOREIGN KEY (other_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    
  CONSTRAINT chk_cp_no_self
    CHECK (user_id <> other_user_id)
);

-- Indexes for conversation list queries
CREATE INDEX idx_cp_user ON public.conversation_participants(user_id);
CREATE INDEX idx_cp_user_archived ON public.conversation_participants(user_id, is_archived);
CREATE INDEX idx_cp_user_pinned ON public.conversation_participants(user_id, is_pinned) 
  WHERE is_pinned = TRUE;
-- FK index for other_user_id (linter requirement)
CREATE INDEX idx_conversation_participants_other_user_id ON public.conversation_participants(other_user_id);

-- ================================================
-- STEP 7: Helper Functions
-- ================================================

-- 7.1: Function to check if user is participant in conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (participant_1_id = p_user_id OR participant_2_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7.2: Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participant_1_id UUID;
  v_participant_2_id UUID;
BEGIN
  -- Ensure no self-messaging
  IF p_user1_id = p_user2_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Order UUIDs consistently (lower first)
  IF p_user1_id < p_user2_id THEN
    v_participant_1_id := p_user1_id;
    v_participant_2_id := p_user2_id;
  ELSE
    v_participant_1_id := p_user2_id;
    v_participant_2_id := p_user1_id;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE participant_1_id = v_participant_1_id
    AND participant_2_id = v_participant_2_id;
  
  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_1_id, participant_2_id)
    VALUES (v_participant_1_id, v_participant_2_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3: Trigger function to update conversation timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.sent_at,
    last_message_preview = CASE
      WHEN NEW.is_deleted THEN NULL
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Image'
      WHEN NEW.message_type = 'video' THEN '🎥 Video'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      WHEN NEW.message_type = 'audio' THEN '🎵 Audio'
      ELSE 'Message'
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7.4: Trigger function to create participant records
CREATE OR REPLACE FUNCTION public.create_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Create participant record for participant_1
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.participant_1_id, NEW.participant_2_id
  );
  
  -- Create participant record for participant_2
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.participant_2_id, NEW.participant_1_id
  );
  
  -- Create initial read receipt records
  INSERT INTO public.message_read_receipts (conversation_id, user_id)
  VALUES 
    (NEW.id, NEW.participant_1_id),
    (NEW.id, NEW.participant_2_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- STEP 8: Create Triggers
-- ================================================

-- Trigger: Update conversation timestamp on new message
DROP TRIGGER IF EXISTS trg_update_conversation_timestamp ON public.messages;
CREATE TRIGGER trg_update_conversation_timestamp
  AFTER INSERT OR UPDATE OF content, is_deleted ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Trigger: Create participant records on new conversation
DROP TRIGGER IF EXISTS trg_create_conversation_participants ON public.conversations;
CREATE TRIGGER trg_create_conversation_participants
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_conversation_participants();

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
-- STEP 9: Enable Row Level Security
-- ================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 10: RLS Policies - conversations
-- ================================================

-- Users can view conversations they participate in
CREATE POLICY "Users can view their conversations"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = participant_1_id OR 
    auth.uid() = participant_2_id
  );

-- Users can create conversations (via function, but allow direct insert too)
CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = participant_1_id OR 
    auth.uid() = participant_2_id
  );

-- ================================================
-- STEP 11: RLS Policies - messages
-- ================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view their messages"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- Users can edit their own messages
CREATE POLICY "Users can edit own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Users can delete (soft delete) their own messages
CREATE POLICY "Users can delete own messages"
  ON public.messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- ================================================
-- STEP 12: RLS Policies - message_attachments
-- ================================================

-- Users can view attachments in their conversations
CREATE POLICY "Users can view attachments in their conversations"
  ON public.message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_attachments.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- Users can upload attachments to their conversations
CREATE POLICY "Users can upload attachments to their conversations"
  ON public.message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- ================================================
-- STEP 13: RLS Policies - message_read_receipts
-- ================================================

-- Users can view read receipts in their conversations
CREATE POLICY "Users can view their read receipts"
  ON public.message_read_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_read_receipts.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- Users can update their own read receipts
CREATE POLICY "Users can update their read receipts"
  ON public.message_read_receipts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own read receipts (via trigger, but allow manual too)
CREATE POLICY "Users can insert their read receipts"
  ON public.message_read_receipts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ================================================
-- STEP 14: RLS Policies - conversation_participants
-- ================================================

-- Users can view their own participant records
CREATE POLICY "Users can view their participant records"
  ON public.conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own participant records (archive, mute, pin)
CREATE POLICY "Users can update their participant records"
  ON public.conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================
-- STEP 15: Storage Policies - message_attachments bucket
-- ================================================

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
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
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
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
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
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
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
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- ================================================
-- STEP 16: Enable Realtime
-- ================================================

-- Enable realtime for messages (most important for instant messaging)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for read receipts (for "seen" indicators)
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;

-- Enable realtime for conversation participants (for archive/mute/pin updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Enable realtime for conversations (for conversation list updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ================================================
-- STEP 17: Grant Permissions
-- ================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_read_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

-- ================================================
-- Migration Complete
-- ================================================
-- Next steps:
-- 1. Create message_attachments storage bucket in Supabase Storage
-- 2. Configure bucket policies (see setup_messaging.md)
-- 3. Test realtime subscriptions
-- 4. Implement frontend messaging UI
-- ================================================
