-- ================================================
-- 137: Remove Self-Reference Constraints
-- ================================================
-- A coach can legitimately be their own client (for testing/demo).
-- Remove ALL constraints that prevent self-referencing.
-- ================================================

-- 1. coach_client_assignments
ALTER TABLE public.coach_client_assignments
DROP CONSTRAINT IF EXISTS check_no_self_assignment;

ALTER TABLE public.coach_client_assignments
DROP CONSTRAINT IF EXISTS check_no_self_coaching;

-- 2. conversations
ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS chk_no_self_messaging;

-- 3. conversation_participants
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS chk_cp_no_self;

-- 4. Update get_or_create_conversation function to allow self-messaging
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_coach_id uuid, p_client_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify caller is either the coach or the client in this conversation
  IF auth.uid() != p_coach_id AND auth.uid() != p_client_id THEN
    RAISE EXCEPTION 'Unauthorized: You must be a participant in the conversation';
  END IF;

  -- Note: Self-messaging is allowed (coach can be their own demo client)

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
$$;
