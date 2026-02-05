-- ================================================
-- Migration 121: Add client_id and coach_id to composite primary keys
-- ================================================
-- This migration updates primary keys of client tables to include
-- client_id, coach_id, and id for multi-tenancy and proper data isolation.
--
-- PK structure:
-- - Log tables with date: (client_id, coach_id, date, id)
-- - Other tables: (client_id, coach_id, id)
--
-- Tables being modified:
-- - client_training_summary (client_id, coach_id)
-- - client_checkin_logs (client_id, coach_id, submission_date, id)
-- - client_habits (client_id, coach_id, id)
-- - client_habit_logs (client_id, coach_id, date, id)
-- - client_metrics (client_id, coach_id, id)
-- - client_metric_entries (client_id, coach_id, date, id)
-- - client_files (client_id, coach_id, id)
-- - client_goals (client_id, coach_id, id)
-- - client_injuries (client_id, coach_id, id)
-- - client_notes (client_id, coach_id, id)
-- - client_photo_logs (client_id, coach_id, date, id)
-- - client_bio (client_id, coach_id, id)
-- - client_updates (client_id, coach_id, id)
-- ================================================

-- ================================================
-- PREREQUISITE: Drop foreign key constraints that depend on PKs being modified
-- ================================================

-- Drop FK from client_habit_logs -> client_habits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_habit_logs'
    AND constraint_name = 'client_habit_logs_assignment_id_fkey'
  ) THEN
    ALTER TABLE public.client_habit_logs DROP CONSTRAINT client_habit_logs_assignment_id_fkey;
    RAISE NOTICE 'Dropped client_habit_logs_assignment_id_fkey';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_habit_logs'
    AND constraint_name = 'fk_client_habit_logs_assignment'
  ) THEN
    ALTER TABLE public.client_habit_logs DROP CONSTRAINT fk_client_habit_logs_assignment;
    RAISE NOTICE 'Dropped fk_client_habit_logs_assignment';
  END IF;
END $$;

-- Drop FK from client_metric_logs -> client_metrics
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_metric_logs'
    AND constraint_name = 'client_metric_logs_assignment_id_fkey'
  ) THEN
    ALTER TABLE public.client_metric_logs DROP CONSTRAINT client_metric_logs_assignment_id_fkey;
    RAISE NOTICE 'Dropped client_metric_logs_assignment_id_fkey';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_metric_logs'
    AND constraint_name = 'fk_client_metric_logs_assignment'
  ) THEN
    ALTER TABLE public.client_metric_logs DROP CONSTRAINT fk_client_metric_logs_assignment;
    RAISE NOTICE 'Dropped fk_client_metric_logs_assignment';
  END IF;
END $$;

-- Drop FK from client_checkin_logs -> client_checkins
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_checkin_logs'
    AND constraint_name = 'fk_client_checkin_logs_assignment'
  ) THEN
    ALTER TABLE public.client_checkin_logs DROP CONSTRAINT fk_client_checkin_logs_assignment;
    RAISE NOTICE 'Dropped fk_client_checkin_logs_assignment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_checkin_logs'
    AND constraint_name = 'client_checkin_logs_assignment_id_fkey'
  ) THEN
    ALTER TABLE public.client_checkin_logs DROP CONSTRAINT client_checkin_logs_assignment_id_fkey;
    RAISE NOTICE 'Dropped client_checkin_logs_assignment_id_fkey';
  END IF;
END $$;

-- ================================================
-- STEP 0: client_training_summary (client_id, coach_id)
-- ================================================
-- This table needs coach_id column added first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_training_summary') THEN
    -- Add coach_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'client_training_summary'
      AND column_name = 'coach_id'
    ) THEN
      ALTER TABLE public.client_training_summary ADD COLUMN coach_id UUID;

      -- Backfill coach_id from client_profiles or coach_client_assignments
      UPDATE public.client_training_summary cts
      SET coach_id = COALESCE(
        (SELECT coach_id FROM public.client_profiles cp WHERE cp.client_id = cts.client_id LIMIT 1),
        (SELECT coach_id FROM public.coach_client_assignments cca WHERE cca.client_id = cts.client_id LIMIT 1)
      )
      WHERE coach_id IS NULL;

      -- Make coach_id NOT NULL after backfill
      ALTER TABLE public.client_training_summary ALTER COLUMN coach_id SET NOT NULL;

      RAISE NOTICE 'Added coach_id column to client_training_summary';
    END IF;

    -- Update the primary key
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_training_summary_pkey'
      AND conrelid = 'public.client_training_summary'::regclass
    ) THEN
      ALTER TABLE public.client_training_summary DROP CONSTRAINT client_training_summary_pkey;
      ALTER TABLE public.client_training_summary ADD PRIMARY KEY (client_id, coach_id);
      RAISE NOTICE 'Updated client_training_summary PK to (client_id, coach_id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 1: client_checkin_logs (client_id, coach_id, submission_date, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_checkin_logs_pkey'
    AND conrelid = 'public.client_checkin_logs'::regclass
  ) THEN
    ALTER TABLE public.client_checkin_logs DROP CONSTRAINT client_checkin_logs_pkey;
    ALTER TABLE public.client_checkin_logs ADD PRIMARY KEY (client_id, coach_id, submission_date, id);
    RAISE NOTICE 'Updated client_checkin_logs PK to (client_id, coach_id, submission_date, id)';
  END IF;
