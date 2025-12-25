-- ================================================
-- ATHLI Client Management: Profiles, Libraries, Assignments, Logs & Forms
-- ================================================

-- ================================================
-- STEP 0: Extensions (gen_random_uuid)
-- ================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure Storage Buckets Exist (Idempotent)
INSERT INTO storage.buckets (id, name, public) VALUES ('coach_files', 'coach_files', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('client_photos', 'client_photos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise_videos', 'exercise_videos', false) ON CONFLICT (id) DO NOTHING;
-- Dependency Note: public.user_profiles MUST exist (from previous migration 001/002)

-- ================================================
-- STEP 1: Drop current objects only (NO legacy)
-- ================================================
DROP VIEW IF EXISTS public.client_files_view CASCADE;
DROP VIEW IF EXISTS public.client_checkins_view CASCADE;
DROP VIEW IF EXISTS public.client_questionnaires_view CASCADE;
DROP VIEW IF EXISTS public.coach_checkins_review_view CASCADE; -- New
DROP VIEW IF EXISTS public.athletes_grid_view CASCADE;

-- Forms Drops --
DROP TABLE IF EXISTS public.client_checkin_logs CASCADE;
DROP TABLE IF EXISTS public.client_questionnaire_logs CASCADE;
DROP TABLE IF EXISTS public.client_checkin_assignments CASCADE;
DROP TABLE IF EXISTS public.client_questionnaire_assignments CASCADE;
DROP TABLE IF EXISTS public.coach_checkins CASCADE;
DROP TABLE IF EXISTS public.coach_questionnaires CASCADE;
DROP TABLE IF EXISTS public.coach_workouts CASCADE; -- NEW
DROP TABLE IF EXISTS public.coach_programs CASCADE; -- NEW
DROP TABLE IF EXISTS public.coach_exercises CASCADE; -- NEW (missing)
-----------------

DROP TABLE IF EXISTS public.client_habit_logs CASCADE;
DROP TABLE IF EXISTS public.client_metric_entries CASCADE;

DROP TABLE IF EXISTS public.client_habit_assignments CASCADE;
DROP TABLE IF EXISTS public.client_metric_assignments CASCADE;
DROP TABLE IF EXISTS public.client_file_assignments CASCADE; 

DROP TABLE IF EXISTS public.client_bio CASCADE; -- New
DROP TABLE IF EXISTS public.client_goals CASCADE; -- New
DROP TABLE IF EXISTS public.client_injuries CASCADE; -- New
DROP TABLE IF EXISTS public.client_notes CASCADE; -- New

DROP TABLE IF EXISTS public.client_training CASCADE; -- Partitioned Parent
DROP TABLE IF EXISTS public.client_training_summary CASCADE;
DROP TABLE IF EXISTS public.client_profiles CASCADE;

-- DROP VIEW coach_checkins_review_view moved to Step 1
DROP TABLE IF EXISTS public.client_photo_logs CASCADE; -- NEW

DROP TABLE IF EXISTS public.coach_own_todolist CASCADE; -- NEW
DROP TABLE IF EXISTS public.coach_auto_todolist CASCADE; -- NEW

DROP TABLE IF EXISTS public.coach_habits CASCADE;
DROP TABLE IF EXISTS public.coach_metrics CASCADE;
DROP TABLE IF EXISTS public.coach_files CASCADE; 
DROP POLICY IF EXISTS "storage_coach_manage" ON storage.objects;
DROP POLICY IF EXISTS "storage_client_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_client_photos_manage" ON storage.objects;
DROP POLICY IF EXISTS "storage_coach_read_client_photos" ON storage.objects;
-- Cleanup old names if present
DROP POLICY IF EXISTS "storage_client_read_assigned" ON storage.objects;
DROP POLICY IF EXISTS "storage_coach_read_submissions" ON storage.objects;
DROP POLICY IF EXISTS "storage_client_upload_submissions" ON storage.objects;
DROP POLICY IF EXISTS "storage_client_read_own_submissions" ON storage.objects; 

-- ================================================
-- STEP 2: client_profiles
-- ================================================
CREATE TABLE public.client_profiles (
  client_id UUID NOT NULL PRIMARY KEY,
  coach_id  UUID NOT NULL,

  category TEXT NOT NULL CHECK (category IN ('online', 'in-person', 'hybrid')) DEFAULT 'online',
  status   TEXT NOT NULL CHECK (status   IN ('invited', 'connected', 'archived')) DEFAULT 'invited',
  
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  
  invitation_sent_at TIMESTAMPTZ,
  connected_at       TIMESTAMPTZ,

  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm INTEGER,
  phone   TEXT,
  country TEXT,
  city    TEXT,
  unit_system TEXT NOT NULL CHECK (unit_system IN ('metric', 'imperial')) DEFAULT 'metric',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_client_profile
    FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_coach_profile
    FOREIGN KEY (coach_id)  REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT check_no_self_coaching
    CHECK (coach_id <> client_id),
  CONSTRAINT chk_profiles_active_archived
    CHECK (NOT (is_active AND is_archived))
);

CREATE INDEX idx_cp_coach  ON public.client_profiles(coach_id);
CREATE INDEX idx_cp_status ON public.client_profiles(status);

-- Optimization: Coach Grid Filter (Coach + Status)
CREATE INDEX idx_cp_coach_status ON public.client_profiles (coach_id, status);

-- ================================================
-- STEP 3: client_training_summary
-- ================================================
CREATE TABLE public.client_training_summary (
  client_id UUID NOT NULL PRIMARY KEY,

  last_activity TIMESTAMPTZ,

  last_7_days_training_completed  INTEGER NOT NULL DEFAULT 0,
  last_7_days_training_total      INTEGER NOT NULL DEFAULT 0,

  last_30_days_training_completed INTEGER NOT NULL DEFAULT 0,
  last_30_days_training_total     INTEGER NOT NULL DEFAULT 0,

  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_training_summary_client
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,

  CONSTRAINT chk_counts CHECK (
    last_7_days_training_completed  >= 0 AND last_7_days_training_total  >= 0 AND
    last_30_days_training_completed >= 0 AND last_30_days_training_total >= 0 AND
    last_7_days_training_completed  <= last_7_days_training_total AND
    last_30_days_training_completed <= last_30_days_training_total
  )
);

CREATE INDEX idx_cts_activity ON public.client_training_summary(last_activity DESC);
-- Optimization: Client Activity Sort
CREATE INDEX idx_cts_client_activity ON public.client_training_summary (client_id, last_activity DESC);

-- ================================================
-- STEP 4: Coach libraries (owned by coach only)
-- ================================================

-- 4.1 coach_metrics
CREATE TABLE public.coach_metrics (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  unit TEXT,
  description TEXT,

  value_kind TEXT NOT NULL DEFAULT 'number'
    CHECK (value_kind IN ('number','percent','duration','score')),
  min_value NUMERIC,
  max_value NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_metrics_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  CONSTRAINT chk_metric_range CHECK (
    (min_value IS NULL OR max_value IS NULL) OR (min_value <= max_value)
  )
);

-- Case-insensitive uniqueness per coach
CREATE UNIQUE INDEX uq_coach_metrics_name_ci
  ON public.coach_metrics (coach_id, lower(name));

CREATE INDEX idx_metrics_coach ON public.coach_metrics(coach_id);

-- 4.2 coach_habits
CREATE TABLE public.coach_habits (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  schedule_type TEXT NOT NULL DEFAULT 'daily'
    CHECK (schedule_type IN ('daily','weekly','custom')),
  days_of_week SMALLINT[],
  times_of_day TIME[],
  timezone TEXT NOT NULL DEFAULT 'UTC',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,

  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_habits_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  CONSTRAINT chk_days_of_week CHECK (
    days_of_week IS NULL
    OR days_of_week <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
  ),

  CONSTRAINT chk_habit_dates CHECK (
    end_date IS NULL OR start_date IS NULL OR start_date <= end_date
  )
);

CREATE UNIQUE INDEX uq_coach_habits_name_ci
  ON public.coach_habits (coach_id, lower(name));

CREATE INDEX idx_habits_coach ON public.coach_habits(coach_id);

-- 4.3 coach_files
CREATE TABLE public.coach_files (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  bucket_id TEXT NOT NULL DEFAULT 'coach_files',
  file_path TEXT NOT NULL, -- "{coach_id}/{uuid}.pdf"
  filename  TEXT NOT NULL,
  mime_type TEXT,
  size      BIGINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_files_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    
  CONSTRAINT chk_bucket_id CHECK (bucket_id = 'coach_files')
);

CREATE UNIQUE INDEX uq_coach_files_path
  ON public.coach_files (bucket_id, file_path);

CREATE INDEX idx_files_coach ON public.coach_files(coach_id);

-- 4.4 coach_checkins (NEW)
CREATE TABLE public.coach_checkins (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  
  -- Recurring Schedule
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  cron_expression TEXT,
  
  -- Questions Definition
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_checkins_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_coach_checkins_name_ci ON public.coach_checkins(coach_id, lower(name));
CREATE INDEX idx_checkins_coach ON public.coach_checkins(coach_id);

-- 4.5 coach_questionnaires (NEW)
CREATE TABLE public.coach_questionnaires (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  
  -- Questions Definition
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_quest_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_coach_quest_name_ci ON public.coach_questionnaires(coach_id, lower(name));
CREATE INDEX idx_quest_coach ON public.coach_questionnaires(coach_id);

-- 4.5.5 coach_exercises (NEW)
CREATE TABLE public.coach_exercises (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  
  category TEXT,
  muscle_group TEXT[], -- Array of muscle groups
  equipment TEXT,
  modality TEXT,
  
  video_link TEXT, -- External URL or Storage Path
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_exercises_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_coach_exercises_name_ci ON public.coach_exercises(coach_id, lower(name));
CREATE INDEX idx_exercises_coach ON public.coach_exercises(coach_id);

-- 4.6 coach_workouts (NEW)
CREATE TABLE public.coach_workouts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  
  -- Flexible Workout Structure (Exercises, Sets, Reps)
  workout_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  number_of_exercises INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_workouts_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_coach_workouts_name_ci ON public.coach_workouts(coach_id, lower(name));
CREATE INDEX idx_workouts_coach ON public.coach_workouts(coach_id);

-- 4.7 coach_programs (NEW)
CREATE TABLE public.coach_programs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  
  -- Flexible Program Structure (Weeks, Days, Links to Workouts)
  program_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_programs_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_coach_programs_name_ci ON public.coach_programs(coach_id, lower(name));
CREATE INDEX idx_programs_coach ON public.coach_programs(coach_id);


-- 4.8 client_training (Partitioned)
CREATE TABLE public.client_training (
  client_id UUID NOT NULL,
  date DATE NOT NULL,
  coach_id UUID NOT NULL, -- Denormalized for RLS
  
  training_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- List of WorkoutSchema
  
  -- Status Columns (Requested Refinement)
  day_status TEXT DEFAULT 'not_started', 
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- PK includes partition key
  PRIMARY KEY (client_id, date),

  CONSTRAINT fk_ct_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  
  -- 1) Keep training_data as a JSONB array and enforce it
  CONSTRAINT chk_training_data_is_array CHECK (jsonb_typeof(training_data) = 'array'),
  -- 3) Add a constraint for day_status
  CONSTRAINT chk_day_status CHECK (day_status IS NULL OR day_status IN ('not_started','in_progress','completed'))
) PARTITION BY RANGE (date);

-- Global Index for fast retrieval of user range
-- "You already have PRIMARY KEY (client_id, date) which is the main calendar lookup index."
-- Dropped redundant lookup index as requested.

-- Optimized Coach Index: (coach_id, date)
CREATE INDEX idx_client_training_coach_date ON public.client_training (coach_id, date);

-- Partitions: Dynamic Creation (Next 36 Months)
-- 4) Partition strategy with “cap to last partition month”
DO $$
DECLARE
  d date := date_trunc('month', current_date)::date;
  end_d date := (d + interval '36 months')::date;
  part_name text;
  from_d date;
  to_d date;
BEGIN
  while d < end_d loop
    from_d := d;
    to_d := (d + interval '1 month')::date;
    part_name := format('client_training_%s', to_char(from_d, 'YYYY_MM'));

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.client_training FOR VALUES FROM (%L) TO (%L);',
      part_name, from_d, to_d
    );

    -- ✅ RLS MUST be enabled on each partition
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', part_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;',  part_name);

    d := to_d;
  end loop;
