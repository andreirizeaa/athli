-- ================================================
-- Add Missed Notification Types
-- ================================================
-- Adds metric_missed, habit_missed, and checkin_missed notification
-- preferences for existing coaches, and updates handle_new_coach_setup()
-- so future coaches get them on signup.

-- 1. Backfill: add 3 new preference rows for all existing coaches
INSERT INTO public.coach_notification_preferences (coach_id, notification_type, in_app_enabled, push_enabled)
SELECT cp.coach_id, nt.type, true, true
FROM (SELECT DISTINCT coach_id FROM public.coach_notification_preferences) cp
CROSS JOIN (VALUES ('metric_missed'), ('habit_missed'), ('checkin_missed')) AS nt(type)
ON CONFLICT (coach_id, notification_type) DO NOTHING;

-- 2. Update handle_new_coach_setup() to include the 3 new types
CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_code TEXT;
  v_code_inserted BOOLEAN;
  v_retry_count INT;
  i INT;
BEGIN
  -- Only proceed if the new profile is a coach
  IF NEW.user_type != 'coach' THEN
    RETURN NEW;
  END IF;

  -- Verify coach_profiles exists (required for FK constraints)
  IF NOT EXISTS (SELECT 1 FROM public.coach_profiles WHERE id = NEW.id) THEN
    RAISE WARNING 'coach_profiles not found for user %, skipping coach setup', NEW.id;
    RETURN NEW;
  END IF;

  -- 1. Create trial entitlements (Max plan + automations + AI assistant for 30 days)
  INSERT INTO public.coach_entitlements (
    coach_id,
    plan_type,
    client_limit,
    has_ai_workout_builder,
    has_custom_exercises,
    has_questionnaires,
    has_habits_metrics,
    storage_limit_gb,
    has_broadcast_messaging,
    has_ai_todo_list,
    has_priority_support,
    has_automations,
    has_ai_assistant,
    has_payments,
    subscription_status,
    is_trial,
    trial_ends_at
  ) VALUES (
    NEW.id,
    'max',
    50,
    true,
    true,
    true,
    true,
    -1,
    true,
    true,
    true,
    true,
    true,
    false,
    'trialing',
    true,
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (coach_id) DO NOTHING;

  -- 2. Create default preferences
  INSERT INTO public.coach_preferences (coach_id, theme, language, color_preset, client_terminology)
  VALUES (NEW.id, 'light', 'en', 'default', 'athlete')
  ON CONFLICT (coach_id) DO NOTHING;

  -- 3. Generate and insert unique 12-digit coach code
  IF NOT EXISTS (SELECT 1 FROM public.coach_unique_codes WHERE coach_id = NEW.id AND onboarding_id IS NULL) THEN
    v_code_inserted := FALSE;
    v_retry_count := 0;

    WHILE NOT v_code_inserted AND v_retry_count < 10 LOOP
      -- Generate 12-char alphanumeric code
      v_new_code := '';
      FOR i IN 1..12 LOOP
        v_new_code := v_new_code || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 36 + 1)::INT, 1);
      END LOOP;

      BEGIN
        INSERT INTO public.coach_unique_codes (coach_id, code, onboarding_id)
        VALUES (NEW.id, v_new_code, NULL);
        v_code_inserted := TRUE;
      EXCEPTION
        WHEN unique_violation THEN
          v_retry_count := v_retry_count + 1;
      END;
    END LOOP;
  END IF;

  -- 4. Create default notification preferences (17 types)
  INSERT INTO public.coach_notification_preferences (coach_id, notification_type, in_app_enabled, push_enabled)
  VALUES
    (NEW.id, 'workout_completed', true, true),
    (NEW.id, 'workout_missed', true, true),
    (NEW.id, 'checkin_completed', true, true),
    (NEW.id, 'checkin_missed', true, true),
    (NEW.id, 'questionnaire_completed', true, true),
    (NEW.id, 'metric_logged', true, true),
    (NEW.id, 'metric_missed', true, true),
    (NEW.id, 'habit_logged', true, true),
    (NEW.id, 'habit_missed', true, true),
    (NEW.id, 'photo_uploaded', true, true),
    (NEW.id, 'client_connected', true, true),
    (NEW.id, 'goal_added', true, true),
    (NEW.id, 'goal_edited', true, true),
    (NEW.id, 'goal_deleted', true, true),
    (NEW.id, 'injury_added', true, true),
    (NEW.id, 'injury_edited', true, true),
    (NEW.id, 'injury_deleted', true, true)
  ON CONFLICT (coach_id, notification_type) DO NOTHING;

  -- 5. Create Getting Started checklist
  INSERT INTO public.coach_getting_started_checklist (coach_id)
  VALUES (NEW.id)
  ON CONFLICT (coach_id) DO NOTHING;

  -- 6. Create default flows (6 flows)
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Workout Finished', 'Triggered when a client completes a workout.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Workout finished","option":{"id":"workout-finished","name":"Workout finished"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Check-in Completed', 'Triggered when a client completes a check-in.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Check in completed","option":{"id":"check-in-completed","name":"Check in completed"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Check-in', 'Triggered when a client misses a scheduled check-in.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed check in","option":{"id":"missed-check-in","name":"Missed check in"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Workout', 'Triggered when a client misses a scheduled workout.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed workout","option":{"id":"missed-workout","name":"Missed workout"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Habit Log', 'Triggered when a client misses logging a habit.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed habit log","option":{"id":"missed-habit-log","name":"Missed habit log"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Metric Log', 'Triggered when a client misses logging a metric.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed metric log","option":{"id":"missed-metric-log","name":"Missed metric log"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN foreign_key_violation THEN
    RAISE WARNING 'FK violation in coach setup for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error in coach setup for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