END $$;

-- ================================================
-- STEP 2: client_habits (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_habits') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_habits_pkey'
      AND conrelid = 'public.client_habits'::regclass
    ) THEN
      ALTER TABLE public.client_habits DROP CONSTRAINT client_habits_pkey;
      ALTER TABLE public.client_habits ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_habits PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 3: client_habit_logs (client_id, coach_id, date, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_habit_logs_pkey'
    AND conrelid = 'public.client_habit_logs'::regclass
  ) THEN
    ALTER TABLE public.client_habit_logs DROP CONSTRAINT client_habit_logs_pkey;
    ALTER TABLE public.client_habit_logs ADD PRIMARY KEY (client_id, coach_id, date, id);
    RAISE NOTICE 'Updated client_habit_logs PK to (client_id, coach_id, date, id)';
  END IF;
END $$;

-- ================================================
-- STEP 4: client_metrics (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_metrics') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_metrics_pkey'
      AND conrelid = 'public.client_metrics'::regclass
    ) THEN
      ALTER TABLE public.client_metrics DROP CONSTRAINT client_metrics_pkey;
      ALTER TABLE public.client_metrics ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_metrics PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 5: client_metric_entries (client_id, coach_id, date, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_metric_entries') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_metric_entries_pkey'
      AND conrelid = 'public.client_metric_entries'::regclass
    ) THEN
      ALTER TABLE public.client_metric_entries DROP CONSTRAINT client_metric_entries_pkey;
      ALTER TABLE public.client_metric_entries ADD PRIMARY KEY (client_id, coach_id, date, id);
      RAISE NOTICE 'Updated client_metric_entries PK to (client_id, coach_id, date, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 6: client_files (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_files') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_files_pkey'
      AND conrelid = 'public.client_files'::regclass
    ) THEN
      ALTER TABLE public.client_files DROP CONSTRAINT client_files_pkey;
      ALTER TABLE public.client_files ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_files PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 7: client_goals (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_goals') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_goals_pkey'
      AND conrelid = 'public.client_goals'::regclass
    ) THEN
      ALTER TABLE public.client_goals DROP CONSTRAINT client_goals_pkey;
      ALTER TABLE public.client_goals ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_goals PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 8: client_injuries (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_injuries') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_injuries_pkey'
      AND conrelid = 'public.client_injuries'::regclass
    ) THEN
      ALTER TABLE public.client_injuries DROP CONSTRAINT client_injuries_pkey;
      ALTER TABLE public.client_injuries ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_injuries PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 9: client_notes (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_notes') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_notes_pkey'
      AND conrelid = 'public.client_notes'::regclass
    ) THEN
      ALTER TABLE public.client_notes DROP CONSTRAINT client_notes_pkey;
      ALTER TABLE public.client_notes ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_notes PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 10: client_photo_logs (client_id, coach_id, date, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_photo_logs') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_photo_logs_pkey'
      AND conrelid = 'public.client_photo_logs'::regclass
    ) THEN
      ALTER TABLE public.client_photo_logs DROP CONSTRAINT client_photo_logs_pkey;
      ALTER TABLE public.client_photo_logs ADD PRIMARY KEY (client_id, coach_id, date, id);
      RAISE NOTICE 'Updated client_photo_logs PK to (client_id, coach_id, date, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 11: client_bio (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_bio') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_bio_pkey'
      AND conrelid = 'public.client_bio'::regclass
    ) THEN
      ALTER TABLE public.client_bio DROP CONSTRAINT client_bio_pkey;
      ALTER TABLE public.client_bio ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_bio PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 12: client_updates (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_updates') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_updates_pkey'
      AND conrelid = 'public.client_updates'::regclass
    ) THEN
      ALTER TABLE public.client_updates DROP CONSTRAINT client_updates_pkey;
      ALTER TABLE public.client_updates ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_updates PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 13: client_checkins (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_checkins') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_checkins_pkey'
      AND conrelid = 'public.client_checkins'::regclass
    ) THEN
      ALTER TABLE public.client_checkins DROP CONSTRAINT client_checkins_pkey;
      ALTER TABLE public.client_checkins ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_checkins PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- STEP 14: client_questionnaires (client_id, coach_id, id)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_questionnaires') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'client_questionnaires_pkey'
      AND conrelid = 'public.client_questionnaires'::regclass
    ) THEN
      ALTER TABLE public.client_questionnaires DROP CONSTRAINT client_questionnaires_pkey;
      ALTER TABLE public.client_questionnaires ADD PRIMARY KEY (client_id, coach_id, id);
      RAISE NOTICE 'Updated client_questionnaires PK to (client_id, coach_id, id)';
    END IF;
  END IF;