END $$;

-- Fix existing already-created partitions (one-time cleanup, idempotent)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS tablename
    FROM pg_inherits i
    JOIN pg_class c      ON c.oid = i.inhrelid
    JOIN pg_namespace n  ON n.oid = c.relnamespace
    WHERE i.inhparent = 'public.client_training'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', r.schemaname, r.tablename);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;',  r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ================================================
-- STEP 5: Assignments (client config) + denorm coach_id
-- ================================================

-- 5.1 client_metric_assignments
CREATE TABLE public.client_metric_assignments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_metric_id UUID NOT NULL,

  coach_id UUID NOT NULL, -- denormalized, STRICTLY ENFORCED (NOT NULL)

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cma_client
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cma_metric
    FOREIGN KEY (coach_metric_id) REFERENCES public.coach_metrics(id) ON DELETE CASCADE,

  UNIQUE (client_id, coach_metric_id)
);

CREATE INDEX idx_cma_client_active_sort
  ON public.client_metric_assignments(client_id, sort_order)
  WHERE is_active = TRUE;

-- Perf Index: RLS "Metric Active" Check
CREATE INDEX idx_cma_metric_client_active
  ON public.client_metric_assignments (coach_metric_id, client_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_cma_coach
  ON public.client_metric_assignments(coach_id);

-- 5.2 client_habit_assignments
CREATE TABLE public.client_habit_assignments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_habit_id UUID NOT NULL,

  coach_id UUID NOT NULL, -- denormalized, STRICTLY ENFORCED

  custom_schedule JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cha_client
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cha_habit
    FOREIGN KEY (coach_habit_id) REFERENCES public.coach_habits(id) ON DELETE CASCADE,

  UNIQUE (client_id, coach_habit_id)
);

