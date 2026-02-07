-- ================================================
-- 135: Fix RLS Linter Warnings
-- ================================================
-- This migration fixes:
-- 1. auth_rls_initplan: Use (select auth.uid()) instead of auth.uid()
-- 2. multiple_permissive_policies: Consolidate policies per action
-- 3. function_search_path_mutable: Add search_path to function
--
-- Tables affected:
-- - public.client_questionnaires
-- - public.coach_profiles
--
-- Functions affected:
-- - public.handle_coach_auth_cleanup
-- ================================================

-- ================================================
-- STEP 1: Fix client_questionnaires RLS policies
-- ================================================
-- Problem: Multiple permissive policies + missing (select) wrapper
-- Solution: Drop all and create consolidated policies with proper wrapper

-- Drop existing policies
DROP POLICY IF EXISTS cq_coach_all ON public.client_questionnaires;
DROP POLICY IF EXISTS cq_client_select ON public.client_questionnaires;
DROP POLICY IF EXISTS cq_client_update ON public.client_questionnaires;
DROP POLICY IF EXISTS cq_all ON public.client_questionnaires;

-- Consolidated SELECT policy (coach OR client can read)
CREATE POLICY cq_select ON public.client_questionnaires
  FOR SELECT TO authenticated
  USING (
    coach_id = (SELECT auth.uid())
    OR client_id = (SELECT auth.uid())
  );

-- Consolidated UPDATE policy (coach OR client can update)
CREATE POLICY cq_update ON public.client_questionnaires
  FOR UPDATE TO authenticated
  USING (
    coach_id = (SELECT auth.uid())
    OR client_id = (SELECT auth.uid())
  )
  WITH CHECK (
    coach_id = (SELECT auth.uid())
    OR client_id = (SELECT auth.uid())
  );

-- INSERT policy (only coach can insert)
CREATE POLICY cq_insert ON public.client_questionnaires
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));

-- DELETE policy (only coach can delete)
CREATE POLICY cq_delete ON public.client_questionnaires
  FOR DELETE TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- ================================================
-- STEP 2: Fix coach_profiles duplicate DELETE policy
-- ================================================
-- Problem: Two DELETE policies exist
-- - "Coaches can delete own profile" (from migration 025)
-- - "coach_profiles_delete_own" (from migration 132)
-- Solution: Drop the old one, keep the new standardized name

DROP POLICY IF EXISTS "Coaches can delete own profile" ON public.coach_profiles;

-- ================================================
-- STEP 3: Fix handle_coach_auth_cleanup function search_path
-- ================================================
-- Problem: Function doesn't have search_path set
-- Solution: Recreate function with proper search_path

CREATE OR REPLACE FUNCTION public.handle_coach_auth_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the coach's user_profiles entry
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'coach';

  -- Delete from auth.users (this will cascade to other auth-related tables)
  DELETE FROM auth.users
  WHERE id = OLD.id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - the main profile is already deleted
    RAISE WARNING 'Error cleaning up auth for coach %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION public.handle_coach_auth_cleanup() FROM PUBLIC;

-- ================================================
-- Migration Complete
-- ================================================
-- Fixed linter warnings:
-- 1. client_questionnaires: Consolidated to 4 policies (SELECT, UPDATE, INSERT, DELETE)
--    - All use (SELECT auth.uid()) wrapper for performance
-- 2. coach_profiles: Removed duplicate DELETE policy
-- 3. handle_coach_auth_cleanup: Added search_path = public, auth
-- ================================================
