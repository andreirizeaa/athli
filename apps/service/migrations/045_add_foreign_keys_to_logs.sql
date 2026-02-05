-- Migration 045: Add foreign key relationships and missing columns for logs
-- This migration:
-- 1. Adds missing columns (status, date) to log tables
-- 2. Establishes proper foreign key relationships between logs and their parent tables
--    after the decoupling migration 037 dropped them with CASCADE

-- PART 1: Add missing columns to client_habit_logs
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_habit_logs'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.client_habit_logs
        ADD COLUMN status TEXT CHECK (status IN ('completed', 'skipped', 'partial'));

        -- Backfill from existing 'completed' boolean column if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'client_habit_logs'
            AND column_name = 'completed'
        ) THEN
            UPDATE public.client_habit_logs
            SET status = CASE WHEN completed = true THEN 'completed' ELSE 'skipped' END
            WHERE status IS NULL;
        END IF;
    END IF;

    -- Rename recorded_date to date for consistency
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_habit_logs'
        AND column_name = 'recorded_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_habit_logs'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.client_habit_logs
        RENAME COLUMN recorded_date TO date;
    END IF;

    -- If neither exists, add date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_habit_logs'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.client_habit_logs
        ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Change date to DATE type if it's TIMESTAMPTZ
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_habit_logs'
        AND column_name = 'date'
        AND data_type != 'date'
    ) THEN
        ALTER TABLE public.client_habit_logs
        ALTER COLUMN date TYPE DATE USING date::date;
    END IF;
END $$;

-- PART 2: Add missing columns to client_metric_logs
DO $$
BEGIN
    -- Rename measured_at to date if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_metric_logs'
        AND column_name = 'measured_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_metric_logs'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.client_metric_logs
        RENAME COLUMN measured_at TO date;
    END IF;

    -- If neither exists, add date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_metric_logs'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.client_metric_logs
        ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Change date to DATE type if it's TIMESTAMPTZ
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_metric_logs'
        AND column_name = 'date'
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE public.client_metric_logs
        ALTER COLUMN date TYPE DATE USING date::date;
    END IF;
END $$;

-- PART 3: Add foreign key for client_habit_logs -> client_habits
DO $$
BEGIN
    -- Check if the assignment_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_habit_logs'
        AND column_name = 'assignment_id'
    ) THEN
        ALTER TABLE public.client_habit_logs
        ADD COLUMN assignment_id UUID;
    END IF;

    -- Drop existing constraint if it exists (to allow re-running)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_habit_logs'
        AND constraint_name = 'client_habit_logs_assignment_id_fkey'
    ) THEN
        ALTER TABLE public.client_habit_logs
        DROP CONSTRAINT client_habit_logs_assignment_id_fkey;
    END IF;

    -- Add the foreign key constraint
    -- Using the unique index on client_habits(id) instead of the composite PK
    ALTER TABLE public.client_habit_logs
    ADD CONSTRAINT client_habit_logs_assignment_id_fkey
    FOREIGN KEY (assignment_id)
    REFERENCES public.client_habits(id)
    ON DELETE CASCADE;

    -- Ensure assignment_id is not null for existing records
    -- (Assuming all logs should have an assignment_id)
    ALTER TABLE public.client_habit_logs
    ALTER COLUMN assignment_id SET NOT NULL;
END $$;

-- Add foreign key for client_metric_logs -> client_metrics
DO $$
BEGIN
    -- Check if the assignment_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_metric_logs'
        AND column_name = 'assignment_id'
    ) THEN
        ALTER TABLE public.client_metric_logs
        ADD COLUMN assignment_id UUID;
    END IF;

    -- Drop existing constraint if it exists (to allow re-running)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_metric_logs'
        AND constraint_name = 'client_metric_logs_assignment_id_fkey'
    ) THEN
        ALTER TABLE public.client_metric_logs
        DROP CONSTRAINT client_metric_logs_assignment_id_fkey;
    END IF;

    -- Add the foreign key constraint
    -- Using the unique index on client_metrics(id) instead of the composite PK
    ALTER TABLE public.client_metric_logs
    ADD CONSTRAINT client_metric_logs_assignment_id_fkey
    FOREIGN KEY (assignment_id)
    REFERENCES public.client_metrics(id)
    ON DELETE CASCADE;

    -- Ensure assignment_id is not null for existing records
    -- (Assuming all logs should have an assignment_id)
    ALTER TABLE public.client_metric_logs
    ALTER COLUMN assignment_id SET NOT NULL;
END $$;

-- Create indexes for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_client_habit_logs_assignment_id
ON public.client_habit_logs(assignment_id);

CREATE INDEX IF NOT EXISTS idx_client_metric_logs_assignment_id
ON public.client_metric_logs(assignment_id);

-- Add composite index for common query patterns (client_id + assignment_id)
CREATE INDEX IF NOT EXISTS idx_client_habit_logs_client_assignment
ON public.client_habit_logs(client_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_client_metric_logs_client_assignment
ON public.client_metric_logs(client_id, assignment_id);

-- Update RLS policies for log tables to ensure proper access control
-- client_habit_logs
DROP POLICY IF EXISTS chl_all ON public.client_habit_logs;
CREATE POLICY chl_all ON public.client_habit_logs
    FOR ALL TO authenticated
    USING (client_id = auth.uid() OR coach_id = auth.uid())
    WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());

-- client_metric_logs
DROP POLICY IF EXISTS cml_all ON public.client_metric_logs;
CREATE POLICY cml_all ON public.client_metric_logs
    FOR ALL TO authenticated
    USING (client_id = auth.uid() OR coach_id = auth.uid())
    WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());
