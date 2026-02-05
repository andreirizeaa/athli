-- ================================================
-- 028: Security Linter Fixes
-- ================================================
-- This migration fixes security warnings from Supabase linter:
-- 1. auth_users_exposed - coach_clients_view exposes auth.users
-- 2. security_definer_view - coach_clients_view uses SECURITY DEFINER
-- 3. function_search_path_mutable - handle_client_auth_cleanup, handle_new_user
-- 4. multiple_permissive_policies - client_profiles DELETE policies
-- ================================================

-- ================================================
-- STEP 1: Fix coach_clients_view (auth_users_exposed, security_definer_view)
-- ================================================
-- The view currently joins auth.users which exposes sensitive data.
-- We'll rewrite it to only use public tables (client_profiles, user_profiles)
-- and ensure it uses SECURITY INVOKER (default) instead of SECURITY DEFINER.

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
  -- Client personal data from client_profiles
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.city,
  cp.unit_system,
  -- Client identity from client_profiles or user_profiles (NO auth.users)
  COALESCE(cp.name, up.name) AS full_name,
  COALESCE(cp.email, up.email) AS email,
  COALESCE(cp.profile_picture_url, up.profile_picture_url) AS avatar_url,
  -- Training summary
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

-- Revoke anon access to prevent exposure
REVOKE ALL ON public.coach_clients_view FROM anon;
GRANT SELECT ON public.coach_clients_view TO authenticated;

-- ================================================
-- STEP 2: Fix function_search_path_mutable for handle_client_auth_cleanup
-- ================================================
-- Add SET search_path to the function definition

CREATE OR REPLACE FUNCTION public.handle_client_auth_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from user_profiles (if exists)
  DELETE FROM public.user_profiles 
  WHERE id = OLD.client_id;

  -- Delete from auth.users (this will cascade to other auth-related tables)
  DELETE FROM auth.users 
  WHERE id = OLD.client_id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - the main profile is already deleted
    RAISE WARNING 'Error cleaning up auth for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.handle_client_auth_cleanup() FROM PUBLIC;

-- ================================================
-- STEP 3: Fix function_search_path_mutable for handle_new_user
-- ================================================
-- Add SET search_path to the function definition

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  -- Determine user type from metadata
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'coach');
  
  -- Determine signin method
  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  
  -- Get profile picture URL
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  
  -- Insert into appropriate profile table based on user_type
  IF v_user_type = 'coach' THEN
    INSERT INTO public.coach_profiles (
      id,
      email,
      name,
      profile_picture_url,
      signin_method,
      is_active,
      unique_code
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      v_profile_picture_url,
      v_signin_method,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 8))
    );
  ELSIF v_user_type = 'client' THEN
    -- Client profiles are created via API, not trigger
    -- This handles edge cases where a client might sign up directly
    -- The coach_id would need to be set separately
    NULL;
  END IF;
  
  -- Also insert into legacy user_profiles for backward compatibility
  INSERT INTO public.user_profiles (
    id,
    user_type,
    email,
    name,
    profile_picture_url,
    signin_method,
    is_active
  ) VALUES (
    NEW.id,
    v_user_type,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    v_profile_picture_url,
    v_signin_method,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- ================================================
-- STEP 4: Consolidate client_profiles DELETE policies
-- ================================================
-- Merge cp_client_delete and cp_coach_delete into a single policy

DROP POLICY IF EXISTS "cp_client_delete" ON public.client_profiles;
DROP POLICY IF EXISTS "cp_coach_delete" ON public.client_profiles;

-- Create a single consolidated DELETE policy
-- Allows deletion if:
-- 1. The authenticated user is the client themselves, OR
-- 2. The authenticated user is the coach assigned to this client
CREATE POLICY "cp_delete" ON public.client_profiles
  FOR DELETE TO authenticated
  USING (
    -- Client can delete their own profile
    (SELECT auth.uid()) = client_id
    OR
    -- Coach can delete their client's profile
    EXISTS (
      SELECT 1 FROM public.coach_client_assignments cca 
      WHERE cca.client_id = client_profiles.client_id 
        AND cca.coach_id = (SELECT auth.uid())
    )
  );

-- ================================================
-- Migration Complete
-- ================================================
