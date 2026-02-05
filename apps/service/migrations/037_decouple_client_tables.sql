-- Migration 037: Decouple client tables from coach tables.
-- Strategy: Add new columns, backfill data, drop old columns with CASCADE to handle all dependencies automatically.

-- Step 1: Rename assignment tables to client_* tables
ALTER TABLE IF EXISTS public.client_metric_assignments RENAME TO client_metrics;
ALTER TABLE IF EXISTS public.client_habit_assignments RENAME TO client_habits;
ALTER TABLE IF EXISTS public.client_file_assignments RENAME TO client_files;
ALTER TABLE IF EXISTS public.client_checkin_assignments RENAME TO client_checkins;
ALTER TABLE IF EXISTS public.client_questionnaire_assignments RENAME TO client_questionnaires;

-- Step 2: Add new columns to client_metrics
ALTER TABLE public.client_metrics
    ADD COLUMN IF NOT EXISTS coach_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS unit TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS value_kind TEXT CHECK (value_kind IN ('number','percent','duration','score')),
    ADD COLUMN IF NOT EXISTS min_value NUMERIC,
    ADD COLUMN IF NOT EXISTS max_value NUMERIC;

-- Backfill from coach_metrics
UPDATE public.client_metrics cm
SET
    coach_id = c.coach_id,
    name = c.name,
    unit = c.unit,
    description = c.description,
    value_kind = c.value_kind,
    min_value = c.min_value,
    max_value = c.max_value
FROM public.coach_metrics c
WHERE cm.metric_id = c.id;

-- Backfill coach_id for any rows that don't have it
UPDATE public.client_metrics cm
SET coach_id = cca.coach_id
FROM public.coach_client_assignments cca
WHERE cm.client_id = cca.client_id AND cm.coach_id IS NULL;

ALTER TABLE public.client_metrics ALTER COLUMN coach_id SET NOT NULL;
ALTER TABLE public.client_metrics ALTER COLUMN name SET NOT NULL;

-- Drop old column with CASCADE to handle all dependencies
ALTER TABLE public.client_metrics DROP COLUMN IF EXISTS metric_id CASCADE;

-- Step 3: Add new columns to client_habits
ALTER TABLE public.client_habits
    ADD COLUMN IF NOT EXISTS coach_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS schedule_type TEXT CHECK (schedule_type IN ('daily','weekly','custom')),
    ADD COLUMN IF NOT EXISTS days_of_week SMALLINT[],
    ADD COLUMN IF NOT EXISTS times_of_day TIME[],
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb;

-- Backfill from coach_habits
UPDATE public.client_habits ch
SET
    coach_id = c.coach_id,
    name = c.name,
    description = c.description,
    schedule_type = c.schedule_type,
    days_of_week = c.days_of_week,
    times_of_day = c.times_of_day,
    timezone = c.timezone,
    start_date = c.start_date,
    end_date = c.end_date,
    schedule_config = c.schedule_config
FROM public.coach_habits c
WHERE ch.habit_id = c.id;

-- Backfill coach_id for any rows that don't have it
UPDATE public.client_habits ch
SET coach_id = cca.coach_id
FROM public.coach_client_assignments cca
WHERE ch.client_id = cca.client_id AND ch.coach_id IS NULL;

ALTER TABLE public.client_habits ALTER COLUMN coach_id SET NOT NULL;
ALTER TABLE public.client_habits ALTER COLUMN name SET NOT NULL;

-- Drop old column with CASCADE
ALTER TABLE public.client_habits DROP COLUMN IF EXISTS habit_id CASCADE;

-- Step 4: Add new columns to client_files
ALTER TABLE public.client_files
    ADD COLUMN IF NOT EXISTS coach_id UUID,
    ADD COLUMN IF NOT EXISTS filename TEXT,
    ADD COLUMN IF NOT EXISTS file_path TEXT,
    ADD COLUMN IF NOT EXISTS mime_type TEXT,
    ADD COLUMN IF NOT EXISTS size BIGINT;

-- Backfill from coach_files
UPDATE public.client_files cf
SET
    coach_id = c.coach_id,
    filename = c.filename,
    file_path = c.file_path,
    mime_type = c.mime_type,
    size = c.size
