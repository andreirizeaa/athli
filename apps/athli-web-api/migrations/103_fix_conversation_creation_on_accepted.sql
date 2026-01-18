-- Migration: Fix conversation creation trigger to handle 'accepted' status
-- Purpose: Migration 094 accidentally reverted the fix from migration 088
--          This restores the 'accepted' status handling for conversation creation
--
-- Issue: When a client signs up via coach's invite code, their status is set to
--        'accepted', but the trigger only fires on 'connected' status, so no
--        conversation is created.

CREATE OR REPLACE FUNCTION public.create_conversation_on_client_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Create conversation when status becomes 'accepted' OR 'connected'
  -- Skip for 'invited', 'bounced', and 'archived' statuses
  IF (NEW.status = 'accepted' OR NEW.status = 'connected')
     AND (OLD IS NULL OR (OLD.status <> 'accepted' AND OLD.status <> 'connected')) THEN

    -- Create conversation (trigger will create participant records automatically)
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (NEW.coach_id, NEW.client_id)
    ON CONFLICT (coach_id, client_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- Create conversations for any existing accepted assignments that don't have conversations
INSERT INTO public.conversations (coach_id, client_id)
SELECT cca.coach_id, cca.client_id
FROM public.coach_client_assignments cca
WHERE cca.status IN ('accepted', 'connected')
  AND NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.coach_id = cca.coach_id AND c.client_id = cca.client_id
  );
