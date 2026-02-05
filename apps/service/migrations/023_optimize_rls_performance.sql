-- ================================================
-- 023: Database Performance Optimization (RLS & Policies)
-- ================================================

-- This migration addresses "auth_rls_initplan" and "multiple_permissive_policies" linter warnings.
-- 1. Wraps auth.uid() in (SELECT auth.uid()) for direct sub-plan initialization.
-- 2. Consolidates multiple policies for the same action/role into single policies.

-- 1. coach_unique_codes
DROP POLICY IF EXISTS "Coaches can view own unique code" ON public.coach_unique_codes;
CREATE POLICY "Coaches can view own unique code"
  ON public.coach_unique_codes 
  FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- 2. coach_client_assignments
-- Linter: {client_read_assignments, coach_manage_assignments} for SELECT
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.coach_client_assignments;
DROP POLICY IF EXISTS "client_read_assignments" ON public.coach_client_assignments;

CREATE POLICY "cca_manage_all" ON public.coach_client_assignments
  FOR ALL TO authenticated
  USING ( (SELECT auth.uid()) = coach_id )
  WITH CHECK ( (SELECT auth.uid()) = coach_id );

CREATE POLICY "cca_client_select" ON public.coach_client_assignments
  FOR SELECT TO authenticated
  USING ( (SELECT auth.uid()) = client_id );

-- 3. client_profiles
-- Linter: {cp_client_read, cp_coach_all} for SELECT
-- Linter: {cp_client_update, cp_coach_all} for UPDATE
DROP POLICY IF EXISTS "cp_coach_all" ON public.client_profiles;
DROP POLICY IF EXISTS "cp_client_read" ON public.client_profiles;
DROP POLICY IF EXISTS "cp_client_update" ON public.client_profiles;

CREATE POLICY "cp_select" ON public.client_profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = client_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.coach_client_assignments cca 
      WHERE cca.client_id = client_profiles.client_id 
      AND cca.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "cp_update" ON public.client_profiles
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = client_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.coach_client_assignments cca 
      WHERE cca.client_id = client_profiles.client_id 
      AND cca.coach_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = client_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.coach_client_assignments cca 
      WHERE cca.client_id = client_profiles.client_id 
      AND cca.coach_id = (SELECT auth.uid())
    )
  );

-- Keep coach delete capability if needed (from old cp_coach_all)
CREATE POLICY "cp_coach_delete" ON public.client_profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_client_assignments cca 
      WHERE cca.client_id = client_profiles.client_id 
      AND cca.coach_id = (SELECT auth.uid())
    )
  );
