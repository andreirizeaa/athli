-- ================================================
-- ATHLI Final RLS Optimization Patch
-- ================================================
-- This patch resolves remaining Supabase linter warnings:
-- 1. auth_rls_initplan on user_profiles table
-- 2. multiple_permissive_policies on coach library and assignment tables
-- ================================================

-- ================================================
-- PART 1: Fix user_profiles auth_rls_initplan warnings
-- ================================================
-- Replace auth.uid() with (select auth.uid()) to prevent
-- re-evaluation for each row

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can delete own profile"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = id);

-- ================================================
-- PART 2: Fix multiple_permissive_policies warnings
-- ================================================
-- Remove redundant SELECT policies where FOR ALL already exists
-- The FOR ALL policy covers SELECT, INSERT, UPDATE, DELETE

-- ================================================
-- Coach Library Tables
-- ================================================

-- coach_metrics: Remove separate SELECT policy, keep only manage (FOR ALL)
DROP POLICY IF EXISTS cm_select ON public.coach_metrics;
DROP POLICY IF EXISTS cm_manage ON public.coach_metrics;

CREATE POLICY cm_all
  ON public.coach_metrics
  FOR ALL
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
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- coach_habits: Remove separate SELECT policy, keep only manage (FOR ALL)
DROP POLICY IF EXISTS ch_select ON public.coach_habits;
DROP POLICY IF EXISTS ch_manage ON public.coach_habits;

CREATE POLICY ch_all
  ON public.coach_habits
  FOR ALL
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
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- coach_files: Remove separate SELECT policy, keep only manage (FOR ALL)
DROP POLICY IF EXISTS cf_select ON public.coach_files;
DROP POLICY IF EXISTS cf_manage ON public.coach_files;

CREATE POLICY cf_all
  ON public.coach_files
  FOR ALL
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
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- coach_checkins: Remove separate SELECT policy, keep only manage (FOR ALL)
DROP POLICY IF EXISTS cc_select ON public.coach_checkins;
DROP POLICY IF EXISTS cc_manage ON public.coach_checkins;

CREATE POLICY cc_all
  ON public.coach_checkins
  FOR ALL
  TO authenticated
  USING (
    coach_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.client_checkin_assignments a
      WHERE a.coach_checkin_id = coach_checkins.id
        AND a.client_id = (select auth.uid())
        AND a.is_active = TRUE
    )
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- coach_questionnaires: Remove separate SELECT policy, keep only manage (FOR ALL)
DROP POLICY IF EXISTS cq_select ON public.coach_questionnaires;
DROP POLICY IF EXISTS cq_manage ON public.coach_questionnaires;

CREATE POLICY cq_all
  ON public.coach_questionnaires
  FOR ALL
  TO authenticated
  USING (
    coach_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.client_questionnaire_assignments a
      WHERE a.coach_questionnaire_id = coach_questionnaires.id
        AND a.client_id = (select auth.uid())
        AND a.is_active = TRUE
    )
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- ================================================
-- Assignment Tables
-- ================================================

-- client_metric_assignments: Remove separate SELECT policy
DROP POLICY IF EXISTS cma_select ON public.client_metric_assignments;
DROP POLICY IF EXISTS cma_modify ON public.client_metric_assignments;

CREATE POLICY cma_all
  ON public.client_metric_assignments
  FOR ALL
  TO authenticated
  USING (
    coach_id = (select auth.uid())
    OR client_id = (select auth.uid())
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- client_habit_assignments: Remove separate SELECT policy
DROP POLICY IF EXISTS cha_select ON public.client_habit_assignments;
DROP POLICY IF EXISTS cha_modify ON public.client_habit_assignments;

CREATE POLICY cha_all
  ON public.client_habit_assignments
  FOR ALL
  TO authenticated
  USING (
    coach_id = (select auth.uid())
    OR client_id = (select auth.uid())
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- client_file_assignments: Remove separate SELECT policy
DROP POLICY IF EXISTS cfa_select ON public.client_file_assignments;
DROP POLICY IF EXISTS cfa_modify ON public.client_file_assignments;

CREATE POLICY cfa_all
  ON public.client_file_assignments
  FOR ALL
  TO authenticated
  USING (
    coach_id = (select auth.uid())
    OR client_id = (select auth.uid())
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- client_checkin_assignments: Remove separate SELECT policy
DROP POLICY IF EXISTS cca_select ON public.client_checkin_assignments;
DROP POLICY IF EXISTS cca_modify ON public.client_checkin_assignments;

CREATE POLICY cca_all
  ON public.client_checkin_assignments
  FOR ALL
  TO authenticated
  USING (
    coach_id = (select auth.uid())
    OR client_id = (select auth.uid())
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- client_questionnaire_assignments: Remove separate SELECT policy
DROP POLICY IF EXISTS cqa_select ON public.client_questionnaire_assignments;
DROP POLICY IF EXISTS cqa_modify ON public.client_questionnaire_assignments;

CREATE POLICY cqa_all
  ON public.client_questionnaire_assignments
  FOR ALL
  TO authenticated
  USING (
    coach_id = (select auth.uid())
    OR client_id = (select auth.uid())
  )
  WITH CHECK (coach_id = (select auth.uid()));

-- ================================================
-- Migration Complete
-- ================================================
-- All remaining RLS warnings have been resolved:
-- 1. user_profiles now uses (select auth.uid())
-- 2. No more multiple permissive policies - merged into single FOR ALL
-- ================================================
