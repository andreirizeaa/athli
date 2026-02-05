-- Migration: Add fk_msg_parent foreign key constraint to messages table
-- This constraint enables self-referencing relationships for message threading
-- Date: 2026-01-15

-- Add the foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_msg_parent'
        AND table_name = 'messages'
        AND table_schema = 'public'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.messages
        ADD CONSTRAINT fk_msg_parent
        FOREIGN KEY (parent_message_id)
        REFERENCES public.messages(id)
        ON DELETE SET NULL;

        RAISE NOTICE 'Foreign key constraint fk_msg_parent added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_msg_parent already exists';
    END IF;
END $$;

-- Create an index on parent_message_id for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id
ON public.messages(parent_message_id)
WHERE parent_message_id IS NOT NULL;

-- Rollback instructions (if needed):
-- ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS fk_msg_parent;
-- DROP INDEX IF EXISTS public.idx_messages_parent_message_id;
