-- Migration 048: Add coach_id and submission_date to composite primary keys in log tables
-- This migration updates the primary keys for client_checkin_logs and client_questionnaire_logs
-- to include (id, coach_id, submission_date) for better data isolation and querying

DO $$
DECLARE
    r record;
BEGIN
    -- 1. client_checkin_logs: Update PK to (id, coach_id, submission_date)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_checkin_logs') THEN
        -- Drop existing PK constraint
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_name = 'client_checkin_logs' AND constraint_type = 'PRIMARY KEY'
        LOOP
            EXECUTE 'ALTER TABLE public.client_checkin_logs DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
        END LOOP;

        -- Add new composite PK
        ALTER TABLE public.client_checkin_logs
        ADD CONSTRAINT client_checkin_logs_pkey
        PRIMARY KEY (id, coach_id, submission_date);

        RAISE NOTICE 'Updated client_checkin_logs primary key to (id, coach_id, submission_date)';
    END IF;

    -- 2. client_questionnaire_logs: Add submission_date column if it doesn't exist, then update PK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_questionnaire_logs') THEN
        -- Add submission_date column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'client_questionnaire_logs' AND column_name = 'submission_date'
        ) THEN
            ALTER TABLE public.client_questionnaire_logs
            ADD COLUMN submission_date DATE NOT NULL DEFAULT CURRENT_DATE;

            RAISE NOTICE 'Added submission_date column to client_questionnaire_logs';
        END IF;

        -- Drop existing PK constraint
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_name = 'client_questionnaire_logs' AND constraint_type = 'PRIMARY KEY'
        LOOP
            EXECUTE 'ALTER TABLE public.client_questionnaire_logs DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
        END LOOP;

        -- Add new composite PK
        ALTER TABLE public.client_questionnaire_logs
        ADD CONSTRAINT client_questionnaire_logs_pkey
        PRIMARY KEY (id, coach_id, submission_date);

        RAISE NOTICE 'Updated client_questionnaire_logs primary key to (id, coach_id, submission_date)';
    END IF;

    -- 3. Update unique constraints for client_checkin_logs if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_checkin_logs') THEN
        -- Drop old unique constraint if it exists (might be on different columns)
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_name = 'client_checkin_logs'
                 AND constraint_type = 'UNIQUE'
                 AND constraint_name LIKE '%assignment%'
        LOOP
            EXECUTE 'ALTER TABLE public.client_checkin_logs DROP CONSTRAINT ' || quote_ident(r.constraint_name);
            RAISE NOTICE 'Dropped old unique constraint: %', r.constraint_name;
        END LOOP;

        -- Add unique constraint on (assignment_id, submission_date) if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'client_checkin_logs'
            AND constraint_name = 'client_checkin_logs_assignment_submission_unique'
        ) THEN
            ALTER TABLE public.client_checkin_logs
            ADD CONSTRAINT client_checkin_logs_assignment_submission_unique
            UNIQUE (assignment_id, submission_date);

            RAISE NOTICE 'Added unique constraint on (assignment_id, submission_date) for client_checkin_logs';
        END IF;
    END IF;

    -- 4. Update unique constraints for client_questionnaire_logs if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_questionnaire_logs') THEN
        -- Drop old unique constraint if it exists
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_name = 'client_questionnaire_logs'
                 AND constraint_type = 'UNIQUE'
                 AND constraint_name LIKE '%assignment%'
        LOOP
            EXECUTE 'ALTER TABLE public.client_questionnaire_logs DROP CONSTRAINT ' || quote_ident(r.constraint_name);
            RAISE NOTICE 'Dropped old unique constraint: %', r.constraint_name;
        END LOOP;

        -- Add unique constraint on (assignment_id, submission_date) if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'client_questionnaire_logs'
            AND constraint_name = 'client_questionnaire_logs_assignment_submission_unique'
        ) THEN
            ALTER TABLE public.client_questionnaire_logs
            ADD CONSTRAINT client_questionnaire_logs_assignment_submission_unique
            UNIQUE (assignment_id, submission_date);

            RAISE NOTICE 'Added unique constraint on (assignment_id, submission_date) for client_questionnaire_logs';
        END IF;
    END IF;

END $$;
