-- ================================================
-- ATHLI Enforce Default Flows
-- ================================================

-- STEP 1: Update handle_new_coach_setup function to seed 4 default flows
CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the new profile is a coach
  IF NEW.user_type = 'coach' THEN
    
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

    -- 4. Create default flows (The 4 fixed flows)
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
    );

    -- Flow 2: Workout Finished
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
    );

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
    );

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
    );
    
    -- 5. Create default Onboarding Flow (kept from previous implementation if needed, but the user request implied updating "like we do for onboarding", 
    -- however "Onboarding" might be a separate concept in "coach_onboarding" table vs "coach_flows". 
    -- Based on user request: "create a new migration ... to add these 4 flows per new user ... like we do for onboarding".
    -- I will KEEP the onboarding setup (Step 5 in old function) as it targets a DIFFERENT table 'coach_onboarding' vs 'coach_flows').
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_onboarding') THEN
      INSERT INTO public.coach_onboarding (coach_id, flow_data, is_active)
      VALUES (
        NEW.id,
        '{
          "edges": [
            {
              "id": "trigger-to-add-trigger",
              "type": "smoothstep",
              "source": "trigger",
              "target": "add-action-trigger"
            },
            {
              "id": "add-trigger-to-end",
              "type": "smoothstep",
              "source": "add-action-trigger",
              "target": "end"
            }
          ],
          "nodes": [
            {
              "id": "trigger",
              "data": {
                "icon": {},
                "label": "Trigger",
                "subtitle": "New client sign up",
                "isOnboarding": true
              },
              "type": "trigger",
              "dagre": {
                "x": 150,
                "y": 32,
                "rank": 0,
                "width": 300,
                "height": 64
              },
              "width": 300,
              "height": 56,
              "position": {
                "x": 0,
                "y": 0
              }
            },
            {
              "id": "add-action-trigger",
              "data": {
                "metadata": {
                  "index": 0
                }
              },
              "type": "addAction",
              "dagre": {
                "x": 150,
                "y": 114,
                "rank": 2,
                "width": 300,
                "height": 40
              },
              "width": 300,
              "height": 40,
              "position": {
                "x": 0,
                "y": 94
              }
            },
            {
              "id": "end",
              "data": {
                "label": "End"
              },
              "type": "end",
              "dagre": {
                "x": 150,
                "y": 184,
                "rank": 4,
                "width": 300,
                "height": 40
              },
              "width": 300,
              "height": 30,
              "position": {
                "x": 0,
                "y": 164
              }
            }
          ]
        }'::jsonb,
        false
      )
      ON CONFLICT (coach_id) DO NOTHING;
    END IF;

  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error seeding coach defaults: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- STEP 2: Recreate Trigger
DROP TRIGGER IF EXISTS on_coach_profile_created ON public.user_profiles;
CREATE TRIGGER on_coach_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_coach_setup();

-- STEP 2: Backfill for existing coaches (Optional, but good practice to ensure consistency if this is run on existing envs)
-- We won't delete existing flows to avoid data loss, but we will ensure these 4 exist if they are not there.
DO $$
DECLARE
    coach RECORD;
BEGIN
    FOR coach IN SELECT id FROM public.user_profiles WHERE user_type = 'coach' LOOP
        -- Flow 1: New Client Sign Up
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'New Client Sign Up',
            'Triggered when a new client accepts your invitation.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "option": {"id":"new-client-signup","name":"New client sign up"}}}], "edges": [] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('New Client Sign Up')
        );

        -- Flow 2: Workout Finished
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'Workout Finished',
            'Triggered when a client completes a workout.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "option": {"id":"workout-finished","name":"Workout finished"}}}], "edges": [] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('Workout Finished')
        );

        -- Flow 3: Check-in Completed
        INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
        SELECT 
            coach.id,
            'Check-in Completed',
            'Triggered when a client completes a check-in.',
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "option": {"id":"check-in-completed","name":"Check in completed"}}}], "edges": [] }'::jsonb,
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
            '{ "nodes": [{"id":"trigger", "type":"trigger", "position": {"x": 400, "y": 50}, "data": {"label":"Trigger", "option": {"id":"missed-workout","name":"Missed workout"}}}], "edges": [] }'::jsonb,
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM public.coach_flows 
            WHERE coach_id = coach.id AND lower(name) = lower('Missed Workout')
        );

    END LOOP;
END $$;
