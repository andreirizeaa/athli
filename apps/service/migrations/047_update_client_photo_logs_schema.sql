-- Migration 047: Update client_photo_logs schema
-- This migration:
-- 1. Removes the notes column from client_photo_logs
-- 2. Renames recorded_date to date
-- 3. Makes date a part of the composite primary key

-- PART 1: Remove notes column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_photo_logs'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.client_photo_logs
        DROP COLUMN notes;
    END IF;
END $$;

-- PART 2: Rename recorded_date to date
DO $$
BEGIN
    -- Rename recorded_date to date if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_photo_logs'
        AND column_name = 'recorded_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_photo_logs'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.client_photo_logs
        RENAME COLUMN recorded_date TO date;
    END IF;

    -- If neither exists, add date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_photo_logs'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.client_photo_logs
        ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Convert to DATE type if it's TIMESTAMPTZ
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_photo_logs'
        AND column_name = 'date'
        AND data_type != 'date'
    ) THEN
        ALTER TABLE public.client_photo_logs
        ALTER COLUMN date TYPE DATE USING date::date;
    END IF;
END $$;

-- PART 3: Update primary key to include date
DO $$
BEGIN
    -- First, check if there's an existing primary key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_photo_logs'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- Get the constraint name
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints
            WHERE table_name = 'client_photo_logs'
            AND constraint_type = 'PRIMARY KEY';

            -- Drop existing primary key
            EXECUTE format('ALTER TABLE public.client_photo_logs DROP CONSTRAINT %I', constraint_name_var);
        END;
    END IF;

    -- Add new composite primary key including date
    -- Assuming the table has id, client_id, coach_id columns
    -- Adjust based on actual schema
    ALTER TABLE public.client_photo_logs
    ADD PRIMARY KEY (id, client_id, coach_id, date);
END $$;

-- PART 4: Add unique constraint to prevent duplicate photos on same date
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_photo_logs'
        AND constraint_name = 'client_photo_logs_client_date_unique'
    ) THEN
        ALTER TABLE public.client_photo_logs
        DROP CONSTRAINT client_photo_logs_client_date_unique;
    END IF;

    -- Add unique constraint for client_id + date
    ALTER TABLE public.client_photo_logs
    ADD CONSTRAINT client_photo_logs_client_date_unique
    UNIQUE (client_id, date);
END $$;

-- PART 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_photo_logs_date
ON public.client_photo_logs(date);

CREATE INDEX IF NOT EXISTS idx_client_photo_logs_client_date
ON public.client_photo_logs(client_id, date);
