-- ================================================
-- 142: Add timezone to user_profiles
-- ================================================
-- Stores the user's IANA timezone (e.g. 'America/New_York') on user_profiles.
-- Populated automatically from raw_user_meta_data during signup.
-- Used by the missed-workouts cron to determine when a day has ended.
-- ================================================

-- 1. Add column
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- ============================================================================
-- 2. Update handle_new_user trigger to include timezone
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  v_user_type := NEW.raw_user_meta_data->>'user_type';

  IF v_user_type IS NULL THEN
    RAISE WARNING 'user_type not specified in signup metadata for user %', NEW.id;
    RETURN NEW;
  END IF;

  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  IF v_user_type = 'coach' THEN
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

  INSERT INTO public.user_profiles (
    id,
    user_type,
    email,
    name,
    profile_picture_url,
    signin_method,
    timezone
  ) VALUES (
    NEW.id,
    v_user_type,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    v_profile_picture_url,
    v_signin_method,
    NEW.raw_user_meta_data->>'timezone'
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Update handle_user_update trigger to include timezone
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
  v_timezone TEXT;
BEGIN
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  v_timezone := NEW.raw_user_meta_data->>'timezone';

  v_user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    ''
  );

  -- CASE 1: user_type was just set (was null OR empty, now has value)
  -- This handles Google OAuth signup where user_type is set after user creation
  IF (v_old_user_type IS NULL OR v_old_user_type = '') AND
     (v_user_type IS NOT NULL AND v_user_type != '') THEN

    IF v_user_type NOT IN ('coach', 'client') THEN
      RAISE WARNING 'Invalid user_type: %. Skipping profile creation for user: %', v_user_type, NEW.id;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM public.user_profiles
        WHERE id = NEW.id AND user_type = v_user_type
      ) INTO v_profile_exists;

      IF NOT v_profile_exists THEN
        v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);

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
              NULL;
            WHEN OTHERS THEN
              RAISE WARNING 'Error inserting coach_profiles for user %: %', NEW.id, SQLERRM;
          END;
        END IF;

        BEGIN
          INSERT INTO public.user_profiles (
            id,
            user_type,
            email,
            name,
            profile_picture_url,
            signin_method,
            timezone
          ) VALUES (
            NEW.id,
            v_user_type,
            COALESCE(NEW.email, ''),
            v_user_name,
            v_profile_picture_url,
            v_signin_method,
            v_timezone
          );
        EXCEPTION
          WHEN unique_violation THEN
            NULL;
          WHEN OTHERS THEN
            RAISE WARNING 'Error inserting user_profiles for user %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  -- CASE 2: Update existing user_profiles with any metadata changes
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    timezone = COALESCE(v_timezone, timezone),
    updated_at = NOW()
  WHERE id = NEW.id;

  UPDATE public.coach_profiles
  SET updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Exception in handle_user_update for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Update client_profiles_full view to include timezone
-- ============================================================================
DROP VIEW IF EXISTS public.client_profiles_full;

CREATE OR REPLACE VIEW public.client_profiles_full
WITH (security_invoker = true)
AS SELECT
  cp.client_id,
  up.email,
  COALESCE(up.name, '') AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email') AS signin_method,
  up.timezone,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  cp.created_at,
  cp.updated_at
FROM public.client_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.client_id AND up.user_type = 'client';

GRANT SELECT ON public.client_profiles_full TO authenticated;
