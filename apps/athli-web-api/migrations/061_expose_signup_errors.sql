-- ================================================
-- ATHLI Expose Signup Errors & Fix Permissions
-- ================================================
-- This migration removes the EXCEPTION/swallow blocks from the critical
-- signup triggers so that any underlying errors (permissions, constraints, etc.)
-- are exposed to the caller/logs instead of being ignored.
-- It also ensures sequence permissions are correct.
-- ================================================

-- STEP 1: Grant permissions on SEQUENCES (often missed)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- STEP 2: Update handle_new_coach_setup (Remove Swallowing)
CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create default preferences
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
    true 
  FROM public.available_notification_events
  ON CONFLICT (coach_id, event_id) DO NOTHING;

  -- 4. Create default flows (The 5 fixed flows)
  
  -- Flow 1: New Client Sign Up
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'New Client Sign Up',
      'Triggered when a new client accepts your invitation.',
      '{
        "nodes": [
          { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "New client sign up", "option": { "id": "new-client-signup", "name": "New client sign up" } } },
          { "id": "add-action-trigger", "type": "addAction", "position": { "x": 400, "y": 200 }, "data": { "metadata": { "index": 0 } } },
          { "id": "end", "type": "end", "position": { "x": 400, "y": 300 }, "data": { "label": "End" } }
        ],
        "edges": [
          { "id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep" },
          { "id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep" }
        ]
      }'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 2: Missed Check-in
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Check-in',
      'Triggered when a client misses a scheduled check-in.',
      '{
        "nodes": [
          { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "Missed check in", "option": { "id": "missed-check-in", "name": "Missed check in" } } },
          { "id": "add-action-trigger", "type": "addAction", "position": { "x": 400, "y": 200 }, "data": { "metadata": { "index": 0 } } },
          { "id": "end", "type": "end", "position": { "x": 400, "y": 300 }, "data": { "label": "End" } }
        ],
        "edges": [
          { "id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep" },
          { "id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep" }
        ]
      }'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 3: Check-in Completed
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Check-in Completed',
      'Triggered when a client completes a check-in.',
      '{
        "nodes": [
          { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "Check in completed", "option": { "id": "check-in-completed", "name": "Check in completed" } } },
          { "id": "add-action-trigger", "type": "addAction", "position": { "x": 400, "y": 200 }, "data": { "metadata": { "index": 0 } } },
          { "id": "end", "type": "end", "position": { "x": 400, "y": 300 }, "data": { "label": "End" } }
        ],
        "edges": [
          { "id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep" },
          { "id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep" }
        ]
      }'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 4: Missed Workout
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Workout',
      'Triggered when a client misses a scheduled workout.',
      '{
        "nodes": [
          { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "Missed workout", "option": { "id": "missed-workout", "name": "Missed workout" } } },
          { "id": "add-action-trigger", "type": "addAction", "position": { "x": 400, "y": 200 }, "data": { "metadata": { "index": 0 } } },
          { "id": "end", "type": "end", "position": { "x": 400, "y": 300 }, "data": { "label": "End" } }
        ],
        "edges": [
          { "id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep" },
          { "id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep" }
        ]
      }'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 5: Workout Finished
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Workout Finished',
      'Triggered when a client completes a workout.',
      '{
        "nodes": [
          { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "Workout finished", "option": { "id": "workout-finished", "name": "Workout finished" } } },
          { "id": "add-action-trigger", "type": "addAction", "position": { "x": 400, "y": 200 }, "data": { "metadata": { "index": 0 } } },
          { "id": "end", "type": "end", "position": { "x": 400, "y": 300 }, "data": { "label": "End" } }
        ],
        "edges": [
          { "id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep" },
          { "id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep" }
        ]
      }'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- STEP 3: Update handle_new_user (Remove Swallowing)
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
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'coach');
  
  -- Determine signin method
  BEGIN
    v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  EXCEPTION WHEN OTHERS THEN
    v_signin_method := 'email'; 
  END;
  
  -- Get profile picture
  BEGIN
    v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  EXCEPTION WHEN OTHERS THEN
    v_profile_picture_url := NULL;
  END;
  
  -- Insert into coach_profiles
  IF v_user_type = 'coach' THEN
    INSERT INTO public.coach_profiles (
      id, email, name, profile_picture_url, signin_method, is_active, unique_code
    ) VALUES (
      NEW.id, v_email, v_name, v_profile_picture_url, v_signin_method, true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 8))
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW();
  END IF;

  -- Insert into user_profiles
  INSERT INTO public.user_profiles (
    id, user_type, email, name, profile_picture_url, signin_method
  ) VALUES (
    NEW.id, v_user_type, v_email, v_name, v_profile_picture_url, v_signin_method
  )
  ON CONFLICT (id, user_type) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

  RETURN NEW;
  -- No EXCEPTION block - let errors bubble up
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;
