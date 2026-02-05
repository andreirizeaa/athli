-- Migration: Refactor Client Logs (PKs and Notes) - FIXED
-- 1. client_photo_logs: Update PK to (id, coach_id)
-- 2. client_metric_logs: Update PK to (id, coach_id), Drop notes
-- 3. client_habit_logs: Update PK to (id, coach_id), Drop notes/note

-- Dynamic PK Drop Function Block
DO $$
DECLARE
    r record;
BEGIN
    -- 1. Client Photo Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_photo_logs') THEN
        -- Drop existing PK regardless of name
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'client_photo_logs' AND constraint_type = 'PRIMARY KEY' LOOP
            EXECUTE 'ALTER TABLE public.client_photo_logs DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
        END LOOP;
        
        -- Add new PK
        ALTER TABLE public.client_photo_logs ADD CONSTRAINT client_photo_logs_pkey PRIMARY KEY (id, coach_id);
    END IF;

    -- 2. Client Metric Logs (checking both potential names)
    -- Case A: client_metric_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_metric_logs') THEN
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'client_metric_logs' AND constraint_type = 'PRIMARY KEY' LOOP
            EXECUTE 'ALTER TABLE public.client_metric_logs DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
        END LOOP;
        
        ALTER TABLE public.client_metric_logs ADD CONSTRAINT client_metric_logs_pkey PRIMARY KEY (id, coach_id);
        ALTER TABLE public.client_metric_logs DROP COLUMN IF EXISTS notes;
        ALTER TABLE public.client_metric_logs DROP COLUMN IF EXISTS note;
    END IF;

    -- Case B: client_metric_entries (fallback)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_metric_entries') THEN
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'client_metric_entries' AND constraint_type = 'PRIMARY KEY' LOOP
            EXECUTE 'ALTER TABLE public.client_metric_entries DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
        END LOOP;
        
        ALTER TABLE public.client_metric_entries ADD CONSTRAINT client_metric_entries_pkey PRIMARY KEY (id, coach_id);
        ALTER TABLE public.client_metric_entries DROP COLUMN IF EXISTS notes;
        ALTER TABLE public.client_metric_entries DROP COLUMN IF EXISTS note;
    END IF;

    -- 3. Client Habit Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_habit_logs') THEN
        FOR r IN SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'client_habit_logs' AND constraint_type = 'PRIMARY KEY' LOOP
            EXECUTE 'ALTER TABLE public.client_habit_logs DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
        END LOOP;
        
        ALTER TABLE public.client_habit_logs ADD CONSTRAINT client_habit_logs_pkey PRIMARY KEY (id, coach_id);
        ALTER TABLE public.client_habit_logs DROP COLUMN IF EXISTS notes;
        ALTER TABLE public.client_habit_logs DROP COLUMN IF EXISTS note;
    END IF;

END $$;