FROM public.coach_files c
WHERE cf.file_id = c.id;

-- Backfill coach_id for any rows that don't have it
UPDATE public.client_files cf
SET coach_id = cca.coach_id
FROM public.coach_client_assignments cca
WHERE cf.client_id = cca.client_id AND cf.coach_id IS NULL;

ALTER TABLE public.client_files ALTER COLUMN coach_id SET NOT NULL;
ALTER TABLE public.client_files ALTER COLUMN filename SET NOT NULL;
ALTER TABLE public.client_files ALTER COLUMN file_path SET NOT NULL;

-- Drop old columns with CASCADE
ALTER TABLE public.client_files DROP COLUMN IF EXISTS file_id CASCADE;
ALTER TABLE public.client_files DROP COLUMN IF EXISTS coach_file_path CASCADE;

-- Step 5: Add new columns to client_checkins
ALTER TABLE public.client_checkins
    ADD COLUMN IF NOT EXISTS coach_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS schedule_config JSONB,
    ADD COLUMN IF NOT EXISTS cron_expression TEXT;

-- Backfill from coach_checkins
UPDATE public.client_checkins cc
SET
    coach_id = c.coach_id,
    name = c.name,
    description = c.description,
    questions = c.questions,
    schedule_config = c.schedule_config,
    cron_expression = c.cron_expression
FROM public.coach_checkins c
WHERE cc.checkin_id = c.id;

-- Backfill coach_id for any rows that don't have it
UPDATE public.client_checkins cc
SET coach_id = cca.coach_id
FROM public.coach_client_assignments cca
WHERE cc.client_id = cca.client_id AND cc.coach_id IS NULL;

ALTER TABLE public.client_checkins ALTER COLUMN coach_id SET NOT NULL;
ALTER TABLE public.client_checkins ALTER COLUMN name SET NOT NULL;

-- Drop old column with CASCADE
ALTER TABLE public.client_checkins DROP COLUMN IF EXISTS checkin_id CASCADE;

-- Step 6: Add new columns to client_questionnaires
ALTER TABLE public.client_questionnaires
    ADD COLUMN IF NOT EXISTS coach_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- Backfill from coach_questionnaires
UPDATE public.client_questionnaires cq
SET
    coach_id = c.coach_id,
    name = c.name,
    description = c.description,
    questions = c.questions
FROM public.coach_questionnaires c
WHERE cq.questionnaire_id = c.id;

-- Backfill coach_id for any rows that don't have it
UPDATE public.client_questionnaires cq
SET coach_id = cca.coach_id
FROM public.coach_client_assignments cca
WHERE cq.client_id = cca.client_id AND cq.coach_id IS NULL;

ALTER TABLE public.client_questionnaires ALTER COLUMN coach_id SET NOT NULL;
ALTER TABLE public.client_questionnaires ALTER COLUMN name SET NOT NULL;

-- Drop old column with CASCADE
ALTER TABLE public.client_questionnaires DROP COLUMN IF EXISTS questionnaire_id CASCADE;

