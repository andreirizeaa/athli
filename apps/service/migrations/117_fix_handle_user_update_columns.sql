-- Migration: Fix handle_user_update function column references
-- Description: The handle_user_update() function was trying to insert/update columns
-- (email, name, profile_picture_url, signin_method) in coach_profiles that don't exist.
-- These columns only exist in user_profiles, not coach_profiles.
--
-- Schema reminder:
--   user_profiles: id, user_type, email, name, profile_picture_url, signin_method, created_at, updated_at
--   coach_profiles: id, is_active, is_archived, status, unique_code, created_at, updated_at, getting_started_checklist_complete
--   client_profiles: client_id, date_of_birth, gender, height_cm, phone, country, unit_system, created_at, updated_at

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
BEGIN
  -- Get current and previous user_type from metadata
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';

  -- Get profile picture URL (used for user_profiles)
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  -- Get user name
  v_user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    ''
  );

  -- CASE 1: user_type was just set (was null OR empty, now has value)
  -- This handles Google OAuth signup where user_type is set after user creation
  IF (v_old_user_type IS NULL OR v_old_user_type = '') AND
     (v_user_type IS NOT NULL AND v_user_type != '') THEN

    -- Validate user_type
    IF v_user_type NOT IN ('coach', 'client') THEN
      RAISE WARNING 'Invalid user_type: %. Skipping profile creation for user: %', v_user_type, NEW.id;
    ELSE
      -- Check if profile already exists in user_profiles
      SELECT EXISTS(
        SELECT 1 FROM public.user_profiles
        WHERE id = NEW.id AND user_type = v_user_type
      ) INTO v_profile_exists;

      IF NOT v_profile_exists THEN
        -- Determine signin method
        v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);

        -- Create coach_profiles entry if user is a coach
        -- coach_profiles only has: id, is_active, is_archived, status, unique_code, created_at, updated_at, getting_started_checklist_complete
        IF v_user_type = 'coach' THEN
          BEGIN
            INSERT INTO public.coach_profiles (
              id,
              is_active,
              unique_code
            ) VALUES (
              NEW.id,
              true,
              UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
            );
          EXCEPTION
            WHEN unique_violation THEN
              NULL; -- Profile already exists, continue
            WHEN OTHERS THEN
              RAISE WARNING 'Error inserting coach_profiles for user %: %', NEW.id, SQLERRM;
          END;
        END IF;

        -- Create user_profiles entry for ALL users (coaches and clients)
        -- user_profiles has: id, user_type, email, name, profile_picture_url, signin_method, created_at, updated_at
        BEGIN
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
        EXCEPTION
          WHEN unique_violation THEN
            NULL; -- Profile already exists, continue
          WHEN OTHERS THEN
            RAISE WARNING 'Error inserting user_profiles for user %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  -- CASE 2: Update existing user_profiles with any metadata changes
  -- Only user_profiles has email, name, profile_picture_url columns
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  -- Update coach_profiles timestamp if it exists
  -- coach_profiles does NOT have email, name, profile_picture_url columns
  UPDATE public.coach_profiles
  SET updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth update
    RAISE WARNING 'Exception in handle_user_update for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_user_update() IS 'Handles auth.users updates by:
1. Creating profiles when user_type is set for the first time (OAuth signup flow)
2. Syncing email, name, and profile picture changes to user_profiles

Schema notes:
- user_profiles stores: email, name, profile_picture_url, signin_method
- coach_profiles only stores: is_active, is_archived, status, unique_code
- client_profiles only stores: date_of_birth, gender, height_cm, phone, country, unit_system';

-- ============================================================================
-- BACKFILL: Create missing profiles for existing users
-- ============================================================================

-- Create missing coach_profiles for coaches
INSERT INTO public.coach_profiles (id, is_active, unique_code)
SELECT
  au.id,
  true,
  UPPER(SUBSTRING(MD5(au.id::text || NOW()::text || random()::text) FOR 14))
FROM auth.users au
WHERE au.raw_user_meta_data->>'user_type' = 'coach'
  AND NOT EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.id = au.id);

-- Create missing user_profiles for all users with user_type set
INSERT INTO public.user_profiles (id, user_type, email, name, profile_picture_url, signin_method)
SELECT
  au.id,
  au.raw_user_meta_data->>'user_type',
  COALESCE(au.email, ''),
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    ''
  ),
  public.get_profile_picture_url(au.raw_user_meta_data),
  public.get_signin_method(au.raw_user_meta_data)
FROM auth.users au
WHERE au.raw_user_meta_data->>'user_type' IS NOT NULL
  AND au.raw_user_meta_data->>'user_type' IN ('coach', 'client')
  AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = au.id);
