-- Migration: Pivot private items to client tables (Copy-on-Assignment)
-- Goal: 
-- 1. Revert base table changes (remove client_id)
-- 2. Move private definitions into assignment tables
-- 3. Ensure assignments are independent of library items (Copy-on-Assignment)
-- 4. Point log tables to assignments instead of library items

-- 0. Drop dependent views to allow column changes
DROP VIEW IF EXISTS public.client_checkins_view;
DROP VIEW IF EXISTS public.client_questionnaires_view;
DROP VIEW IF EXISTS public.client_files_view;
DROP VIEW IF EXISTS public.coach_checkins_review_view;

-- 1. Revert base table changes
ALTER TABLE public.coach_metrics DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_habits DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_files DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_checkins DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_questionnaires DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_workouts DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_programs DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_exercises DROP COLUMN IF EXISTS client_id;

-- 2. Update Assignment Tables to support local definitions & independence

-- 2.1 client_metric_assignments
ALTER TABLE public.client_metric_assignments RENAME COLUMN coach_metric_id TO metric_id;
ALTER TABLE public.client_metric_assignments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.client_metric_assignments ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.client_metric_assignments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.client_metric_assignments ADD COLUMN IF NOT EXISTS value_kind TEXT CHECK (value_kind IN ('number','percent','duration','score'));
ALTER TABLE public.client_metric_assignments ALTER COLUMN metric_id DROP NOT NULL;

-- Make metric_id reference independent
ALTER TABLE public.client_metric_assignments 
  DROP CONSTRAINT IF EXISTS fk_cma_metric,
  ADD CONSTRAINT fk_cma_metric 
    FOREIGN KEY (metric_id) 
    REFERENCES public.coach_metrics(id) 
    ON DELETE SET NULL;

-- 2.2 client_habit_assignments
ALTER TABLE public.client_habit_assignments RENAME COLUMN coach_habit_id TO habit_id;
ALTER TABLE public.client_habit_assignments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.client_habit_assignments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.client_habit_assignments ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.client_habit_assignments ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.client_habit_assignments ADD COLUMN IF NOT EXISTS period TEXT CHECK (period IN ('daily','weekly'));
ALTER TABLE public.client_habit_assignments ALTER COLUMN habit_id DROP NOT NULL;

-- Make habit_id reference independent
ALTER TABLE public.client_habit_assignments 
  DROP CONSTRAINT IF EXISTS fk_cha_habit,
  ADD CONSTRAINT fk_cha_habit 
    FOREIGN KEY (habit_id) 
    REFERENCES public.coach_habits(id) 
    ON DELETE SET NULL;

-- 2.3 client_file_assignments
ALTER TABLE public.client_file_assignments RENAME COLUMN coach_file_id TO file_id;
ALTER TABLE public.client_file_assignments ADD COLUMN IF NOT EXISTS bucket_id TEXT DEFAULT 'coach_files';
ALTER TABLE public.client_file_assignments ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.client_file_assignments ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.client_file_assignments ADD COLUMN IF NOT EXISTS size BIGINT;
ALTER TABLE public.client_file_assignments ALTER COLUMN file_id DROP NOT NULL;

-- Make file_id reference independent
ALTER TABLE public.client_file_assignments 
  DROP CONSTRAINT IF EXISTS fk_cfa_file,
  ADD CONSTRAINT fk_cfa_file 
    FOREIGN KEY (file_id) 
    REFERENCES public.coach_files(id) 
    ON DELETE SET NULL;

-- 2.4 client_checkin_assignments
ALTER TABLE public.client_checkin_assignments RENAME COLUMN coach_checkin_id TO checkin_id;
ALTER TABLE public.client_checkin_assignments ALTER COLUMN checkin_id DROP NOT NULL;

-- 2.5 client_questionnaire_assignments
ALTER TABLE public.client_questionnaire_assignments RENAME COLUMN coach_questionnaire_id TO questionnaire_id;
ALTER TABLE public.client_questionnaire_assignments ALTER COLUMN questionnaire_id DROP NOT NULL;

-- 3. Update Log Tables to reference assignments

-- 3.1 client_metric_logs
ALTER TABLE public.client_metric_logs ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.client_metric_assignments(id) ON DELETE CASCADE;

-- Migrate existing metric logs to point to assignments
UPDATE public.client_metric_logs e
SET assignment_id = a.id
FROM public.client_metric_assignments a
WHERE e.coach_metric_id = a.metric_id AND e.client_id = a.client_id;

-- Make it mandatory and drop old column
ALTER TABLE public.client_metric_logs ALTER COLUMN assignment_id SET NOT NULL;
ALTER TABLE public.client_metric_logs DROP COLUMN IF EXISTS coach_metric_id;
CREATE INDEX IF NOT EXISTS idx_cme_assignment_id ON public.client_metric_logs(assignment_id);

-- 3.2 client_habit_logs
ALTER TABLE public.client_habit_logs ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.client_habit_assignments(id) ON DELETE CASCADE;

