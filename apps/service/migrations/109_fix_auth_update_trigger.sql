-- ================================================
-- Migration: Fix handle_auth_user_update trigger
-- ================================================
-- The previous migration had a bug where the trigger would return early
-- if user_type was NULL in the metadata update.
-- 
-- This fix ensures name/email/profile_picture updates are always synced
-- to user_profiles, regardless of whether user_type is in the update.
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
  
  -- Get signin method and profile picture URL
  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  
  -- Get user name from metadata
  v_user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    ''
  );
  
  -- Handle user type changes (e.g., coach becoming a client)
  -- Only do this if user_type is explicitly set
  IF v_user_type IS NOT NULL AND v_user_type IS DISTINCT FROM v_old_user_type THEN
    IF v_user_type = 'coach' THEN
      SELECT EXISTS(SELECT 1 FROM public.coach_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
        -- Create coach-specific entry (no name/email - those are in user_profiles)
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
  
  -- ALWAYS update user_profiles if the record exists
  -- This ensures name/email/avatar changes are synced regardless of user_type in the update
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = CASE 
      WHEN v_user_name IS NOT NULL AND v_user_name != '' THEN v_user_name 
      ELSE name 
    END,
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Update coach_profiles timestamp if it exists
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
-- Migration Complete
-- ================================================