CREATE INDEX idx_cha_client_active_sort
  ON public.client_habit_assignments(client_id, sort_order)
  WHERE is_active = TRUE;

-- Perf Index: RLS "Habit Active" Check
CREATE INDEX idx_cha_habit_client_active
  ON public.client_habit_assignments (coach_habit_id, client_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_cha_coach
  ON public.client_habit_assignments(coach_id);

-- 5.3 client_file_assignments
CREATE TABLE public.client_file_assignments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_file_id UUID NOT NULL,

  coach_id UUID NOT NULL, -- denormalized, STRICTLY ENFORCED
  
  -- Denormalized path for high-performance Storage Policies (avoids join)
  -- NOT NULL to strictly enforce propagation or valid initial assignment
  coach_file_path TEXT NOT NULL, 

  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cfa_client
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cfa_file
    FOREIGN KEY (coach_file_id) REFERENCES public.coach_files(id) ON DELETE CASCADE,

  UNIQUE (client_id, coach_file_id)
);

CREATE INDEX idx_cfa_client_active_sort
  ON public.client_file_assignments(client_id, sort_order)
  WHERE is_active = TRUE;

-- Perf Index: Storage "File Active" Check (Includes path for index-only scan potential)
CREATE INDEX idx_cfa_client_path_active
  ON public.client_file_assignments (client_id, coach_file_path)
  WHERE is_active = TRUE;
  
-- Perf Index: RLS "File Active" Check
CREATE INDEX idx_cfa_file_client_active
  ON public.client_file_assignments (coach_file_id, client_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_cfa_coach  ON public.client_file_assignments(coach_id);

-- 5.4 client_checkin_assignments (NEW)
CREATE TABLE public.client_checkin_assignments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_checkin_id UUID NOT NULL,

  coach_id UUID NOT NULL, -- denormalized

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cca_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cca_checkin FOREIGN KEY (coach_checkin_id) REFERENCES public.coach_checkins(id) ON DELETE CASCADE,
  UNIQUE(client_id, coach_checkin_id)
);
CREATE INDEX idx_cca_client ON public.client_checkin_assignments(client_id) WHERE is_active = TRUE;
CREATE INDEX idx_cca_checkin_active ON public.client_checkin_assignments(coach_checkin_id, client_id) WHERE is_active = TRUE;
CREATE INDEX idx_cca_coach ON public.client_checkin_assignments(coach_id);

-- 5.5 client_questionnaire_assignments (NEW)
CREATE TABLE public.client_questionnaire_assignments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_questionnaire_id UUID NOT NULL,

  coach_id UUID NOT NULL, -- denormalized

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cqa_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cqa_quest FOREIGN KEY (coach_questionnaire_id) REFERENCES public.coach_questionnaires(id) ON DELETE CASCADE,
  UNIQUE(client_id, coach_questionnaire_id)
);
CREATE INDEX idx_cqa_client ON public.client_questionnaire_assignments(client_id) WHERE is_active = TRUE;
CREATE INDEX idx_cqa_quest_active ON public.client_questionnaire_assignments(coach_questionnaire_id, client_id) WHERE is_active = TRUE;
CREATE INDEX idx_cqa_coach ON public.client_questionnaire_assignments(coach_id);


-- ================================================
-- STEP 6: Logs / Entries (time-series)
-- ================================================

-- 6.1 client_metric_entries
CREATE TABLE public.client_metric_entries (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_metric_id UUID NOT NULL,

  coach_id UUID NOT NULL, -- denormalized for RLS performance

  value NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,

  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cme_client
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cme_metric
    FOREIGN KEY (coach_metric_id) REFERENCES public.coach_metrics(id) ON DELETE CASCADE
);

CREATE INDEX idx_entries_query
  ON public.client_metric_entries(client_id, coach_metric_id, measured_at DESC);

CREATE INDEX idx_entries_coach_recent
  ON public.client_metric_entries(coach_id, measured_at DESC);

CREATE INDEX idx_entries_client_history
  ON public.client_metric_entries(client_id, measured_at DESC);

-- FK index for coach_metric_id (linter requirement)
CREATE INDEX idx_client_metric_entries_coach_metric_id
  ON public.client_metric_entries(coach_metric_id);

-- 6.2 client_habit_logs
CREATE TABLE public.client_habit_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_habit_id UUID NOT NULL,

  coach_id UUID NOT NULL, -- denormalized for RLS performance

  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,

  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_by UUID,
  updated_at TIMESTAMPTZ,

  CONSTRAINT fk_chl_client
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_chl_habit
    FOREIGN KEY (coach_habit_id) REFERENCES public.coach_habits(id) ON DELETE CASCADE,

  UNIQUE (client_id, coach_habit_id, recorded_date)
);

CREATE INDEX idx_logs_query
  ON public.client_habit_logs(client_id, coach_habit_id, recorded_date DESC);

CREATE INDEX idx_logs_coach_recent
  ON public.client_habit_logs(coach_id, recorded_date DESC);

CREATE INDEX idx_logs_client_history
  ON public.client_habit_logs(client_id, recorded_date DESC);

