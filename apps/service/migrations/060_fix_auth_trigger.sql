-- ================================================
-- ATHLI Fix Auth Trigger
-- ================================================
-- This migration robustly re-defines the handle_new_user function
-- and ensures the auth trigger is correctly attached.
-- The goal is to ensure coach_profiles and user_profiles are populated
-- when a new user signs up via Supabase Auth.
-- ================================================

-- STEP 1: Redefine handle_new_user with explicit constraints and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_email VARCHAR(255);
  v_name VARCHAR(200);
BEGIN
  -- Extract basic info with fallbacks
  v_email := COALESCE(NEW.email, '');
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User');
  
  -- Determine user type (default to coach if not specified)
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'coach');
  
  -- Determine signin method (using helper function if available, else default)
  BEGIN
    v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  EXCEPTION WHEN OTHERS THEN
    v_signin_method := 'email'; -- Fallback if helper missing
  END;
  
  -- Get profile picture (using helper function if available, else null)
  BEGIN
    v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  EXCEPTION WHEN OTHERS THEN
    v_profile_picture_url := NULL; -- Fallback
  END;
  
  -- Insert into proper profile tables
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
      v_email,
      v_name,
      v_profile_picture_url,
      v_signin_method,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 8))
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW();
  END IF;

  -- Always insert into user_profiles for legacy compatibility
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
    v_email,
    v_name,
    v_profile_picture_url,
    v_signin_method,
    true
  )
  ON CONFLICT (id, user_type) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error widely so it can be seen in Supabase logs
    RAISE WARNING 'CRITICAL ERROR: handle_new_user failed for user %: %', NEW.id, SQLERRM;
    -- We do NOT return null, as that would cancel the auth insert. 
    -- We return NEW so the user can at least sign in, even if profile creation failed.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- STEP 2: Force Recreate the Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Grant permissions again to be safe
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
