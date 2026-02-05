-- Migration 035: Remove deprecated columns from assignment tables
-- Deprecated columns: is_active, sort_order, coach_id

-- 1. Drop dependent views first
DROP VIEW IF EXISTS public.client_checkins_view CASCADE;
DROP VIEW IF EXISTS public.client_questionnaires_view CASCADE;
DROP VIEW IF EXISTS public.client_files_view CASCADE;
DROP VIEW IF EXISTS public.coach_checkins_review_view CASCADE;

-- 2. Drop dependent RLS policies before modifying tables
-- 2.1 Policies on coach library tables that reference assignment tables
DROP POLICY IF EXISTS cm_all ON public.coach_metrics;
DROP POLICY IF EXISTS ch_all ON public.coach_habits;
DROP POLICY IF EXISTS cf_all ON public.coach_files;
DROP POLICY IF EXISTS cc_all ON public.coach_checkins;
DROP POLICY IF EXISTS cq_all ON public.coach_questionnaires;

-- 2.2 Policies on assignment tables themselves
DROP POLICY IF EXISTS cma_all ON public.client_metric_assignments;
DROP POLICY IF EXISTS cha_all ON public.client_habit_assignments;
DROP POLICY IF EXISTS cfa_all ON public.client_file_assignments;
DROP POLICY IF EXISTS cca_all ON public.client_checkin_assignments;
DROP POLICY IF EXISTS cqa_all ON public.client_questionnaire_assignments;
DROP POLICY IF EXISTS storage_client_read ON storage.objects;

-- 3. Drop dependent indexes
-- client_metric_assignments
DROP INDEX IF EXISTS public.idx_cma_client_active_sort;
DROP INDEX IF EXISTS public.idx_cma_metric_client_active;
DROP INDEX IF EXISTS public.idx_cma_coach;

-- client_habit_assignments
DROP INDEX IF EXISTS public.idx_cha_client_active_sort;
DROP INDEX IF EXISTS public.idx_cha_habit_client_active;
DROP INDEX IF EXISTS public.idx_cha_coach;

-- client_file_assignments
DROP INDEX IF EXISTS public.idx_cfa_client_active_sort;
DROP INDEX IF EXISTS public.idx_cfa_client_path_active;
DROP INDEX IF EXISTS public.idx_cfa_file_client_active;
DROP INDEX IF EXISTS public.idx_cfa_coach;

-- client_checkin_assignments
DROP INDEX IF EXISTS public.idx_cca_client;
DROP INDEX IF EXISTS public.idx_cca_checkin_active;
DROP INDEX IF EXISTS public.idx_cca_coach;

-- client_questionnaire_assignments
DROP INDEX IF EXISTS public.idx_cqa_client;
DROP INDEX IF EXISTS public.idx_cqa_quest_active;
DROP INDEX IF EXISTS public.idx_cqa_coach;

-- 4. Modify client_metric_assignments
ALTER TABLE public.client_metric_assignments DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.client_metric_assignments DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.client_metric_assignments DROP COLUMN IF EXISTS coach_id;

-- 5. Modify client_habit_assignments
ALTER TABLE public.client_habit_assignments DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.client_habit_assignments DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.client_habit_assignments DROP COLUMN IF EXISTS coach_id;

-- 6. Modify client_file_assignments
ALTER TABLE public.client_file_assignments DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.client_file_assignments DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.client_file_assignments DROP COLUMN IF EXISTS coach_id;

-- 7. Modify client_checkin_assignments
ALTER TABLE public.client_checkin_assignments DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.client_checkin_assignments DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.client_checkin_assignments DROP COLUMN IF EXISTS coach_id;

-- 8. Modify client_questionnaire_assignments
ALTER TABLE public.client_questionnaire_assignments DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.client_questionnaire_assignments DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.client_questionnaire_assignments DROP COLUMN IF EXISTS coach_id;

-- 9. Recreate policies without deprecated columns