-- FK index for coach_habit_id (linter requirement)
CREATE INDEX idx_client_habit_logs_coach_habit_id
  ON public.client_habit_logs(coach_habit_id);

-- 6.3 client_checkin_logs (NEW - Review Workflow)
CREATE TABLE public.client_checkin_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_checkin_id UUID NOT NULL,
  coach_id UUID NOT NULL,

  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Workflow
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'review', 'reviewed')),
  coach_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_ccl_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_ccl_checkin FOREIGN KEY (coach_checkin_id) REFERENCES public.coach_checkins(id) ON DELETE CASCADE
);
CREATE INDEX idx_checkin_logs_query ON public.client_checkin_logs(client_id, coach_checkin_id, submission_date DESC);
CREATE INDEX idx_checkin_logs_coach ON public.client_checkin_logs(coach_id, submission_date DESC);
-- Optimization: Coach Reviewing Index
CREATE INDEX idx_ccl_coach_status_date ON public.client_checkin_logs (coach_id, status, submission_date DESC);
-- FK index for coach_checkin_id (linter requirement)
CREATE INDEX idx_client_checkin_logs_coach_checkin_id ON public.client_checkin_logs(coach_checkin_id);


-- 6.4 client_questionnaire_logs (NEW)
CREATE TABLE public.client_questionnaire_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_questionnaire_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in-progress', 'completed')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cql_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cql_quest FOREIGN KEY (coach_questionnaire_id) REFERENCES public.coach_questionnaires(id) ON DELETE CASCADE
);
CREATE INDEX idx_quest_logs_client ON public.client_questionnaire_logs(client_id);
CREATE INDEX idx_quest_logs_coach ON public.client_questionnaire_logs(coach_id);
-- Optimization: Coach Review Index
CREATE INDEX idx_cql_coach_status_created ON public.client_questionnaire_logs (coach_id, status, created_at DESC);
-- FK index for coach_questionnaire_id (linter requirement)
CREATE INDEX idx_client_questionnaire_logs_coach_questionnaire_id ON public.client_questionnaire_logs(coach_questionnaire_id);


-- 6.5 client_photo_logs (NEW)
-- ... (existing photo logs code if any, checking context) 
-- Wait, I need to verify where to insert. Line 649 implies I'm in the logs section.
-- I'll insert Todo Lists AFTER Log tables, or parallel to them.

-- ================================================
-- STEP 7: Coach Todo Lists
-- ================================================

-- 7.1 coach_own_todolist
CREATE TABLE public.coach_own_todolist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  
  title TEXT NOT NULL,
  information TEXT,
  type TEXT NOT NULL CHECK (type IN ('client', 'general')),
  client_id UUID, -- Optional

  due_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cot_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cot_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE SET NULL,

  -- Integrity: Type checks
  CONSTRAINT chk_cot_type_client CHECK (
    (type = 'general' AND client_id IS NULL) OR
    (type = 'client' AND client_id IS NOT NULL)
  )
);

CREATE INDEX idx_cot_coach_due ON public.coach_own_todolist (coach_id, due_date);
CREATE INDEX idx_cot_coach_completed ON public.coach_own_todolist (coach_id, completed);
-- Optimized Partial Index for Todo List UI
CREATE INDEX idx_cot_open_due ON public.coach_own_todolist (coach_id, due_date) WHERE completed = FALSE;
-- FK index for client_id (linter requirement, partial index since nullable)
CREATE INDEX idx_coach_own_todolist_client_id ON public.coach_own_todolist(client_id) WHERE client_id IS NOT NULL;


-- 7.2 coach_auto_todolist
CREATE TABLE public.coach_auto_todolist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('client', 'general')),
  client_id UUID, -- Optional context

  completed BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cat_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cat_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE SET NULL,

  -- Integrity: Type checks
  CONSTRAINT chk_cat_type_client CHECK (
    (type = 'general' AND client_id IS NULL) OR
    (type = 'client' AND client_id IS NOT NULL)
  )
);

CREATE INDEX idx_cat_coach_completed ON public.coach_auto_todolist (coach_id, completed);
-- FK index for client_id (linter requirement, partial index since nullable)
CREATE INDEX idx_coach_auto_todolist_client_id ON public.coach_auto_todolist(client_id) WHERE client_id IS NOT NULL;

-- ================================================
-- STEP 7.5: Coach Private Data (Bio, Goals, Injuries, Notes)
-- ================================================

-- 7.5.1 client_bio
CREATE TABLE public.client_bio (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,

  bio TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cb_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cb_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (client_id) -- One bio per client
);
CREATE INDEX idx_client_bio_coach_id ON public.client_bio(coach_id);

