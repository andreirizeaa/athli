-- ================================================
-- Migration: Remove duplicate name, email, signin_method columns
-- ================================================
-- The name, email, and signin_method columns exist in user_profiles (primary source)
-- and are duplicated in coach_profiles and client_profiles.
-- 
-- This migration:
-- 1. Creates views that merge user_profiles with coach_profiles and client_profiles
-- 2. Updates triggers to only write name/email to user_profiles
-- 3. Removes the duplicate columns from coach_profiles and client_profiles
--
-- The views provide backwards-compatible interfaces so existing queries work
-- ================================================

-- ================================================
-- STEP 1: Create coach_profiles_full view
-- ================================================
-- This view merges coach_profiles with user_profiles to provide a complete coach profile
-- It can be used as a drop-in replacement for coach_profiles queries that need name/email

DROP VIEW IF EXISTS public.coach_profiles_full CASCADE;

CREATE OR REPLACE VIEW public.coach_profiles_full AS
SELECT
  cp.id,
  -- Get name/email from user_profiles (single source of truth)
  COALESCE(up.email, au.email) AS email,
  COALESCE(up.name, au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', '') AS name,
  -- Profile picture from user_profiles (already centralized in migration 107)
  up.profile_picture_url,
  -- Signin method from user_profiles
  COALESCE(up.signin_method, 'email') AS signin_method,
  -- Coach-specific fields remain in coach_profiles
  cp.is_active,
  cp.is_archived,
  cp.status,
  cp.unique_code,
  cp.getting_started_checklist_complete,
  cp.created_at,
  cp.updated_at
FROM public.coach_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.id AND up.user_type = 'coach'
LEFT JOIN auth.users au ON au.id = cp.id;

COMMENT ON VIEW public.coach_profiles_full IS 
'Complete coach profile view merging coach_profiles with user_profiles. 
Use this view to get full coach data including name, email, and profile picture.';

-- Grant permissions
GRANT SELECT ON public.coach_profiles_full TO authenticated;

-- ================================================
-- STEP 2: Create client_profiles_full view
-- ================================================
-- This view merges client_profiles with user_profiles to provide a complete client profile

DROP VIEW IF EXISTS public.client_profiles_full CASCADE;

CREATE OR REPLACE VIEW public.client_profiles_full AS
SELECT
  cp.client_id,
  -- Get name/email from user_profiles (single source of truth)
  COALESCE(up.email, au.email) AS email,
  COALESCE(up.name, au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', '') AS name,
  -- Profile picture from user_profiles
  up.profile_picture_url,
  -- Signin method from user_profiles
  COALESCE(up.signin_method, 'email') AS signin_method,
  -- Client-specific fields remain in client_profiles
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  cp.created_at,
  cp.updated_at
FROM public.client_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.client_id
LEFT JOIN auth.users au ON au.id = cp.client_id;

COMMENT ON VIEW public.client_profiles_full IS 
'Complete client profile view merging client_profiles with user_profiles. 
Use this view to get full client data including name, email, and profile picture.';

-- Grant permissions
GRANT SELECT ON public.client_profiles_full TO authenticated;

-- ================================================
-- STEP 3: Update coach_clients_view to not rely on removed columns
-- ================================================
-- This view was already updated in migration 107 but we ensure it uses user_profiles

DROP VIEW IF EXISTS public.coach_clients_view CASCADE;

CREATE OR REPLACE VIEW public.coach_clients_view AS
SELECT
  cca.coach_id,
  cca.client_id,
  cca.category,
  cca.status,
  cca.is_active,
  cca.is_archived,
  cca.invitation_sent_at,
  cca.connected_at,
  cca.invitation_token,
  cca.created_at,
  cca.updated_at,
  -- Client personal data from client_profiles
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  -- Client identity from user_profiles (single source of truth)
  COALESCE(up.name, au.raw_user_meta_data->>'name', au.email) AS full_name,
  COALESCE(up.email, au.email) AS email,
  -- Avatar from user_profiles
  COALESCE(up.profile_picture_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  -- Training summary
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id
LEFT JOIN auth.users au ON au.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

COMMENT ON VIEW public.coach_clients_view IS 
'Coach view of all their clients with merged profile data from user_profiles.';

GRANT SELECT ON public.coach_clients_view TO authenticated;

-- ================================================
-- STEP 4: Update handle_new_user trigger to not populate removed columns
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  -- Get user type from metadata (NO DEFAULT FALLBACK)
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  
  IF v_user_type IS NULL THEN
    RAISE WARNING 'user_type not specified in signup metadata for user %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Determine signin method
  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  
  -- Get profile picture URL
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  
  -- Insert into appropriate profile table based on user_type
  IF v_user_type = 'coach' THEN
    -- Coach-specific entry (no name/email - those are in user_profiles)
    INSERT INTO public.coach_profiles (
      id,
      is_active,
      unique_code
    ) VALUES (
      NEW.id,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
    );
  END IF;
  
  -- Insert into user_profiles (single source of truth for name/email/profile_picture)
  INSERT INTO public.user_profiles (
    id,
    user_type,
    email,
    name,
    profile_picture_url,
    signin_method
  ) VALUES (
    NEW.id,
    v_user_type,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    v_profile_picture_url,
    v_signin_method
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 5: Update handle_auth_user_update trigger
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
BEGIN
  -- Get user type (current and previous)
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';
  
  IF v_user_type IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get signin method and profile picture URL
  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  
  -- Get user name
  v_user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    ''
  );
  
  -- Handle user type changes (e.g., coach becoming a client)
  IF v_user_type IS DISTINCT FROM v_old_user_type THEN
    IF v_user_type = 'coach' THEN
      SELECT EXISTS(SELECT 1 FROM public.coach_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
        -- Create coach-specific entry (no name/email)
        INSERT INTO public.coach_profiles (
          id,
          is_active,
          unique_code
        ) VALUES (
          NEW.id,
          true,
          UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
        );
      END IF;
    ELSIF v_user_type = 'client' THEN
      SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
        INSERT INTO public.user_profiles (
          id,
          user_type,
          email,
          name,
          profile_picture_url,
          signin_method
        ) VALUES (
          NEW.id,
          v_user_type,
          COALESCE(NEW.email, ''),
          v_user_name,
          v_profile_picture_url,
          v_signin_method
        );
      END IF;
    END IF;
  END IF;
  
  -- Always update user_profiles (single source of truth for name/email/avatar)
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Note: coach_profiles no longer has name/email columns, so no update needed there
  -- Just update the updated_at timestamp
  UPDATE public.coach_profiles
  SET updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_auth_user_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 6: Drop the duplicate columns from coach_profiles
-- ================================================

-- First, let's check if the columns exist before dropping
DO $$
BEGIN
  -- Drop email from coach_profiles if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coach_profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.coach_profiles DROP COLUMN email;
    RAISE NOTICE 'Dropped email column from coach_profiles';
  END IF;

  -- Drop name from coach_profiles if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coach_profiles' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.coach_profiles DROP COLUMN name;
    RAISE NOTICE 'Dropped name column from coach_profiles';
  END IF;

  -- Drop signin_method from coach_profiles if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coach_profiles' 
    AND column_name = 'signin_method'
  ) THEN
    ALTER TABLE public.coach_profiles DROP COLUMN signin_method;
    RAISE NOTICE 'Dropped signin_method column from coach_profiles';
  END IF;

  -- Drop profile_picture_url from coach_profiles if it exists (may already be dropped in 107)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coach_profiles' 
    AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE public.coach_profiles DROP COLUMN profile_picture_url;
    RAISE NOTICE 'Dropped profile_picture_url column from coach_profiles';
  END IF;
END $$;

-- ================================================
-- STEP 7: Drop the duplicate columns from client_profiles
-- ================================================

DO $$
BEGIN
  -- Drop email from client_profiles if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.client_profiles DROP COLUMN email;
    RAISE NOTICE 'Dropped email column from client_profiles';
  END IF;

  -- Drop name from client_profiles if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_profiles' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.client_profiles DROP COLUMN name;
    RAISE NOTICE 'Dropped name column from client_profiles';
  END IF;

  -- Drop signin_method from client_profiles if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_profiles' 
    AND column_name = 'signin_method'
  ) THEN
    ALTER TABLE public.client_profiles DROP COLUMN signin_method;
    RAISE NOTICE 'Dropped signin_method column from client_profiles';
  END IF;

  -- Drop profile_picture_url from client_profiles if it exists (may already be dropped in 107)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_profiles' 
    AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE public.client_profiles DROP COLUMN profile_picture_url;
    RAISE NOTICE 'Dropped profile_picture_url column from client_profiles';
  END IF;
END $$;

-- ================================================
-- STEP 8: Drop indexes that reference removed columns
-- ================================================

DROP INDEX IF EXISTS idx_coach_profiles_email;

-- ================================================
-- Migration Complete
-- ================================================
-- Summary of changes:
-- 1. Created coach_profiles_full view (merges coach_profiles + user_profiles)
-- 2. Created client_profiles_full view (merges client_profiles + user_profiles)
-- 3. Updated coach_clients_view to use user_profiles for name/email
-- 4. Updated handle_new_user trigger to not populate removed columns
-- 5. Updated handle_auth_user_update trigger to only update user_profiles
-- 6. Removed email, name, signin_method, profile_picture_url from coach_profiles
-- 7. Removed email, name, signin_method, profile_picture_url from client_profiles
--
-- Going forward:
-- - All name/email/profile_picture updates should go to user_profiles
-- - Use coach_profiles_full or client_profiles_full views for reading complete profile data
-- - Use coach_profiles or client_profiles tables directly for role-specific fields only
-- ================================================
