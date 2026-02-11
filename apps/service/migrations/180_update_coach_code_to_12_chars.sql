-- Update coach code generation to 12 characters using generate_unique_code function
-- Codes go into coach_unique_codes with null onboarding_id and sequence_id
-- Also removes unique_code column from coach_profiles (codes are centralized in coach_unique_codes)

-- STEP 1: Update functions FIRST (before dropping column)

-- Fix handle_new_user to NOT insert unique_code into coach_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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

  -- Create coach_profiles WITHOUT unique_code
  IF v_user_type = 'coach' THEN
    INSERT INTO public.coach_profiles (id, is_active)
    VALUES (NEW.id, true);
  END IF;

  INSERT INTO public.user_profiles (
    id, user_type, email, name, profile_picture_url, signin_method, timezone
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;


-- Fix handle_new_coach_setup to write to coach_unique_codes
CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  max_attempts INT := 10;
  attempt INT := 0;
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  i INT;
BEGIN
  -- Only proceed if the new profile is a coach
  IF NEW.user_type = 'coach' THEN

    -- 1. Create default preferences
    INSERT INTO public.coach_preferences (coach_id, theme, language, units, color_preset)
    VALUES (NEW.id, 'light', 'en', 'metric', 'default')
    ON CONFLICT (coach_id) DO NOTHING;

    -- 2. Generate and insert unique coach code (12 chars, alphanumeric)
    LOOP
      attempt := attempt + 1;

      -- Generate 12-char alphanumeric code inline
      new_code := '';
      FOR i IN 1..12 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
      END LOOP;

      BEGIN
        INSERT INTO public.coach_unique_codes (coach_id, code, onboarding_id, sequence_id)
        VALUES (NEW.id, new_code, NULL, NULL);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF attempt >= max_attempts THEN
          RAISE WARNING 'Could not generate unique code after % attempts for coach %', max_attempts, NEW.id;
          EXIT;
        END IF;
      END;
    END LOOP;

    -- 3. Create default notification preferences
    INSERT INTO public.coach_notification_preferences (coach_id, event_id, enabled)
    SELECT NEW.id, id, true
    FROM public.available_notification_events
    ON CONFLICT (coach_id, event_id) DO NOTHING;

    -- 4. Create Getting Started checklist row
    INSERT INTO public.coach_getting_started_checklist (coach_id)
    VALUES (NEW.id)
    ON CONFLICT (coach_id) DO NOTHING;

    -- 5. Create default flows
    INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
    VALUES
      (NEW.id, 'Workout Finished', 'Triggered when a client completes a workout.',
       '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Workout finished","option":{"id":"workout-finished","name":"Workout finished"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false),
      (NEW.id, 'Missed Workout', 'Triggered when a client misses a scheduled workout.',
       '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed workout","option":{"id":"missed-workout","name":"Missed workout"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false),
      (NEW.id, 'Check-in Completed', 'Triggered when a client completes a check-in.',
       '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Check in completed","option":{"id":"check-in-completed","name":"Check in completed"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false),
      (NEW.id, 'Missed Check-in', 'Triggered when a client misses a scheduled check-in.',
       '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed check in","option":{"id":"missed-check-in","name":"Missed check in"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false),
      (NEW.id, 'New Client Sign Up', 'Triggered when a new client accepts your invitation.',
       '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"New client sign up","option":{"id":"new-client-signup","name":"New client sign up"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false)
    ON CONFLICT DO NOTHING;

  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_coach_setup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;


-- STEP 2: Now drop the unique_code column (after functions are updated)
DROP VIEW IF EXISTS public.coach_profiles_full;

ALTER TABLE public.coach_profiles DROP COLUMN IF EXISTS unique_code;

-- Recreate the view without unique_code
CREATE OR REPLACE VIEW public.coach_profiles_full WITH (security_invoker = true) AS
SELECT
  cp.id,
  up.email,
  COALESCE(up.name, ''::character varying) AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email'::character varying) AS signin_method,
  cp.is_active,
  cp.is_archived,
  cp.status,
  up.timezone,
  cp.created_at,
  cp.updated_at
FROM public.coach_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.id AND up.user_type::text = 'coach'::text;

COMMENT ON VIEW public.coach_profiles_full IS 'Complete coach profile view merging coach_profiles with user_profiles.';
