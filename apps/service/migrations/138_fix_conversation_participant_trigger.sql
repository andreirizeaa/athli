-- ================================================
-- 138: Fix conversation participant trigger to handle duplicates
-- ================================================
-- The create_participant_records trigger fails if participants already exist.
-- This can happen if a previous transaction partially succeeded.
-- Add ON CONFLICT DO NOTHING to make it idempotent.
-- ================================================

CREATE OR REPLACE FUNCTION public.create_participant_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Create participant record for coach (skip if exists)
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.coach_id, NEW.client_id
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Create participant record for client (skip if exists)
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.client_id, NEW.coach_id
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Create initial read receipt records (skip if exists)
  INSERT INTO public.message_read_receipts (conversation_id, user_id)
  VALUES
    (NEW.id, NEW.coach_id),
    (NEW.id, NEW.client_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
