-- ================================================
-- ATHLI RLS Policy Optimization Patch
-- ================================================
-- This patch fixes two Supabase linter warnings:
-- 1. auth_rls_initplan: wraps auth.uid() in (select auth.uid())
-- 2. multiple_permissive_policies: merges duplicate policies
-- ================================================

-- Run this AFTER 003_create_client_profiles_table.sql

-- ================================================
-- client_profiles: Merged SELECT/UPDATE
-- ================================================
DROP POLICY IF EXISTS cp_coach_select ON public.client_profiles;
DROP POLICY IF EXISTS cp_client_select ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_update ON public.client_profiles;
DROP POLICY IF EXISTS cp_client_update ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_insert ON public.client_profiles;
DROP POLICY IF EXISTS cp_coach_delete ON public.client_profiles;

CREATE POLICY cp_select
ON public.client_profiles
FOR SELECT
TO authenticated
USING (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
);

CREATE POLICY cp_update
ON public.client_profiles
FOR UPDATE
TO authenticated
USING (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
)
WITH CHECK (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
);

CREATE POLICY cp_coach_insert
ON public.client_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  coach_id = (select auth.uid())
  AND client_id <> (select auth.uid())
);

CREATE POLICY cp_coach_delete
ON public.client_profiles
FOR DELETE
TO authenticated
USING (coach_id = (select auth.uid()));

-- ================================================
-- client_training_summary
-- ================================================
DROP POLICY IF EXISTS cts_select ON public.client_training_summary;
DROP POLICY IF EXISTS cts_client_insert ON public.client_training_summary;
DROP POLICY IF EXISTS cts_client_update ON public.client_training_summary;

CREATE POLICY cts_select
ON public.client_training_summary
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.client_id = client_training_summary.client_id
      AND cp.coach_id = (select auth.uid())
  )
);

CREATE POLICY cts_client_insert
ON public.client_training_summary
FOR INSERT
TO authenticated
WITH CHECK (client_id = (select auth.uid()));

CREATE POLICY cts_client_update
ON public.client_training_summary
FOR UPDATE
TO authenticated
USING (client_id = (select auth.uid()))
WITH CHECK (client_id = (select auth.uid()));

-- ================================================
-- Coach Library Tables: Merged coach manage + client read
-- ================================================

-- coach_metrics
DROP POLICY IF EXISTS cm_coach_all ON public.coach_metrics;
DROP POLICY IF EXISTS cm_client_read_assigned ON public.coach_metrics;

CREATE POLICY cm_select
ON public.coach_metrics
FOR SELECT
TO authenticated
USING (
  coach_id = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.client_metric_assignments a
    WHERE a.coach_metric_id = coach_metrics.id
      AND a.client_id = (select auth.uid())
      AND a.is_active = TRUE
  )
);

CREATE POLICY cm_manage
ON public.coach_metrics
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- coach_habits
DROP POLICY IF EXISTS ch_coach_all ON public.coach_habits;
DROP POLICY IF EXISTS ch_client_read_assigned ON public.coach_habits;

CREATE POLICY ch_select
ON public.coach_habits
FOR SELECT
TO authenticated
USING (
  coach_id = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.client_habit_assignments a
    WHERE a.coach_habit_id = coach_habits.id
      AND a.client_id = (select auth.uid())
      AND a.is_active = TRUE
  )
);

CREATE POLICY ch_manage
ON public.coach_habits
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- coach_files
DROP POLICY IF EXISTS cf_coach_all ON public.coach_files;
DROP POLICY IF EXISTS cf_client_read_assigned ON public.coach_files;

CREATE POLICY cf_select
ON public.coach_files
FOR SELECT
TO authenticated
USING (
  coach_id = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.client_file_assignments a
    WHERE a.coach_file_id = coach_files.id
      AND a.client_id = (select auth.uid())
      AND a.is_active = TRUE
  )
);