UPDATE public.client_habit_logs l
SET assignment_id = a.id
FROM public.client_habit_assignments a
WHERE l.coach_habit_id = a.habit_id AND l.client_id = a.client_id;

ALTER TABLE public.client_habit_logs ALTER COLUMN assignment_id SET NOT NULL;
ALTER TABLE public.client_habit_logs DROP COLUMN IF EXISTS coach_habit_id;
CREATE INDEX IF NOT EXISTS idx_chl_assignment_id ON public.client_habit_logs(assignment_id);

-- 3.3 client_checkin_logs
ALTER TABLE public.client_checkin_logs ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.client_checkin_assignments(id) ON DELETE CASCADE;

UPDATE public.client_checkin_logs l
SET assignment_id = a.id
FROM public.client_checkin_assignments a
WHERE l.coach_checkin_id = a.checkin_id AND l.client_id = a.client_id;

ALTER TABLE public.client_checkin_logs ALTER COLUMN assignment_id SET NOT NULL;
ALTER TABLE public.client_checkin_logs DROP COLUMN IF EXISTS coach_checkin_id;
CREATE INDEX IF NOT EXISTS idx_ccl_assignment_id ON public.client_checkin_logs(assignment_id);

-- 3.4 client_questionnaire_logs
ALTER TABLE public.client_questionnaire_logs ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.client_questionnaire_assignments(id) ON DELETE CASCADE;

UPDATE public.client_questionnaire_logs l
SET assignment_id = a.id
FROM public.client_questionnaire_assignments a
WHERE l.coach_questionnaire_id = a.questionnaire_id AND l.client_id = a.client_id;

ALTER TABLE public.client_questionnaire_logs ALTER COLUMN assignment_id SET NOT NULL;
ALTER TABLE public.client_questionnaire_logs DROP COLUMN IF EXISTS coach_questionnaire_id;
CREATE INDEX IF NOT EXISTS idx_cql_assignment_id ON public.client_questionnaire_logs(assignment_id);


-- 4. Recreate dependent views with correct column names

-- 4.1 client_checkins_view
CREATE OR REPLACE VIEW public.client_checkins_view
WITH (security_invoker = true)
AS
SELECT
  cca.id AS assignment_id,
  cca.client_id,
  cca.checkin_id,
  cca.sort_order,
  cca.is_active,
  cc.name,
  cc.description,
  cc.schedule_config,
  cc.cron_expression,
  cca.created_at AS assigned_at
FROM public.client_checkin_assignments cca
LEFT JOIN public.coach_checkins cc ON cca.checkin_id = cc.id
WHERE cca.is_active = TRUE;

-- 4.2 client_questionnaires_view
CREATE OR REPLACE VIEW public.client_questionnaires_view
WITH (security_invoker = true)
AS
SELECT
  cqa.id AS assignment_id,
  cqa.client_id,
  cqa.questionnaire_id,
  cqa.sort_order,
  cqa.is_active,
  cq.name,
  cq.description,
  cqa.created_at AS assigned_at
FROM public.client_questionnaire_assignments cqa
LEFT JOIN public.coach_questionnaires cq ON cqa.questionnaire_id = cq.id
WHERE cqa.is_active = TRUE;

-- 4.3 client_files_view
CREATE OR REPLACE VIEW public.client_files_view
WITH (security_invoker = true)
AS
SELECT
  cfa.id AS assignment_id,
  cfa.client_id,
  cfa.file_id,
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
LEFT JOIN public.coach_files cf ON cfa.file_id = cf.id
WHERE cfa.is_active = TRUE;

-- 4.4 coach_checkins_review_view
CREATE OR REPLACE VIEW public.coach_checkins_review_view
WITH (security_invoker = true)
AS
SELECT
  ccl.id              AS checkin_log_id,
  ccl.client_id       AS client_id,
  cca.checkin_id      AS coach_checkin_id,
  up.name             AS client_name,
  up.profile_picture_url AS client_avatar,
  up.email            AS client_email,
  cc.name             AS checkin_name,
  cc.description      AS checkin_description,
  ccl.submission_date AS submission_date,
  ccl.status          AS status,
  ccl.updated_at      AS updated_at,
  ccl.coach_id        AS coach_id
FROM public.client_checkin_logs ccl
JOIN public.client_checkin_assignments cca ON ccl.assignment_id = cca.id
LEFT JOIN public.coach_checkins cc ON cc.id = cca.checkin_id
LEFT JOIN public.user_profiles up ON up.id = ccl.client_id
WHERE
  ccl.coach_id = auth.uid()
  AND ccl.status = 'review';

-- Grant permissions back
GRANT SELECT ON public.client_checkins_view TO authenticated;
GRANT SELECT ON public.client_questionnaires_view TO authenticated;
GRANT SELECT ON public.client_files_view TO authenticated;
GRANT SELECT ON public.coach_checkins_review_view TO authenticated;
