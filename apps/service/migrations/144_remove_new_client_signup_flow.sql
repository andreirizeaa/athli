-- Migration 144: Remove "New Client Sign Up" from default coach flows
-- This flow is obsolete now that coach_onboardings handles new client sign-up workflows.

-- 1. Re-create handle_new_coach_setup() without the "New Client Sign Up" flow
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

    -- 3.5. Create Getting Started checklist row
    INSERT INTO public.coach_getting_started_checklist (coach_id)
    VALUES (NEW.id)
    ON CONFLICT (coach_id) DO NOTHING;

    -- 4. Create default flows (5 flows — "New Client Sign Up" removed, handled by coach_onboardings)

    -- Flow 1: Workout Finished
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

    -- Flow 2: Check-in Completed
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

    -- Flow 3: Missed Workout
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

    -- Flow 4: Missed Habit Log
    INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
    VALUES (
        NEW.id,
        'Missed Habit Log',
        'Triggered when a client misses logging a habit.',
        '{
          "nodes": [
            { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "Missed habit log", "option": { "id": "missed-habit-log", "name": "Missed habit log" } } },
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

    -- Flow 5: Missed Metric Log
    INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
    VALUES (
        NEW.id,
        'Missed Metric Log',
        'Triggered when a client misses logging a metric.',
        '{
          "nodes": [
            { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "Missed metric log", "option": { "id": "missed-metric-log", "name": "Missed metric log" } } },
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

    -- 5. Create default Onboarding Flow
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

-- 2. Delete existing "New Client Sign Up" rows from coach_flows for all coaches
DELETE FROM public.coach_flows WHERE name = 'New Client Sign Up';