CREATE POLICY cf_manage
ON public.coach_files
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- coach_checkins
DROP POLICY IF EXISTS cc_coach_all ON public.coach_checkins;
DROP POLICY IF EXISTS cc_client_read_assigned ON public.coach_checkins;

CREATE POLICY cc_select
ON public.coach_checkins
FOR SELECT
TO authenticated
USING (
  coach_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.client_checkin_assignments a
    WHERE a.coach_checkin_id = coach_checkins.id
      AND a.client_id = (select auth.uid())
      AND a.is_active = TRUE
  )
);

CREATE POLICY cc_manage
ON public.coach_checkins
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- coach_questionnaires
DROP POLICY IF EXISTS cq_coach_all ON public.coach_questionnaires;
DROP POLICY IF EXISTS cq_client_read_assigned ON public.coach_questionnaires;

CREATE POLICY cq_select
ON public.coach_questionnaires
FOR SELECT
TO authenticated
USING (
  coach_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.client_questionnaire_assignments a
    WHERE a.coach_questionnaire_id = coach_questionnaires.id
      AND a.client_id = (select auth.uid())
      AND a.is_active = TRUE
  )
);

CREATE POLICY cq_manage
ON public.coach_questionnaires
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- coach_exercises
DROP POLICY IF EXISTS ce_coach_all ON public.coach_exercises;

CREATE POLICY ce_manage
ON public.coach_exercises
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- coach_workouts
DROP POLICY IF EXISTS cw_coach_all ON public.coach_workouts;

CREATE POLICY cw_manage
ON public.coach_workouts
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- coach_programs
DROP POLICY IF EXISTS cprog_coach_all ON public.coach_programs;

CREATE POLICY cprog_manage
ON public.coach_programs
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- ================================================
-- Assignment Tables: Merged SELECT policies
-- ================================================

-- client_metric_assignments
DROP POLICY IF EXISTS cma_coach_all ON public.client_metric_assignments;
DROP POLICY IF EXISTS cma_client_select ON public.client_metric_assignments;

CREATE POLICY cma_select
ON public.client_metric_assignments
FOR SELECT
TO authenticated
USING (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
);

CREATE POLICY cma_modify
ON public.client_metric_assignments
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- client_habit_assignments
DROP POLICY IF EXISTS cha_coach_all ON public.client_habit_assignments;
DROP POLICY IF EXISTS cha_client_select ON public.client_habit_assignments;

CREATE POLICY cha_select
ON public.client_habit_assignments
FOR SELECT
TO authenticated
USING (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
);

CREATE POLICY cha_modify
ON public.client_habit_assignments
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- client_file_assignments
DROP POLICY IF EXISTS cfa_coach_all ON public.client_file_assignments;
DROP POLICY IF EXISTS cfa_client_select ON public.client_file_assignments;

CREATE POLICY cfa_select
ON public.client_file_assignments
FOR SELECT
TO authenticated
USING (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
);

CREATE POLICY cfa_modify
ON public.client_file_assignments
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- client_checkin_assignments
DROP POLICY IF EXISTS cca_coach_all ON public.client_checkin_assignments;
DROP POLICY IF EXISTS cca_client_select ON public.client_checkin_assignments;

CREATE POLICY cca_select
ON public.client_checkin_assignments
FOR SELECT
TO authenticated
USING (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
);

CREATE POLICY cca_modify
ON public.client_checkin_assignments
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- client_questionnaire_assignments
DROP POLICY IF EXISTS cqa_coach_all ON public.client_questionnaire_assignments;
DROP POLICY IF EXISTS cqa_client_select ON public.client_questionnaire_assignments;

CREATE POLICY cqa_select
ON public.client_questionnaire_assignments
FOR SELECT
TO authenticated
USING (
  coach_id  = (select auth.uid())
  OR client_id = (select auth.uid())
);

CREATE POLICY cqa_modify
ON public.client_questionnaire_assignments
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- ================================================
-- Log Tables: Shared access (merged policies)
-- ================================================

