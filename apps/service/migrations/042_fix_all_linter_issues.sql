-- Migration 042: Fix database linter issues
-- 1. Fix auth_users_exposed & security_definer_view in coach_clients_view
-- 2. Fix function_search_path_mutable in protect_client_profile_fields
-- 3. Fix auth_rls_initplan in RLS policies (use select auth.uid())
-- 4. Fix multiple_permissive_policies (drop duplicate/legacy policies)

-- STEP 1: Fix coach_clients_view
DROP VIEW IF EXISTS public.coach_clients_view CASCADE;

CREATE VIEW public.coach_clients_view 
WITH (security_invoker = true) AS
SELECT
  cca.coach_id,
  cca.client_id,
  cca.category,
  cca.status,
  cca.is_active,
  cca.is_archived,
  cca.invitation_sent_at,
  cca.connected_at,
  cca.created_at,
  cca.updated_at,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.city,
  cp.unit_system,
  COALESCE(cp.name, up.name) AS full_name,
  COALESCE(cp.email, up.email) AS email,
  COALESCE(cp.profile_picture_url, up.profile_picture_url) AS avatar_url,
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

-- Revoke anon access to prevent exposure (explicitly safe)
REVOKE ALL ON public.coach_clients_view FROM anon;
GRANT SELECT ON public.coach_clients_view TO authenticated;

-- STEP 2: Fix protect_client_profile_fields search_path
CREATE OR REPLACE FUNCTION public.protect_client_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Clients cannot change profile creation date.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- STEP 3 & 4: Fix RLS Policies (InitPlan & Permissive)

-- Client Metrics
DROP POLICY IF EXISTS cm_all ON public.client_metrics;
DROP POLICY IF EXISTS cma_all ON public.client_metrics; -- Drop duplicate
CREATE POLICY cm_all ON public.client_metrics
    FOR ALL TO authenticated
    USING (client_id = (select auth.uid()) OR coach_id = (select auth.uid()))
    WITH CHECK (client_id = (select auth.uid()) OR coach_id = (select auth.uid()));

-- Client Habits
DROP POLICY IF EXISTS ch_all ON public.client_habits;
DROP POLICY IF EXISTS cha_all ON public.client_habits; -- Drop duplicate
CREATE POLICY ch_all ON public.client_habits
    FOR ALL TO authenticated
    USING (client_id = (select auth.uid()) OR coach_id = (select auth.uid()))
    WITH CHECK (client_id = (select auth.uid()) OR coach_id = (select auth.uid()));

-- Client Files
DROP POLICY IF EXISTS cf_all ON public.client_files;
DROP POLICY IF EXISTS cfa_all ON public.client_files; -- Drop duplicate
CREATE POLICY cf_all ON public.client_files
    FOR ALL TO authenticated
    USING (client_id = (select auth.uid()) OR coach_id = (select auth.uid()))
    WITH CHECK (client_id = (select auth.uid()) OR coach_id = (select auth.uid()));

-- Client Checkins
DROP POLICY IF EXISTS cc_all ON public.client_checkins;
DROP POLICY IF EXISTS cca_all ON public.client_checkins; -- Drop duplicate
CREATE POLICY cc_all ON public.client_checkins
    FOR ALL TO authenticated
    USING (client_id = (select auth.uid()) OR coach_id = (select auth.uid()))
    WITH CHECK (client_id = (select auth.uid()) OR coach_id = (select auth.uid()));

-- Client Questionnaires
DROP POLICY IF EXISTS cq_all ON public.client_questionnaires;
DROP POLICY IF EXISTS cqa_all ON public.client_questionnaires; -- Drop duplicate
CREATE POLICY cq_all ON public.client_questionnaires
    FOR ALL TO authenticated
    USING (client_id = (select auth.uid()) OR coach_id = (select auth.uid()))
    WITH CHECK (client_id = (select auth.uid()) OR coach_id = (select auth.uid()));

-- Coach Metrics
DROP POLICY IF EXISTS cm_all ON public.coach_metrics;
CREATE POLICY cm_all ON public.coach_metrics
    FOR ALL TO authenticated
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));

-- Coach Habits
DROP POLICY IF EXISTS ch_all ON public.coach_habits;
CREATE POLICY ch_all ON public.coach_habits
    FOR ALL TO authenticated
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));

-- Coach Files
DROP POLICY IF EXISTS cf_all ON public.coach_files;
CREATE POLICY cf_all ON public.coach_files
    FOR ALL TO authenticated
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));

-- Coach Checkins
DROP POLICY IF EXISTS cc_all ON public.coach_checkins;
CREATE POLICY cc_all ON public.coach_checkins
    FOR ALL TO authenticated
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));

-- Coach Questionnaires
DROP POLICY IF EXISTS cq_all ON public.coach_questionnaires;
CREATE POLICY cq_all ON public.coach_questionnaires
    FOR ALL TO authenticated
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));