-- Step 7: Add composite primary keys (id, client_id, coach_id) while maintaining id uniqueness
-- client_metrics
ALTER TABLE public.client_metrics DROP CONSTRAINT IF EXISTS client_metric_assignments_pkey CASCADE;
ALTER TABLE public.client_metrics ADD CONSTRAINT client_metrics_pkey PRIMARY KEY (id, client_id, coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_metrics_id_unique ON public.client_metrics(id);

-- client_habits
ALTER TABLE public.client_habits DROP CONSTRAINT IF EXISTS client_habit_assignments_pkey CASCADE;
ALTER TABLE public.client_habits ADD CONSTRAINT client_habits_pkey PRIMARY KEY (id, client_id, coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_habits_id_unique ON public.client_habits(id);

-- client_files
ALTER TABLE public.client_files DROP CONSTRAINT IF EXISTS client_file_assignments_pkey CASCADE;
ALTER TABLE public.client_files ADD CONSTRAINT client_files_pkey PRIMARY KEY (id, client_id, coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_files_id_unique ON public.client_files(id);

-- client_checkins
ALTER TABLE public.client_checkins DROP CONSTRAINT IF EXISTS client_checkin_assignments_pkey CASCADE;
ALTER TABLE public.client_checkins ADD CONSTRAINT client_checkins_pkey PRIMARY KEY (id, client_id, coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_checkins_id_unique ON public.client_checkins(id);

-- client_questionnaires
ALTER TABLE public.client_questionnaires DROP CONSTRAINT IF EXISTS client_questionnaire_assignments_pkey CASCADE;
ALTER TABLE public.client_questionnaires ADD CONSTRAINT client_questionnaires_pkey PRIMARY KEY (id, client_id, coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_questionnaires_id_unique ON public.client_questionnaires(id);

-- Step 8: Recreate RLS policies for client tables
DROP POLICY IF EXISTS cm_all ON public.client_metrics;
CREATE POLICY cm_all ON public.client_metrics
    FOR ALL TO authenticated
    USING (client_id = auth.uid() OR coach_id = auth.uid())
    WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());

DROP POLICY IF EXISTS ch_all ON public.client_habits;
CREATE POLICY ch_all ON public.client_habits
    FOR ALL TO authenticated
    USING (client_id = auth.uid() OR coach_id = auth.uid())
    WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());

DROP POLICY IF EXISTS cf_all ON public.client_files;
CREATE POLICY cf_all ON public.client_files
    FOR ALL TO authenticated
    USING (client_id = auth.uid() OR coach_id = auth.uid())
    WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());

DROP POLICY IF EXISTS cc_all ON public.client_checkins;
CREATE POLICY cc_all ON public.client_checkins
    FOR ALL TO authenticated
    USING (client_id = auth.uid() OR coach_id = auth.uid())
    WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());

DROP POLICY IF EXISTS cq_all ON public.client_questionnaires;
CREATE POLICY cq_all ON public.client_questionnaires
    FOR ALL TO authenticated
    USING (client_id = auth.uid() OR coach_id = auth.uid())
    WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());

-- Step 9: Recreate RLS policies for coach tables
DROP POLICY IF EXISTS cm_all ON public.coach_metrics;
CREATE POLICY cm_all ON public.coach_metrics
    FOR ALL TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS ch_all ON public.coach_habits;
CREATE POLICY ch_all ON public.coach_habits
    FOR ALL TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS cf_all ON public.coach_files;
CREATE POLICY cf_all ON public.coach_files
    FOR ALL TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS cc_all ON public.coach_checkins;
CREATE POLICY cc_all ON public.coach_checkins
    FOR ALL TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS cq_all ON public.coach_questionnaires;
CREATE POLICY cq_all ON public.coach_questionnaires
    FOR ALL TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- Step 10: Recreate storage policies
DROP POLICY IF EXISTS storage_coach_manage ON storage.objects;
CREATE POLICY storage_coach_manage
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'coach_files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'coach_files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS storage_client_read ON storage.objects;
CREATE POLICY storage_client_read
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'coach_files'
  AND EXISTS (
    SELECT 1 FROM public.client_files cf
    WHERE cf.client_id = auth.uid() AND cf.file_path = storage.objects.name
  )
);

DROP POLICY IF EXISTS storage_client_photos_manage ON storage.objects;
CREATE POLICY storage_client_photos_manage
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'client_photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'client_photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS storage_coach_read_client_photos ON storage.objects;
CREATE POLICY storage_coach_read_client_photos
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client_photos'
  AND EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = cca.client_id::text
  )
);

-- Step 11: Recreate coach_checkins_review_view
DROP VIEW IF EXISTS public.coach_checkins_review_view CASCADE;
CREATE OR REPLACE VIEW public.coach_checkins_review_view 
WITH (security_invoker = true)
AS
SELECT 
    ccl.id as log_id,
    ccl.client_id,
    ccl.assignment_id,
    ccl.submission_date,
    ccl.answers,
    ccl.status as review_status,
    ccl.coach_comment,
    cp.name as client_name,
    cp.profile_picture_url as client_avatar,
    cc.name as checkin_name,
    ccl.coach_id
FROM public.client_checkin_logs ccl
JOIN public.client_checkins cc ON ccl.assignment_id = cc.id
JOIN public.client_profiles cp ON cp.client_id = ccl.client_id;

GRANT SELECT ON public.coach_checkins_review_view TO authenticated;