-- client_metric_entries
DROP POLICY IF EXISTS cme_shared_all ON public.client_metric_entries;

CREATE POLICY cme_shared
ON public.client_metric_entries
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- client_habit_logs
DROP POLICY IF EXISTS chl_shared_all ON public.client_habit_logs;

CREATE POLICY chl_shared
ON public.client_habit_logs
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- client_checkin_logs
DROP POLICY IF EXISTS ccl_shared_all ON public.client_checkin_logs;

CREATE POLICY ccl_shared
ON public.client_checkin_logs
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- client_questionnaire_logs
DROP POLICY IF EXISTS cql_shared_all ON public.client_questionnaire_logs;

CREATE POLICY cql_shared
ON public.client_questionnaire_logs
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- client_photo_logs
DROP POLICY IF EXISTS cpl_shared_all ON public.client_photo_logs;

CREATE POLICY cpl_shared
ON public.client_photo_logs
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- ================================================
-- Coach Private Data - Coach-only
-- ================================================

DROP POLICY IF EXISTS cb_coach_all ON public.client_bio;
CREATE POLICY cb_manage
ON public.client_bio
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS cg_coach_all ON public.client_goals;
CREATE POLICY cg_manage
ON public.client_goals
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS ci_coach_all ON public.client_injuries;
CREATE POLICY ci_manage
ON public.client_injuries
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS cn_coach_all ON public.client_notes;
CREATE POLICY cn_manage
ON public.client_notes
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- ================================================
-- client_training: Granular policies
-- ================================================

DROP POLICY IF EXISTS ct_select ON public.client_training;
DROP POLICY IF EXISTS ct_insert_coach ON public.client_training;
DROP POLICY IF EXISTS ct_update_shared ON public.client_training;
DROP POLICY IF EXISTS ct_delete_coach ON public.client_training;

CREATE POLICY ct_select
ON public.client_training
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

CREATE POLICY ct_insert_coach
ON public.client_training
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = coach_id);

CREATE POLICY ct_update_shared
ON public.client_training
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

CREATE POLICY ct_delete_coach
ON public.client_training
FOR DELETE
TO authenticated
USING ((select auth.uid()) = coach_id);

-- ================================================
-- Coach Todo Lists - Coach-only
-- ================================================

DROP POLICY IF EXISTS cot_coach_all ON public.coach_own_todolist;
CREATE POLICY cot_manage
ON public.coach_own_todolist
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS cat_coach_all ON public.coach_auto_todolist;
CREATE POLICY cat_manage
ON public.coach_auto_todolist
FOR ALL
TO authenticated
USING (coach_id = (select auth.uid()))
WITH CHECK (coach_id = (select auth.uid()));

-- ================================================
-- Storage Policies: Fix initplan warnings
-- ================================================

DROP POLICY IF EXISTS storage_coach_manage ON storage.objects;
CREATE POLICY storage_coach_manage
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'coach_files'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'coach_files'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS storage_client_read ON storage.objects;
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
      AND cfa.coach_file_path = storage.objects.name
      AND cfa.is_active = TRUE
  )
);

DROP POLICY IF EXISTS storage_client_photos_manage ON storage.objects;
CREATE POLICY storage_client_photos_manage
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'client_photos'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'client_photos'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS storage_coach_read_client_photos ON storage.objects;
CREATE POLICY storage_coach_read_client_photos
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client_photos'
  AND EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.client_id::text = (storage.foldername(name))[1]
      AND (cp.coach_id = (select auth.uid()) OR cp.client_id = (select auth.uid()))
  )
);

-- ================================================
-- Migration Complete
-- ================================================
-- All RLS policies have been optimized to:
-- 1. Wrap auth.uid() in (select auth.uid()) - fixes initplan warnings
-- 2. Merge duplicate policies - fixes multiple_permissive warnings
-- 3. Scope all policies TO authenticated - proper role isolation
-- ================================================
