-- ================================================
-- Migration: Remove duplicate profile_picture_url columns
-- ================================================
-- The profile_picture_url column exists in user_profiles (primary source)
-- and was duplicated in coach_profiles and client_profiles.
-- 
-- Since user_profiles is the single source of truth for profile pictures
-- (including OAuth avatars from Google/Apple), we can remove the duplicate
-- columns from coach_profiles and client_profiles.
--
-- Views and triggers are updated to use user_profiles.profile_picture_url
-- ================================================

-- ================================================
-- STEP 1: Update coach_clients_view to use only user_profiles
-- ================================================
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
  cca.created_at,
  cca.updated_at,
  -- Client personal data from client_profiles
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  -- Client identity from user_profiles or auth.users (fallback)
  COALESCE(up.name, au.raw_user_meta_data->>'name', au.email) AS full_name,
  COALESCE(up.email, au.email) AS email,
  -- Use user_profiles as single source of truth for avatar
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

-- ================================================
-- STEP 2: Update athletes_grid_view (already uses user_profiles)
-- ================================================
-- No changes needed - athletes_grid_view already references up.profile_picture_url

-- ================================================
-- STEP 3: Drop the duplicate columns
-- ================================================

-- Remove profile_picture_url from client_profiles
ALTER TABLE public.client_profiles 
DROP COLUMN IF EXISTS profile_picture_url;

-- Remove profile_picture_url from coach_profiles
ALTER TABLE public.coach_profiles 
DROP COLUMN IF EXISTS profile_picture_url;

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
    INSERT INTO public.coach_profiles (
      id,
      email,
      name,
      signin_method,
      is_active,
      unique_code
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
      v_signin_method,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
    );
  END IF;
  
  -- Insert into user_profiles (single source of truth for profile picture)
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
  
  -- Get signin method and profile picture URL (used for both create and update)
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
    -- Check if profile exists for new type
    IF v_user_type = 'coach' THEN
      SELECT EXISTS(SELECT 1 FROM public.coach_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
        INSERT INTO public.coach_profiles (
          id,
          email,
          name,
          signin_method,
          is_active,
          unique_code
        ) VALUES (
          NEW.id,
          COALESCE(NEW.email, ''),
          v_user_name,
          v_signin_method,
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
  
  -- Always update existing profiles with latest info
  -- Update user_profiles (single source of truth for profile picture)
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Update coach_profiles (without profile_picture_url)
  UPDATE public.coach_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_auth_user_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Migration Complete
-- ================================================
-- Profile pictures are now stored only in user_profiles
-- coach_profiles and client_profiles no longer have duplicate columns
-- ================================================