END $$;

-- ================================================
-- POST-MIGRATION: Create unique indexes on id columns for FK support
-- ================================================

-- Unique index on client_habits(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'client_habits'
    AND indexname = 'client_habits_id_unique'
  ) THEN
    CREATE UNIQUE INDEX client_habits_id_unique ON public.client_habits(id);
    RAISE NOTICE 'Created unique index client_habits_id_unique';
  END IF;
END $$;

-- Unique index on client_metrics(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'client_metrics'
    AND indexname = 'client_metrics_id_unique'
  ) THEN
    CREATE UNIQUE INDEX client_metrics_id_unique ON public.client_metrics(id);
    RAISE NOTICE 'Created unique index client_metrics_id_unique';
  END IF;
END $$;

-- Unique index on client_checkins(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'client_checkins'
    AND indexname = 'client_checkins_id_unique'
  ) THEN
    CREATE UNIQUE INDEX client_checkins_id_unique ON public.client_checkins(id);
    RAISE NOTICE 'Created unique index client_checkins_id_unique';
  END IF;
END $$;

-- Unique index on client_questionnaires(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'client_questionnaires'
    AND indexname = 'client_questionnaires_id_unique'
  ) THEN
    CREATE UNIQUE INDEX client_questionnaires_id_unique ON public.client_questionnaires(id);
    RAISE NOTICE 'Created unique index client_questionnaires_id_unique';
  END IF;
END $$;

-- ================================================
-- POST-MIGRATION: Recreate foreign key constraints
-- ================================================

-- Recreate FK from client_habit_logs -> client_habits
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_habit_logs') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_habit_logs' AND column_name = 'assignment_id') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_habit_logs'
        AND constraint_name = 'client_habit_logs_assignment_id_fkey'
      ) THEN
        ALTER TABLE public.client_habit_logs
        ADD CONSTRAINT client_habit_logs_assignment_id_fkey
        FOREIGN KEY (assignment_id)
        REFERENCES public.client_habits(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Recreated client_habit_logs_assignment_id_fkey';
      END IF;
    END IF;
  END IF;
END $$;

-- Recreate FK from client_metric_logs -> client_metrics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_metric_logs') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_metric_logs' AND column_name = 'assignment_id') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_metric_logs'
        AND constraint_name = 'client_metric_logs_assignment_id_fkey'
      ) THEN
        ALTER TABLE public.client_metric_logs
        ADD CONSTRAINT client_metric_logs_assignment_id_fkey
        FOREIGN KEY (assignment_id)
        REFERENCES public.client_metrics(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Recreated client_metric_logs_assignment_id_fkey';
      END IF;
    END IF;
  END IF;
END $$;

-- Recreate FK from client_checkin_logs -> client_checkins
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_checkin_logs') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_checkin_logs' AND column_name = 'assignment_id') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_checkin_logs'
        AND constraint_name = 'fk_client_checkin_logs_assignment'
      ) THEN
        ALTER TABLE public.client_checkin_logs
        ADD CONSTRAINT fk_client_checkin_logs_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES public.client_checkins(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Recreated fk_client_checkin_logs_assignment';
      END IF;
    END IF;
  END IF;
END $$;

-- ================================================
-- Summary
-- ================================================
-- This migration converts primary keys to composite keys:
-- - Log tables with date: (client_id, coach_id, date, id)
-- - Other tables: (client_id, coach_id, id)
-- This enables better multi-tenancy support and data isolation.