-- 7.5.2 client_goals
CREATE TABLE public.client_goals (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,

  goal TEXT NOT NULL,
  target_date DATE,
  achieved BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cg_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cg_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_cg_client ON public.client_goals(client_id);
CREATE INDEX idx_client_goals_coach_id ON public.client_goals(coach_id);

-- 7.5.3 client_injuries
CREATE TABLE public.client_injuries (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,

  injury TEXT NOT NULL,
  status TEXT, -- e.g. 'Recovering', 'Active'
  date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_ci_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_ci_client ON public.client_injuries(client_id);
CREATE INDEX idx_client_injuries_coach_id ON public.client_injuries(coach_id);

-- 7.5.4 client_notes (Pinned support)
CREATE TABLE public.client_notes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,

  note TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cn_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cn_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_cn_client_pinned ON public.client_notes(client_id, is_pinned DESC, created_at DESC);
CREATE INDEX idx_client_notes_coach_id ON public.client_notes(coach_id);


-- ================================================
-- STEP 8: RLS (Renumbering subsequent steps handled implicitly by placement)
-- ================================================
CREATE TABLE public.client_photo_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  
  coach_id UUID NOT NULL, -- denormalized
  
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  front_photo_path TEXT,
  side_photo_path  TEXT,
  back_photo_path  TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cpl_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE
);
CREATE INDEX idx_photo_logs_client_date ON public.client_photo_logs(client_id, recorded_date DESC);
CREATE INDEX idx_photo_logs_coach_date  ON public.client_photo_logs(coach_id, recorded_date DESC);


-- ================================================
-- STEP 7: Triggers & integrity (IMPORTANT)
-- ================================================

-- 7.1 updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- apply updated_at triggers to tables that have updated_at
CREATE TRIGGER trg_cp_updated_at BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cm_updated_at BEFORE UPDATE ON public.coach_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ch_updated_at BEFORE UPDATE ON public.coach_habits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cf_updated_at BEFORE UPDATE ON public.coach_files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); 
CREATE TRIGGER trg_cma_updated_at BEFORE UPDATE ON public.client_metric_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cha_updated_at BEFORE UPDATE ON public.client_habit_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cfa_updated_at BEFORE UPDATE ON public.client_file_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); 
-- New Forms Triggers
CREATE TRIGGER trg_cc_updated_at BEFORE UPDATE ON public.coach_checkins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cq_updated_at BEFORE UPDATE ON public.coach_questionnaires FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ce_updated_at BEFORE UPDATE ON public.coach_exercises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cw_updated_at BEFORE UPDATE ON public.coach_workouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cprog_updated_at BEFORE UPDATE ON public.coach_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ct_updated_at BEFORE UPDATE ON public.client_training FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cca_updated_at BEFORE UPDATE ON public.client_checkin_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cqa_updated_at BEFORE UPDATE ON public.client_questionnaire_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ccl_updated_at BEFORE UPDATE ON public.client_checkin_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cql_updated_at BEFORE UPDATE ON public.client_questionnaire_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Todo List Triggers (Moved here to ensure function exists)
CREATE TRIGGER trg_cot_updated_at BEFORE UPDATE ON public.coach_own_todolist FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cat_updated_at BEFORE UPDATE ON public.coach_auto_todolist FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Todo List Integrity Triggers (Security Definer)
-- 11.2 Todo List Client Integrity (Coach Ownership Check)
CREATE OR REPLACE FUNCTION public.enforce_todolist_client_belongs_to_coach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Defense-in-depth: Coach MUST match auth.uid() (if user session)
  IF auth.uid() IS NOT NULL AND NEW.coach_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'coach_id must equal auth.uid()';
  END IF;

  -- Normalize / validate (matches your CHECK constraints)
  IF NEW.type = 'general' THEN
    NEW.client_id := NULL; -- Force consistency
    RETURN NEW;
  ELSIF NEW.type = 'client' THEN
    IF NEW.client_id IS NULL THEN
      RAISE EXCEPTION 'type=client requires client_id';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.client_profiles cp
      WHERE cp.client_id = NEW.client_id
        AND cp.coach_id  = NEW.coach_id
    ) THEN
      RAISE EXCEPTION 'client_id does not belong to this coach';
    END IF;

    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'invalid type (expected client/general)';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_todolist_client_belongs_to_coach() FROM PUBLIC;

CREATE TRIGGER trg_cot_client_integrity 
  BEFORE INSERT OR UPDATE ON public.coach_own_todolist
  FOR EACH ROW EXECUTE FUNCTION public.enforce_todolist_client_belongs_to_coach();

CREATE TRIGGER trg_cat_client_integrity 
  BEFORE INSERT OR UPDATE ON public.coach_auto_todolist
  FOR EACH ROW EXECUTE FUNCTION public.enforce_todolist_client_belongs_to_coach();
CREATE TRIGGER trg_cpl_updated_at BEFORE UPDATE ON public.client_photo_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cb_updated_at BEFORE UPDATE ON public.client_bio FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cg_updated_at BEFORE UPDATE ON public.client_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ci_updated_at BEFORE UPDATE ON public.client_injuries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cn_updated_at BEFORE UPDATE ON public.client_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 7.2 Protect client_profiles sensitive fields (HARDENED)
CREATE OR REPLACE FUNCTION public.protect_client_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    -- Block critical relationship & system fields
    IF NEW.coach_id           IS DISTINCT FROM OLD.coach_id           THEN RAISE EXCEPTION 'Clients cannot change their coach.'; END IF;
    IF NEW.status             IS DISTINCT FROM OLD.status             THEN RAISE EXCEPTION 'Clients cannot change their connection status.'; END IF;
    IF NEW.connected_at       IS DISTINCT FROM OLD.connected_at       THEN RAISE EXCEPTION 'Clients cannot change their connection date.'; END IF;
    IF NEW.invitation_sent_at IS DISTINCT FROM OLD.invitation_sent_at THEN RAISE EXCEPTION 'Clients cannot change invitation timestamp.'; END IF;
    IF NEW.created_at         IS DISTINCT FROM OLD.created_at         THEN RAISE EXCEPTION 'Clients cannot change profile creation date.'; END IF;
    -- Added: Category protection
    IF NEW.category           IS DISTINCT FROM OLD.category           THEN RAISE EXCEPTION 'Clients cannot change category.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cp_protect
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_client_profile_fields();

-- Hardening: Block File Path Changes (Integrity)
CREATE OR REPLACE FUNCTION public.block_file_path_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
    RAISE EXCEPTION 'file_path cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_cf_block_path_change
BEFORE UPDATE OF file_path ON public.coach_files
FOR EACH ROW EXECUTE FUNCTION public.block_file_path_change();


-- Hardening: Protect Check-in Review Fields from Clients
CREATE OR REPLACE FUNCTION public.protect_checkin_review_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    IF NEW.coach_comment IS DISTINCT FROM OLD.coach_comment THEN
      RAISE EXCEPTION 'Clients cannot edit coach_comment.';
    END IF;
    IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'Clients cannot edit reviewed_at.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ccl_protect_review
BEFORE UPDATE ON public.client_checkin_logs
FOR EACH ROW EXECUTE FUNCTION public.protect_checkin_review_fields();


-- 7.3 Training summary audit
CREATE OR REPLACE FUNCTION public.set_training_summary_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cts_audit
BEFORE INSERT OR UPDATE ON public.client_training_summary
FOR EACH ROW EXECUTE FUNCTION public.set_training_summary_updated_by();

-- 7.4 Validate coach role (uses SECURITY DEFINER safely)
CREATE OR REPLACE FUNCTION public.validate_coach_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = NEW.coach_id AND user_type = 'coach'
  ) THEN
    RAISE EXCEPTION 'Referenced user is not a coach.';
  END IF;
  RETURN NEW;
END;
$$;
-- Revoke Public Execute
REVOKE ALL ON FUNCTION public.validate_coach_role() FROM PUBLIC;

CREATE TRIGGER trg_cp_validate_coach
BEFORE INSERT OR UPDATE OF coach_id ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_coach_role();

