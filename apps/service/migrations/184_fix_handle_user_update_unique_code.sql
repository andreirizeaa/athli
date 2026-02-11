-- Fix handle_user_update to directly create coach_unique_codes entry
-- Previously relied on trigger chain (on_coach_profile_created -> handle_new_coach_setup)
-- but this fails when INSERT into user_profiles hits unique_violation (silently caught)
-- Now directly inserts into coach_unique_codes after coach_profiles creation

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
  v_timezone TEXT;
  v_new_code TEXT;
  v_code_inserted BOOLEAN;
  v_retry_count INT;
  i INT;
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

        -- Create coach_profiles WITHOUT unique_code
        IF v_user_type = 'coach' THEN
          BEGIN
            INSERT INTO public.coach_profiles (id, is_active)
            VALUES (NEW.id, true);
          EXCEPTION
            WHEN unique_violation THEN
              NULL;
            WHEN OTHERS THEN
              RAISE WARNING 'Error inserting coach_profiles for user %: %', NEW.id, SQLERRM;
          END;

          -- Directly create coach_unique_codes entry (don't rely on trigger chain)
          -- Check if code already exists for this coach
          IF NOT EXISTS (SELECT 1 FROM public.coach_unique_codes WHERE coach_id = NEW.id) THEN
            v_code_inserted := FALSE;
            v_retry_count := 0;

            WHILE NOT v_code_inserted AND v_retry_count < 10 LOOP
              -- Generate 12-char alphanumeric code
              v_new_code := '';
              FOR i IN 1..12 LOOP
                v_new_code := v_new_code || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 36 + 1)::INT, 1);
              END LOOP;

              BEGIN
                INSERT INTO public.coach_unique_codes (coach_id, code, onboarding_id, sequence_id)
                VALUES (NEW.id, v_new_code, NULL, NULL);
                v_code_inserted := TRUE;
              EXCEPTION
                WHEN unique_violation THEN
                  v_retry_count := v_retry_count + 1;
              END;
            END LOOP;

            IF NOT v_code_inserted THEN
              RAISE WARNING 'Failed to generate unique code for coach % after 10 retries', NEW.id;
            END IF;
          END IF;
        END IF;

        BEGIN
          INSERT INTO public.user_profiles (
            id, user_type, email, name, profile_picture_url, signin_method, timezone
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;
