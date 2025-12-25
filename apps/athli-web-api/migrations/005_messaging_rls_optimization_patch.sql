-- ================================================
-- ATHLI Messaging RLS Policy Optimization Patch
-- ================================================
-- This patch fixes auth_rls_initplan warnings by wrapping
-- auth.uid() in (select auth.uid()) for all messaging policies
-- ================================================

-- Run this AFTER 004_create_messaging.sql

-- ================================================
-- conversations
-- ================================================
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = participant_1_id OR 
  (select auth.uid()) = participant_2_id
);

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = participant_1_id OR 
  (select auth.uid()) = participant_2_id
);

-- ================================================
-- messages
-- ================================================
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (select auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

CREATE POLICY "Users can edit own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (sender_id = (select auth.uid()))
WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = (select auth.uid()));

-- ================================================
-- message_attachments
-- ================================================
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to their conversations" ON public.message_attachments;

CREATE POLICY "Users can view attachments in their conversations"
ON public.message_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = message_attachments.conversation_id
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

CREATE POLICY "Users can upload attachments to their conversations"
ON public.message_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

-- ================================================
-- message_read_receipts
-- ================================================
DROP POLICY IF EXISTS "Users can view their read receipts" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can update their read receipts" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can insert their read receipts" ON public.message_read_receipts;

CREATE POLICY "Users can view their read receipts"
ON public.message_read_receipts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = message_read_receipts.conversation_id
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

CREATE POLICY "Users can update their read receipts"
ON public.message_read_receipts
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their read receipts"
ON public.message_read_receipts
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

-- ================================================
-- conversation_participants
-- ================================================
DROP POLICY IF EXISTS "Users can view their participant records" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their participant records" ON public.conversation_participants;

CREATE POLICY "Users can view their participant records"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their participant records"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- ================================================
-- Storage Policies - message_attachments bucket
-- ================================================
DROP POLICY IF EXISTS storage_message_attachments_read ON storage.objects;
DROP POLICY IF EXISTS storage_message_attachments_upload ON storage.objects;
DROP POLICY IF EXISTS storage_message_attachments_update ON storage.objects;
DROP POLICY IF EXISTS storage_message_attachments_delete ON storage.objects;

CREATE POLICY storage_message_attachments_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1 FROM public.message_attachments ma
    JOIN public.conversations c ON c.id = ma.conversation_id
    WHERE ma.file_path = storage.objects.name
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

CREATE POLICY storage_message_attachments_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = split_part(storage.objects.name, '/', 1)
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

CREATE POLICY storage_message_attachments_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1 FROM public.message_attachments ma
    JOIN public.conversations c ON c.id = ma.conversation_id
    WHERE ma.file_path = storage.objects.name
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

CREATE POLICY storage_message_attachments_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1 FROM public.message_attachments ma
    JOIN public.conversations c ON c.id = ma.conversation_id
    WHERE ma.file_path = storage.objects.name
    AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
  )
);

-- ================================================
-- Migration Complete
-- ================================================
-- All messaging RLS policies have been optimized to:
-- 1. Wrap auth.uid() in (select auth.uid()) - fixes initplan warnings
-- 2. Scope all policies TO authenticated - proper role isolation
-- ================================================
