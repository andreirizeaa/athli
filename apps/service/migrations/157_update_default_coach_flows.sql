-- Migration 157: Update default coach flows
-- Only 5 triggers: Missed Metric Log, Missed Habit Log, Missed Check-in, Missed Workout, Inactive for 7 Days
-- Removes: Workout Finished, Check-in Completed

-- 1. Re-create handle_new_coach_setup() with updated default flows
CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the new profile is a coach
  IF NEW.user_type = 'coach' THEN

    -- 1. Create default preferences (theme, language, units, color_preset)
    INSERT INTO public.coach_preferences (coach_id, theme, language, units, color_preset)
    VALUES (NEW.id, 'light', 'en', 'metric', 'default')
    ON CONFLICT (coach_id) DO NOTHING;

    -- 2. Create default coach company information
    INSERT INTO public.coach_company_information (coach_id, company_name)
    VALUES (NEW.id, 'My Company')
    ON CONFLICT (coach_id) DO NOTHING;

    -- 3. Generate and insert unique coach code
    INSERT INTO public.coach_unique_codes (coach_id, code)
    VALUES (
        NEW.id,
        upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
    )
    ON CONFLICT (coach_id, code) DO NOTHING;

    -- 4. Seed default notification preferences (all enabled by default)
    INSERT INTO public.coach_notification_preferences (coach_id, notification_type, in_app_enabled, push_enabled)
    VALUES
      (NEW.id, 'workout_completed', true, true),
      (NEW.id, 'workout_missed', true, true),
      (NEW.id, 'checkin_completed', true, true),
      (NEW.id, 'questionnaire_completed', true, true),
      (NEW.id, 'metric_logged', true, true),
      (NEW.id, 'habit_logged', true, true),
      (NEW.id, 'photo_uploaded', true, true),
      (NEW.id, 'client_connected', true, true),
      (NEW.id, 'goal_added', true, true),
      (NEW.id, 'goal_edited', true, true),
      (NEW.id, 'goal_deleted', true, true),
      (NEW.id, 'injury_added', true, true),
      (NEW.id, 'injury_edited', true, true),
      (NEW.id, 'injury_deleted', true, true)
    ON CONFLICT (coach_id, notification_type) DO NOTHING;

    -- 5. Create default flows (5 flows)

    -- Flow 1: Missed Workout
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
    );

    -- Flow 3: Missed Habit Log
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

    -- Flow 4: Missed Metric Log
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

    -- Flow 5: Inactive for 7 Days
    INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
    VALUES (
        NEW.id,
        'Inactive for 7 Days',
        'Triggered when a client has been inactive for 7 days.',
        '{
          "nodes": [
            { "id": "trigger", "type": "trigger", "position": { "x": 400, "y": 50 }, "data": { "label": "Trigger", "subtitle": "Inactive for 7 days", "option": { "id": "inactive-7-days", "name": "Inactive for 7 days" } } },
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

    -- 6. Create default Onboarding Flow
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

-- 2. Recreate trigger
DROP TRIGGER IF EXISTS on_coach_profile_created ON public.user_profiles;
CREATE TRIGGER on_coach_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_coach_setup();