-- 7.5 Enforce assignment integrity + denormalize coach_id
-- Prevent assigning another coach's definition to your client.
CREATE OR REPLACE FUNCTION public.enforce_metric_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_metrics cm
    WHERE cm.id = NEW.coach_metric_id
      AND cm.coach_id = v_coach
  ) THEN
    RAISE EXCEPTION 'coach_metric_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_metric_assignment_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cma_integrity
BEFORE INSERT OR UPDATE ON public.client_metric_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_metric_assignment_integrity();

CREATE OR REPLACE FUNCTION public.enforce_habit_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_habits ch
    WHERE ch.id = NEW.coach_habit_id
      AND ch.coach_id = v_coach
  ) THEN
    RAISE EXCEPTION 'coach_habit_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_habit_assignment_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cha_integrity
BEFORE INSERT OR UPDATE ON public.client_habit_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_habit_assignment_integrity();

-- 7.5c File Assignment Integrity (Sets coach_id AND coach_file_path)
CREATE OR REPLACE FUNCTION public.enforce_file_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
DECLARE v_path text;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  SELECT cf.file_path INTO v_path
  FROM public.coach_files cf
  WHERE cf.id = NEW.coach_file_id
    AND cf.coach_id = v_coach;

  IF v_path IS NULL THEN
    RAISE EXCEPTION 'coach_file_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  NEW.coach_file_path := v_path; -- Denormalized for Storage speed
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_file_assignment_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cfa_integrity
BEFORE INSERT OR UPDATE ON public.client_file_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_file_assignment_integrity();

-- 7.5d Checkin/Questionnaire Assignment Integrity
CREATE OR REPLACE FUNCTION public.enforce_checkin_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coach_checkins c WHERE c.id = NEW.coach_checkin_id AND c.coach_id = v_coach) THEN
    RAISE EXCEPTION 'coach_checkin_id does not belong to client coach';
  END IF;
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_checkin_assignment_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cca_integrity BEFORE INSERT OR UPDATE ON public.client_checkin_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_checkin_assignment_integrity();

CREATE OR REPLACE FUNCTION public.enforce_quest_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coach_questionnaires c WHERE c.id = NEW.coach_questionnaire_id AND c.coach_id = v_coach) THEN
    RAISE EXCEPTION 'coach_questionnaire_id does not belong to client coach';
  END IF;
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_quest_assignment_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cqa_integrity BEFORE INSERT OR UPDATE ON public.client_questionnaire_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_quest_assignment_integrity();


-- 7.6 Enforce log integrity (must be assigned + active) + denorm coach_id
CREATE OR REPLACE FUNCTION public.enforce_metric_entry_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_metric_assignments a
    WHERE a.client_id = NEW.client_id
      AND a.coach_metric_id = NEW.coach_metric_id
      AND a.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'metric is not actively assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_metric_entry_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cme_integrity
BEFORE INSERT OR UPDATE ON public.client_metric_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_metric_entry_integrity();

CREATE OR REPLACE FUNCTION public.enforce_habit_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_habit_assignments a
    WHERE a.client_id = NEW.client_id
      AND a.coach_habit_id = NEW.coach_habit_id
      AND a.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'habit is not actively assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_habit_log_integrity() FROM PUBLIC;

CREATE TRIGGER trg_chl_integrity
BEFORE INSERT OR UPDATE ON public.client_habit_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_habit_log_integrity();

-- 7.6b Form Logs Integrity
CREATE OR REPLACE FUNCTION public.enforce_checkin_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  
  -- Must be assigned
  IF NOT EXISTS (
    SELECT 1 FROM public.client_checkin_assignments a
    WHERE a.client_id = NEW.client_id AND a.coach_checkin_id = NEW.coach_checkin_id AND a.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'checkin is not actively assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_checkin_log_integrity() FROM PUBLIC;

CREATE TRIGGER trg_ccl_integrity BEFORE INSERT OR UPDATE ON public.client_checkin_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_checkin_log_integrity();

CREATE OR REPLACE FUNCTION public.enforce_quest_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  
  -- Must be assigned
  IF NOT EXISTS (
    SELECT 1 FROM public.client_questionnaire_assignments a
    WHERE a.client_id = NEW.client_id AND a.coach_questionnaire_id = NEW.coach_questionnaire_id AND a.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'questionnaire is not actively assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_quest_log_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cql_integrity BEFORE INSERT OR UPDATE ON public.client_questionnaire_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_quest_log_integrity();


-- 7.6c Photo Log Integrity (Set Coach ID)
CREATE OR REPLACE FUNCTION public.enforce_photo_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_photo_log_integrity() FROM PUBLIC;

CREATE TRIGGER trg_cpl_integrity BEFORE INSERT OR UPDATE ON public.client_photo_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_photo_log_integrity();

-- 7.6d Coach Private Data Integrity (Shared Integrity Function)
CREATE OR REPLACE FUNCTION public.enforce_coach_private_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_coach_private_integrity() FROM PUBLIC;



CREATE TRIGGER trg_cb_integrity BEFORE INSERT OR UPDATE ON public.client_bio      FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();
CREATE TRIGGER trg_cg_integrity BEFORE INSERT OR UPDATE ON public.client_goals    FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();
CREATE TRIGGER trg_ci_integrity BEFORE INSERT OR UPDATE ON public.client_injuries FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();
CREATE TRIGGER trg_cn_integrity BEFORE INSERT OR UPDATE ON public.client_notes    FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();

-- Also reuse integrity for client_training (needs coach_id populated)
CREATE TRIGGER trg_ct_integrity BEFORE INSERT OR UPDATE ON public.client_training FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();


ALTER TABLE public.coach_own_todolist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_auto_todolist ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.coach_own_todolist FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_auto_todolist FORCE ROW LEVEL SECURITY;


-- 7.7 Habit log update audit (upsert-friendly)
CREATE OR REPLACE FUNCTION public.set_habit_log_updated_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_chl_updated
BEFORE UPDATE ON public.client_habit_logs
FOR EACH ROW EXECUTE FUNCTION public.set_habit_log_updated_fields();

-- ================================================
-- STEP 8: RLS enable + FORCE
-- ================================================
ALTER TABLE public.client_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_training_summary   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_metrics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_habits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_files               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_metric_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_habit_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_metric_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_habit_logs         ENABLE ROW LEVEL SECURITY;
-- Forms
ALTER TABLE public.coach_checkins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_questionnaires          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_exercises               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_workouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_programs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_training               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_checkin_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_questionnaire_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_checkin_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_questionnaire_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_photo_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_bio                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_goals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_injuries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes                  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.client_profiles           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_training_summary   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_metrics             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_habits              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_files               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_metric_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_habit_assignments  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_assignments   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_metric_entries     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_habit_logs         FORCE ROW LEVEL SECURITY;
-- Forms
ALTER TABLE public.coach_checkins                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_questionnaires          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_exercises               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_workouts                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_programs                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_training               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_checkin_assignments    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_questionnaire_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_checkin_logs           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_questionnaire_logs     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_photo_logs             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_bio                    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_goals                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_injuries               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes                  FORCE ROW LEVEL SECURITY;

-- ================================================
-- STEP 9: RLS policies
-- ================================================

-- client_profiles
CREATE POLICY "cp_coach_select" ON public.client_profiles
FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "cp_client_select" ON public.client_profiles
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "cp_coach_insert" ON public.client_profiles
FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cp_coach_update" ON public.client_profiles
FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cp_client_update" ON public.client_profiles
FOR UPDATE USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

CREATE POLICY "cp_coach_delete" ON public.client_profiles
FOR DELETE USING (coach_id = auth.uid());

-- training summary
CREATE POLICY "cts_select" ON public.client_training_summary
FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.client_id = client_training_summary.client_id
      AND cp.coach_id = auth.uid()
  )
);

