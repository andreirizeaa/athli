-- Add sender_role to messages for self-conversation support (demo client where coach_id = client_id)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT;
