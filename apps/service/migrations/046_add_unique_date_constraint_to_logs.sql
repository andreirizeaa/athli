-- Migration 046: Add unique constraint on date for log tables
-- This ensures only one log per assignment per date

-- Add unique constraint for client_habit_logs (assignment_id + date)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_habit_logs'
        AND constraint_name = 'client_habit_logs_assignment_date_unique'
    ) THEN
        ALTER TABLE public.client_habit_logs
        DROP CONSTRAINT client_habit_logs_assignment_date_unique;
    END IF;

    -- Add the unique constraint
    ALTER TABLE public.client_habit_logs
    ADD CONSTRAINT client_habit_logs_assignment_date_unique
    UNIQUE (assignment_id, date);
END $$;

-- Add unique constraint for client_metric_logs (assignment_id + date)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_metric_logs'
        AND constraint_name = 'client_metric_logs_assignment_date_unique'
    ) THEN
        ALTER TABLE public.client_metric_logs
        DROP CONSTRAINT client_metric_logs_assignment_date_unique;
    END IF;

    -- Add the unique constraint
    ALTER TABLE public.client_metric_logs
    ADD CONSTRAINT client_metric_logs_assignment_date_unique
    UNIQUE (assignment_id, date);
END $$;