CREATE POLICY "cts_client_insert" ON public.client_training_summary
FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "cts_client_update" ON public.client_training_summary
FOR UPDATE USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

-- coach library: coach-only manage
CREATE POLICY "cm_coach_all" ON public.coach_metrics
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "ch_coach_all" ON public.coach_habits
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cf_coach_all" ON public.coach_files
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cc_coach_all" ON public.coach_checkins
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cq_coach_all" ON public.coach_questionnaires
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "ce_coach_all" ON public.coach_exercises
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cw_coach_all" ON public.coach_workouts
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cprog_coach_all" ON public.coach_programs
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());


-- clients can read ONLY what they’re assigned (Optimized - No Join to Profile)
CREATE POLICY "cm_client_read_assigned" ON public.coach_metrics
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.client_metric_assignments a
    WHERE a.coach_metric_id = coach_metrics.id
      AND a.client_id = auth.uid()
      AND a.is_active = TRUE
  )
);

CREATE POLICY "ch_client_read_assigned" ON public.coach_habits
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.client_habit_assignments a
    WHERE a.coach_habit_id = coach_habits.id
      AND a.client_id = auth.uid()
      AND a.is_active = TRUE
  )
);

-- files? Clients can read file metadata if assigned (Optimized)
CREATE POLICY "cf_client_read_assigned" ON public.coach_files
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.client_file_assignments a
    WHERE a.coach_file_id = coach_files.id
      AND a.client_id = auth.uid()
      AND a.is_active = TRUE
  )
);

-- forms: client read assigned
CREATE POLICY "cc_client_read_assigned" ON public.coach_checkins
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_checkin_assignments a
    WHERE a.coach_checkin_id = coach_checkins.id
      AND a.client_id = auth.uid()
      AND a.is_active = TRUE
  )
);
CREATE POLICY "cq_client_read_assigned" ON public.coach_questionnaires
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_questionnaire_assignments a
    WHERE a.coach_questionnaire_id = coach_questionnaires.id
      AND a.client_id = auth.uid()
      AND a.is_active = TRUE
  )
);


-- assignments: coach manage via denorm coach_id; client read own
CREATE POLICY "cma_coach_all" ON public.client_metric_assignments
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cma_client_select" ON public.client_metric_assignments
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "cha_coach_all" ON public.client_habit_assignments
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cha_client_select" ON public.client_habit_assignments
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "cfa_coach_all" ON public.client_file_assignments
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cfa_client_select" ON public.client_file_assignments
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "cca_coach_all" ON public.client_checkin_assignments
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "cca_client_select" ON public.client_checkin_assignments FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "cqa_coach_all" ON public.client_questionnaire_assignments
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "cqa_client_select" ON public.client_questionnaire_assignments FOR SELECT USING (client_id = auth.uid());


-- logs: shared manage (client or coach)
CREATE POLICY "cme_shared_all" ON public.client_metric_entries
FOR ALL USING (auth.uid() = client_id OR auth.uid() = coach_id)
WITH CHECK (auth.uid() = client_id OR auth.uid() = coach_id);

CREATE POLICY "chl_shared_all" ON public.client_habit_logs
FOR ALL USING (auth.uid() = client_id OR auth.uid() = coach_id)
WITH CHECK (auth.uid() = client_id OR auth.uid() = coach_id);

CREATE POLICY "ccl_shared_all" ON public.client_checkin_logs
FOR ALL USING (auth.uid() = client_id OR auth.uid() = coach_id)
WITH CHECK (auth.uid() = client_id OR auth.uid() = coach_id);

CREATE POLICY "cql_shared_all" ON public.client_questionnaire_logs
FOR ALL USING (auth.uid() = client_id OR auth.uid() = coach_id)
WITH CHECK (auth.uid() = client_id OR auth.uid() = coach_id);

CREATE POLICY "cpl_shared_all" ON public.client_photo_logs
FOR ALL USING (auth.uid() = client_id OR auth.uid() = coach_id)
WITH CHECK (auth.uid() = client_id OR auth.uid() = coach_id);

-- Coach Private Data (Bio, Goals, Injuries, Notes)
-- Coach ONLY access. No Client policies.
CREATE POLICY "cb_coach_all" ON public.client_bio
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cg_coach_all" ON public.client_goals
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "ci_coach_all" ON public.client_injuries
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "cn_coach_all" ON public.client_notes
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- client_training RLS: granular policies
-- SELECT: client or coach
CREATE POLICY "ct_select" ON public.client_training
FOR SELECT USING (auth.uid() = client_id OR auth.uid() = coach_id);

-- INSERT: coach only
CREATE POLICY "ct_insert_coach" ON public.client_training
FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- UPDATE: client or coach (status updates, logging)
CREATE POLICY "ct_update_shared" ON public.client_training
FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = coach_id)
WITH CHECK (auth.uid() = client_id OR auth.uid() = coach_id);

-- DELETE: coach only
CREATE POLICY "ct_delete_coach" ON public.client_training
FOR DELETE USING (auth.uid() = coach_id);


-- Coach Todo Lists RLS
-- coach_own_todolist (Coach Manage All)
CREATE POLICY "cot_coach_all" ON public.coach_own_todolist
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- coach_auto_todolist (Coach Manage All)
CREATE POLICY "cat_coach_all" ON public.coach_auto_todolist
FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());


