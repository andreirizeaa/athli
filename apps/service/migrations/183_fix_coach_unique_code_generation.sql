-- Fix handle_new_coach_setup to properly generate unique codes
-- Inlines code generation (doesn't depend on generate_unique_code function)

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
        EXIT; -- Success, exit loop
      EXCEPTION WHEN unique_violation THEN
        IF attempt >= max_attempts THEN
          RAISE WARNING 'Could not generate unique code after % attempts for coach %', max_attempts, NEW.id;
          EXIT;
        END IF;
        -- Continue loop to try again with new code
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
