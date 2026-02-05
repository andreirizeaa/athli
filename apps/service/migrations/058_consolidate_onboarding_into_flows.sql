-- ================================================
-- ATHLI Consolidate Onboarding Into Flows
-- ================================================
-- This migration consolidates the separate coach_onboarding table
-- into the main coach_flows table, making onboarding just another flow.
-- ================================================

-- STEP 1: Update handle_new_coach_setup function to create all 5 default flows
-- and fix the trigger to fire on coach_profiles instead of user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is a new coach profile
  -- (This function is now triggered from coach_profiles, not user_profiles)
  
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
  ON CONFLICT (coach_id, event_id) DO NOTHING;

  -- 4. Create default flows (The 5 fixed flows)
  -- We assume coach_flows table exists (created in migration 007)

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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error seeding coach defaults: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- STEP 2: Recreate Trigger on coach_profiles instead of user_profiles
DROP TRIGGER IF EXISTS on_coach_profile_created ON public.user_profiles;
DROP TRIGGER IF EXISTS on_coach_profile_created ON public.coach_profiles;

CREATE TRIGGER on_coach_profile_created
  AFTER INSERT ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_coach_setup();

-- STEP 3: Backfill for existing coaches (ensure all 5 flows exist)
DO $$
DECLARE
    coach RECORD;
BEGIN
    FOR coach IN SELECT id FROM public.coach_profiles LOOP
        -- Flow 1: New Client Sign Up
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'New Client Sign Up',
            'Triggered when a new client accepts your invitation.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "subtitle":"New client sign up", "option": {"id":"new-client-signup","name":"New client sign up"}}}, {"id":"add-action-trigger", "type":"addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id":"end", "type":"end", "position": {"x": 400, "y": 300}, "data": {"label":"End"}}], "edges": [{"id":"trigger-to-add", "source":"trigger", "target":"add-action-trigger", "type":"smoothstep"}, {"id":"add-to-end", "source":"add-action-trigger", "target":"end", "type":"smoothstep"}] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('New Client Sign Up')
        );

        -- Flow 2: Missed Check-in
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'Missed Check-in',
            'Triggered when a client misses a scheduled check-in.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "subtitle":"Missed check in", "option": {"id":"missed-check-in","name":"Missed check in"}}}, {"id":"add-action-trigger", "type":"addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id":"end", "type":"end", "position": {"x": 400, "y": 300}, "data": {"label":"End"}}], "edges": [{"id":"trigger-to-add", "source":"trigger", "target":"add-action-trigger", "type":"smoothstep"}, {"id":"add-to-end", "source":"add-action-trigger", "target":"end", "type":"smoothstep"}] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('Missed Check-in')
        );

        -- Flow 3: Check-in Completed
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'Check-in Completed',
            'Triggered when a client completes a check-in.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "subtitle":"Check in completed", "option": {"id":"check-in-completed","name":"Check in completed"}}}, {"id":"add-action-trigger", "type":"addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id":"end", "type":"end", "position": {"x": 400, "y": 300}, "data": {"label":"End"}}], "edges": [{"id":"trigger-to-add", "source":"trigger", "target":"add-action-trigger", "type":"smoothstep"}, {"id":"add-to-end", "source":"add-action-trigger", "target":"end", "type":"smoothstep"}] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('Check-in Completed')
        );

        -- Flow 4: Missed Workout
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'Missed Workout',
            'Triggered when a client misses a scheduled workout.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "subtitle":"Missed workout", "option": {"id":"missed-workout","name":"Missed workout"}}}, {"id":"add-action-trigger", "type":"addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id":"end", "type":"end", "position": {"x": 400, "y": 300}, "data": {"label":"End"}}], "edges": [{"id":"trigger-to-add", "source":"trigger", "target":"add-action-trigger", "type":"smoothstep"}, {"id":"add-to-end", "source":"add-action-trigger", "target":"end", "type":"smoothstep"}] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('Missed Workout')
        );

        -- Flow 5: Workout Finished
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'Workout Finished',
            'Triggered when a client completes a workout.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "subtitle":"Workout finished", "option": {"id":"workout-finished","name":"Workout finished"}}}, {"id":"add-action-trigger", "type":"addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id":"end", "type":"end", "position": {"x": 400, "y": 300}, "data": {"label":"End"}}], "edges": [{"id":"trigger-to-add", "source":"trigger", "target":"add-action-trigger", "type":"smoothstep"}, {"id":"add-to-end", "source":"add-action-trigger", "target":"end", "type":"smoothstep"}] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('Workout Finished')
        );

    END LOOP;
END $$;