-- Storage bucket policies (for storage.objects)
-- Note: 'coach_files' bucket must exist.
-- Coaches manage their own folder
CREATE POLICY "storage_coach_manage" ON storage.objects
FOR ALL USING (
  bucket_id = 'coach_files'
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'coach_files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Clients read assigned files (Optimized with Denormalized Path from Assignment)
CREATE POLICY "storage_client_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'coach_files'
  AND EXISTS (
    SELECT 1
    FROM public.client_file_assignments cfa
    WHERE cfa.client_id = auth.uid()
      AND cfa.coach_file_path = storage.objects.name -- Direct scan (via index)
      AND cfa.is_active = TRUE
  )
);

-- Client Photos (Bucket: 'client_photos')
-- Client: Full Manage Own Folder
CREATE POLICY "storage_client_photos_manage" ON storage.objects
FOR ALL USING (
  bucket_id = 'client_photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'client_photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Coach: Read Client Photos (If connected)
CREATE POLICY "storage_coach_read_client_photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'client_photos'
  AND EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.client_id::text = (storage.foldername(name))[1]
      AND (cp.coach_id = auth.uid() OR cp.client_id = auth.uid())
  )
);


-- ================================================
-- STEP 12: Client Form Views (Optimization)
-- ================================================
CREATE OR REPLACE VIEW public.client_checkins_view
WITH (security_invoker = true)
AS
SELECT
  cca.id AS assignment_id,
  cca.client_id,
  cca.coach_checkin_id,
  cca.sort_order,
  cca.is_active,
  cc.name,
  cc.description,
  cc.schedule_config,
  cc.cron_expression,
  cca.created_at AS assigned_at
FROM public.client_checkin_assignments cca
JOIN public.coach_checkins cc ON cca.coach_checkin_id = cc.id
WHERE cca.is_active = TRUE;

CREATE OR REPLACE VIEW public.client_questionnaires_view
WITH (security_invoker = true)
AS
SELECT
  cqa.id AS assignment_id,
  cqa.client_id,
  cqa.coach_questionnaire_id,
  cqa.sort_order,
  cqa.is_active,
  cq.name,
  cq.description,
  cqa.created_at AS assigned_at
FROM public.client_questionnaire_assignments cqa
JOIN public.coach_questionnaires cq ON cqa.coach_questionnaire_id = cq.id
WHERE cqa.is_active = TRUE;

-- ================================================
-- STEP 10: athletes_grid_view
-- ================================================
CREATE OR REPLACE VIEW public.athletes_grid_view
WITH (security_invoker = true) -- Security Fix
AS
SELECT
  cp.client_id AS id,
  up.name,
  up.profile_picture_url AS avatar,
  up.email,
  cts.last_activity,
  COALESCE(cts.last_7_days_training_completed, 0)  AS "last7DaysTraining",
  COALESCE(cts.last_30_days_training_completed, 0) AS "last30DaysTraining",
  cp.phone,
  cp.country,
  cp.city,
  cp.gender,
  cp.height_cm,
  cp.category,
  cp.is_active,
  cp.is_archived,
  (cp.status = 'connected') AS connected,
  cp.status AS "connectionStatus",
  CASE WHEN cp.connected_at IS NOT NULL THEN (CURRENT_DATE - cp.connected_at::DATE) ELSE 0 END AS "clientFor",
  CASE WHEN cp.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(cp.date_of_birth))::INTEGER ELSE NULL END AS age,
  cp.coach_id,
  cp.created_at,
  cp.updated_at
FROM public.client_profiles cp
LEFT JOIN public.user_profiles up ON cp.client_id = up.id
LEFT JOIN public.client_training_summary cts ON cp.client_id = cts.client_id;

-- ================================================
-- STEP 11: client_files_view (Optimization)
-- ================================================
CREATE OR REPLACE VIEW public.client_files_view
WITH (security_invoker = true) -- Security Fix
AS
SELECT
  cfa.id AS assignment_id,
  cfa.client_id,
  cfa.coach_file_id,
  cfa.display_name,
  cfa.sort_order,
  cfa.is_active,
  cf.filename,
  cf.mime_type,
  cf.size,
  cf.file_path,
  cf.bucket_id,
  cf.created_at AS file_created_at,
  cfa.created_at AS assigned_at
FROM public.client_file_assignments cfa
JOIN public.coach_files cf ON cfa.coach_file_id = cf.id
WHERE cfa.is_active = TRUE;

-- ================================================
-- STEP 13: Coach Review Views
-- ================================================
CREATE OR REPLACE VIEW public.coach_checkins_review_view
WITH (security_invoker = true)
AS
SELECT
  -- navigation keys
  ccl.id              AS checkin_log_id,      -- specific submitted instance
  ccl.client_id       AS client_id,
  ccl.coach_checkin_id AS coach_checkin_id,   -- template id

  -- display fields
  up.name             AS client_name,
  up.profile_picture_url AS client_avatar, -- Added
  up.email            AS client_email,     -- Added
  cc.name             AS checkin_name,
  cc.description      AS checkin_description, -- Added
  ccl.submission_date AS submission_date,

  -- useful extra fields for list + routing
  ccl.status          AS status,
  ccl.updated_at      AS updated_at,

  ccl.coach_id        AS coach_id
FROM public.client_checkin_logs ccl
JOIN public.coach_checkins cc
  ON cc.id = ccl.coach_checkin_id
LEFT JOIN public.user_profiles up
  ON up.id = ccl.client_id
WHERE
  ccl.coach_id = auth.uid()
  AND ccl.status = 'review';


-- ================================================
-- STEP 14: Grant permissions
-- ================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.athletes_grid_view TO authenticated;
GRANT SELECT ON public.client_files_view TO authenticated;
GRANT SELECT ON public.client_checkins_view TO authenticated;
GRANT SELECT ON public.client_questionnaires_view TO authenticated;
GRANT SELECT ON public.coach_checkins_review_view TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles           TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.client_training_summary   TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_metrics             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_habits              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_files               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_checkins            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_questionnaires      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_exercises           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_workouts            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_programs            TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_metric_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_habit_assignments  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_file_assignments   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_checkin_assignments   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_questionnaire_assignments   TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_metric_entries     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_habit_logs         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_checkin_logs       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_questionnaire_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_photo_logs         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_bio                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_goals              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_injuries           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_training           TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_own_todolist        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_auto_todolist       TO authenticated;
