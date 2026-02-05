-- ================================================
-- ATHLI Fix Update Trigger to Create Profiles When user_type is Set
-- ================================================
-- FIXED to match actual database schema
-- ================================================

-- ================================================
-- STEP 1: Update handle_user_update trigger function
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
BEGIN
  -- DEBUG: Log entry
  RAISE NOTICE '=== handle_user_update TRIGGERED for user: % ===', NEW.id;
  
  -- Get current and previous user_type from metadata
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';

  -- DEBUG: Log values
  RAISE NOTICE 'OLD user_type: [%], NEW user_type: [%]', v_old_user_type, v_user_type;

  -- Get profile picture URL (used for both create and update)
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
    
    RAISE NOTICE 'CASE 1 TRIGGERED: user_type was just set to [%]', v_user_type;
    
    -- Validate user_type
    IF v_user_type NOT IN ('coach', 'client') THEN
      RAISE WARNING 'Invalid user_type: %. Skipping profile creation for user: %', v_user_type, NEW.id;
    ELSE
      -- Check if profile already exists in user_profiles
      SELECT EXISTS(
        SELECT 1 FROM public.user_profiles 
        WHERE id = NEW.id AND user_type = v_user_type
      ) INTO v_profile_exists;

      RAISE NOTICE 'Profile exists check: %', v_profile_exists;

      IF NOT v_profile_exists THEN
        -- Determine signin method
        v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
        RAISE NOTICE 'Signin method: [%]', v_signin_method;

        -- Create profile based on user_type
        IF v_user_type = 'coach' THEN
          -- Insert into coach_profiles (has is_active column)
          RAISE NOTICE 'Attempting to insert into coach_profiles...';
          BEGIN
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
              v_user_name,
              v_profile_picture_url,
              v_signin_method,
              true,
              UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 14))
            );
            RAISE NOTICE 'SUCCESS: Created coach_profiles entry for user: %', NEW.id;
          EXCEPTION
            WHEN unique_violation THEN
              RAISE NOTICE 'coach_profiles already exists for user: %', NEW.id;
            WHEN OTHERS THEN
              RAISE WARNING 'ERROR inserting coach_profiles: %', SQLERRM;
          END;
        END IF;

        -- Insert into user_profiles (NO is_active column in this table)
        RAISE NOTICE 'Attempting to insert into user_profiles...';
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
          RAISE NOTICE 'SUCCESS: Created user_profiles entry for user: % with type: %', NEW.id, v_user_type;
        EXCEPTION
          WHEN unique_violation THEN
            RAISE NOTICE 'user_profiles already exists for user: % with type: %', NEW.id, v_user_type;
          WHEN OTHERS THEN
            RAISE WARNING 'ERROR inserting user_profiles: %', SQLERRM;
        END;
      ELSE
        RAISE NOTICE 'Profile already exists for user: % with type: %, skipping creation', NEW.id, v_user_type;
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'CASE 1 NOT triggered - conditions not met';
  END IF;

  -- CASE 2: Update existing profiles (original behavior)
  -- This syncs email, name, and profile picture changes to existing profiles
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  -- Also update coach_profiles if exists
  UPDATE public.coach_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  RAISE NOTICE '=== handle_user_update COMPLETED for user: % ===', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth update
    RAISE WARNING 'EXCEPTION in handle_user_update for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 2: Recreate the trigger
-- ================================================
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.handle_user_update();

-- ================================================
-- STEP 3: Also fix handle_new_user to match schema
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  -- Get user type from metadata (NO DEFAULT FALLBACK)
  -- This ensures profiles are only created when explicitly requested via web signup
  v_user_type := NEW.raw_user_meta_data->>'user_type';

  -- If user_type is not set, don't create any profile
  -- This prevents auto-creation for mobile sign-ins where user hasn't signed up via web
  IF v_user_type IS NULL OR v_user_type = '' THEN
    RAISE NOTICE 'Skipping profile creation - no user_type in metadata for user: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Validate user_type
  IF v_user_type NOT IN ('coach', 'client') THEN
    RAISE WARNING 'Invalid user_type in metadata: %. Skipping profile creation for user: %', v_user_type, NEW.id;
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
      profile_picture_url,
      signin_method,
      is_active,
      unique_code
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
      v_profile_picture_url,
      v_signin_method,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 14))
    );

    RAISE NOTICE 'Created coach profile for user: %', NEW.id;

  ELSIF v_user_type = 'client' THEN
    -- Client profiles are typically created via API with coach_id
    RAISE NOTICE 'Client user_type detected for user: %. Client profiles should be created via API.', NEW.id;
  END IF;

  -- Also insert into user_profiles (NO is_active column)
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
    RAISE NOTICE 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 4: Fix handle_new_coach_setup function
-- ================================================
-- This function was referencing NEW.user_type, but the trigger now fires
-- on coach_profiles which doesn't have a user_type column.
-- Since this trigger only fires on coach_profiles, we don't need the check.

CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is triggered from coach_profiles INSERT
  -- No need to check user_type - if we're here, it's a coach
  
  -- 1. Create default preferences (theme, language, units, color_preset)
  INSERT INTO public.coach_preferences (coach_id, theme, language, units, color_preset)
  VALUES (NEW.id, 'light', 'en', 'metric', 'default')
  ON CONFLICT (coach_id) DO NOTHING;

  -- 2. Generate and insert unique coach code
  INSERT INTO public.coach_unique_codes (coach_id, code)
  VALUES (
      NEW.id, 
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
  )
  ON CONFLICT (coach_id, code) DO NOTHING;

  -- 3. Create default notification preferences
  INSERT INTO public.coach_notification_preferences (coach_id, event_id, enabled)
  SELECT 
    NEW.id, 
    id, 
    true -- We default all to enabled for new coaches
  FROM public.available_notification_events
  ON CONFLICT DO NOTHING;

  -- 3.5. Create Getting Started checklist row
  INSERT INTO public.coach_getting_started_checklist (coach_id)
  VALUES (NEW.id)
  ON CONFLICT (coach_id) DO NOTHING;

  -- 4. Create default flows (The 5 fixed flows)
  -- Flow 1: New Client Sign Up
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'New Client Sign Up',
      'Triggered when a new client accepts your invitation.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "New client sign up", "option": {"id": "new-client-signup", "name": "New client sign up"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 2: Missed Check-in
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Check-in',
      'Triggered when a client misses a scheduled check-in.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Missed check in", "option": {"id": "missed-check-in", "name": "Missed check in"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 3: Check-in Completed
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Check-in Completed',
      'Triggered when a client completes a check-in.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Check in completed", "option": {"id": "check-in-completed", "name": "Check in completed"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 4: Missed Workout
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Workout',
      'Triggered when a client misses a scheduled workout.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Missed workout", "option": {"id": "missed-workout", "name": "Missed workout"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 5: Workout Finished
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Workout Finished',
      'Triggered when a client completes a workout.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Workout finished", "option": {"id": "workout-finished", "name": "Workout finished"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error seeding coach defaults: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Ensure trigger is on coach_profiles, not user_profiles
DROP TRIGGER IF EXISTS on_coach_profile_created ON public.user_profiles;
DROP TRIGGER IF EXISTS on_coach_profile_created ON public.coach_profiles;

CREATE TRIGGER on_coach_profile_created
  AFTER INSERT ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_coach_setup();

-- ================================================
-- Migration Complete
-- ================================================