-- 9.1 Recreate Coach Library Policies (allowing athletes to see items assigned to them)
CREATE POLICY cm_all ON public.coach_metrics FOR ALL TO authenticated
  USING (coach_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.client_metric_assignments a WHERE a.metric_id = coach_metrics.id AND a.client_id = (select auth.uid())))
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY ch_all ON public.coach_habits FOR ALL TO authenticated
  USING (coach_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.client_habit_assignments a WHERE a.habit_id = coach_habits.id AND a.client_id = (select auth.uid())))
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY cf_all ON public.coach_files FOR ALL TO authenticated
  USING (coach_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.client_file_assignments a WHERE a.file_id = coach_files.id AND a.client_id = (select auth.uid())))
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY cc_all ON public.coach_checkins FOR ALL TO authenticated
  USING (coach_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.client_checkin_assignments a WHERE a.checkin_id = coach_checkins.id AND a.client_id = (select auth.uid())))
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY cq_all ON public.coach_questionnaires FOR ALL TO authenticated
  USING (coach_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.client_questionnaire_assignments a WHERE a.questionnaire_id = coach_questionnaires.id AND a.client_id = (select auth.uid())))
  WITH CHECK (coach_id = (select auth.uid()));

-- 9.2 Recreate Assignment Table Policies
-- Coaches verify access via coach_client_assignments relationship
CREATE POLICY cma_all ON public.client_metric_assignments FOR ALL TO authenticated
  USING (client_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_metric_assignments.client_id AND cca.coach_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_metric_assignments.client_id AND cca.coach_id = (select auth.uid())));

CREATE POLICY cha_all ON public.client_habit_assignments FOR ALL TO authenticated
  USING (client_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_habit_assignments.client_id AND cca.coach_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_habit_assignments.client_id AND cca.coach_id = (select auth.uid())));

CREATE POLICY cfa_all ON public.client_file_assignments FOR ALL TO authenticated
  USING (client_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_file_assignments.client_id AND cca.coach_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_file_assignments.client_id AND cca.coach_id = (select auth.uid())));

CREATE POLICY storage_client_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'coach_files'
  AND EXISTS (
    SELECT 1
    FROM public.client_file_assignments cfa
    WHERE cfa.client_id = (select auth.uid())
      AND (cfa.coach_file_path = storage.objects.name OR cfa.file_path = storage.objects.name)
  )
);

CREATE POLICY cca_all ON public.client_checkin_assignments FOR ALL TO authenticated
  USING (client_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_checkin_assignments.client_id AND cca.coach_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_checkin_assignments.client_id AND cca.coach_id = (select auth.uid())));

CREATE POLICY cqa_all ON public.client_questionnaire_assignments FOR ALL TO authenticated
  USING (client_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_questionnaire_assignments.client_id AND cca.coach_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = public.client_questionnaire_assignments.client_id AND cca.coach_id = (select auth.uid())));


-- 10. Recreate views without deprecated columns
-- Using security_invoker = true as per standard

-- 10.1 client_checkins_view
CREATE OR REPLACE VIEW public.client_checkins_view 
WITH (security_invoker = true)
AS
SELECT 
    cca.id as assignment_id,
    cca.client_id,
    cca.checkin_id,
    cc.name,
    cc.description,
    cc.questions,
    cc.schedule_config,
    cc.cron_expression
FROM public.client_checkin_assignments cca
JOIN public.coach_checkins cc ON cca.checkin_id = cc.id;

-- 10.2 client_questionnaires_view
CREATE OR REPLACE VIEW public.client_questionnaires_view 
WITH (security_invoker = true)
AS
SELECT 
    cqa.id as assignment_id,
    cqa.client_id,
    cqa.questionnaire_id,
    cq.name,
    cq.description,
    cq.questions
FROM public.client_questionnaire_assignments cqa
JOIN public.coach_questionnaires cq ON cqa.questionnaire_id = cq.id;

-- 10.3 client_files_view
CREATE OR REPLACE VIEW public.client_files_view 
WITH (security_invoker = true)
AS
SELECT 
    cfa.id as assignment_id,
    cfa.client_id,
    cfa.file_id,
    cf.filename,
    cf.file_path,
    cf.mime_type,
    cf.size,
    cf.created_at
FROM public.client_file_assignments cfa
JOIN public.coach_files cf ON cfa.file_id = cf.id;

-- 10.4 coach_checkins_review_view
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
    up.name as client_name,
    up.profile_picture_url as client_avatar,
    cc.name as checkin_name,
    ccl.coach_id
FROM public.client_checkin_logs ccl
JOIN public.client_checkin_assignments cca ON ccl.assignment_id = cca.id
JOIN public.coach_checkins cc ON cca.checkin_id = cc.id
JOIN public.user_profiles up ON up.id = ccl.client_id;
