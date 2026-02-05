-- ================================================
-- 024: Consolidate coach_client_assignments Policies
-- ================================================

-- This migration resolves the "multiple_permissive_policies" warning for SELECT on coach_client_assignments.
-- It splits the "ALL" policy into specific actions to ensure only one policy per row/action.

DROP POLICY IF EXISTS "cca_manage_all" ON public.coach_client_assignments;
DROP POLICY IF EXISTS "cca_client_select" ON public.coach_client_assignments;

-- 1. Unified SELECT policy (Coach or Client)
CREATE POLICY "cca_select" ON public.coach_client_assignments
  FOR SELECT TO authenticated
  USING ( (SELECT auth.uid()) = coach_id OR (SELECT auth.uid()) = client_id );

-- 2. Coach-only INSERT
CREATE POLICY "cca_insert" ON public.coach_client_assignments
  FOR INSERT TO authenticated
  WITH CHECK ( (SELECT auth.uid()) = coach_id );

-- 3. Coach-only UPDATE
CREATE POLICY "cca_update" ON public.coach_client_assignments
  FOR UPDATE TO authenticated
  USING ( (SELECT auth.uid()) = coach_id )
  WITH CHECK ( (SELECT auth.uid()) = coach_id );

-- 4. Coach-only DELETE
CREATE POLICY "cca_delete" ON public.coach_client_assignments
  FOR DELETE TO authenticated
  USING ( (SELECT auth.uid()) = coach_id );
