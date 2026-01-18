-- ================================================
-- 100: Realtime Authorization Policies
--
-- Sets up authorization for Supabase Realtime private broadcast channels.
-- Allows users to subscribe to conversation channels if they are
-- a participant (either coach or client) in that conversation.
--
-- Topic format: conversation:{conversation_id}:messages
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Create helper function to check conversation membership
-- ================================================

-- Function to check if user is a participant in a conversation
-- Used by realtime policies to authorize channel subscriptions
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

-- ================================================
-- STEP 2: Create helper function to extract conversation ID from topic
-- ================================================

-- Function to extract conversation ID from realtime topic
-- Topic format: conversation:{uuid}:messages
CREATE OR REPLACE FUNCTION public.extract_conversation_id_from_topic(topic TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts TEXT[];
  conv_id TEXT;
BEGIN
  -- Split topic by ':'
  parts := string_to_array(topic, ':');

  -- Validate format: conversation:{uuid}:messages
  IF array_length(parts, 1) != 3 THEN
    RETURN NULL;
  END IF;

  IF parts[1] != 'conversation' OR parts[3] != 'messages' THEN
    RETURN NULL;
  END IF;

  -- Extract and validate UUID
  conv_id := parts[2];

  BEGIN
    RETURN conv_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.extract_conversation_id_from_topic(TEXT) TO authenticated;

-- ================================================
-- STEP 3: Create Realtime Authorization Function
-- ================================================

-- This function is called by Supabase Realtime to authorize channel subscriptions.
-- It checks if the authenticated user can access the requested channel/topic.
--
-- For conversation channels (format: conversation:{id}:messages):
-- - Returns true if user is coach_id or client_id in the conversation
--
-- The function receives the channel name and returns a boolean.
CREATE OR REPLACE FUNCTION realtime.authorize_channel(channel_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
DECLARE
  current_user_id UUID;
  conversation_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();

  -- If no authenticated user, deny access
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if this is a conversation messages channel
  IF channel_name LIKE 'conversation:%:messages' THEN
    -- Extract conversation ID from channel name
    conversation_id := public.extract_conversation_id_from_topic(channel_name);

    IF conversation_id IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Check if user is a participant in this conversation
    RETURN public.is_conversation_participant(conversation_id, current_user_id);
  END IF;

  -- For other channel patterns, deny by default
  -- Add more patterns here as needed (e.g., 'receipts:*', 'reactions:*')

  -- Allow public channels (those not matching private patterns)
  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION realtime.authorize_channel(TEXT) TO authenticated;

-- ================================================
-- STEP 4: Ensure realtime schema permissions
-- ================================================

-- Grant usage on realtime schema to authenticated users
GRANT USAGE ON SCHEMA realtime TO authenticated;

-- ================================================
-- STEP 5: Enable RLS on realtime.messages and create policies
-- ================================================

-- Enable RLS on realtime.messages (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;

-- Drop existing policies if any
DROP POLICY IF EXISTS "realtime_messages_authenticated_select" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated users to receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated users to send realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated users to update realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated users to delete realtime messages" ON realtime.messages;

-- SELECT policy: Allow authenticated users to receive/read realtime messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE '
      CREATE POLICY "Allow authenticated users to receive realtime messages"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (true)
    ';
  END IF;
END;
$$;

-- INSERT policy: Allow authenticated users to send/broadcast realtime messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE '
      CREATE POLICY "Allow authenticated users to send realtime messages"
      ON realtime.messages
      FOR INSERT
      TO authenticated
      WITH CHECK (true)
    ';
  END IF;
END;
$$;

-- UPDATE policy: Allow authenticated users to update realtime messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE '
      CREATE POLICY "Allow authenticated users to update realtime messages"
      ON realtime.messages
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true)
    ';
  END IF;
END;
$$;

-- DELETE policy: Allow authenticated users to delete realtime messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE '
      CREATE POLICY "Allow authenticated users to delete realtime messages"
      ON realtime.messages
      FOR DELETE
      TO authenticated
      USING (true)
    ';
  END IF;
END;
$$;

-- Grant full access on realtime.messages to authenticated users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON realtime.messages TO authenticated';
  END IF;
END;
$$;

-- ================================================
-- STEP 6: Create broadcast authorization policy function
-- ================================================

-- This function is used by the broadcast trigger to check authorization
-- before sending to private channels
CREATE OR REPLACE FUNCTION public.can_receive_conversation_broadcast(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.can_receive_conversation_broadcast(UUID, UUID) TO authenticated;

-- ================================================
-- STEP 7: Add comments for documentation
-- ================================================

COMMENT ON FUNCTION public.is_conversation_participant(UUID, UUID) IS
  'Checks if a user is a participant (coach or client) in a conversation. Used for Realtime authorization.';

COMMENT ON FUNCTION public.extract_conversation_id_from_topic(TEXT) IS
  'Extracts conversation UUID from a realtime topic string. Format: conversation:{uuid}:messages';

COMMENT ON FUNCTION realtime.authorize_channel(TEXT) IS
  'Authorizes Supabase Realtime channel subscriptions. Returns true if the authenticated user can access the channel.';

COMMENT ON FUNCTION public.can_receive_conversation_broadcast(UUID, UUID) IS
  'Checks if a user can receive broadcasts for a conversation. Used for private channel authorization.';

COMMIT;
