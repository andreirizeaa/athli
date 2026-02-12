-- Fix handle_new_coach_setup() to use correct notification_preferences schema
-- Migration 188 accidentally used old column names (event_id, enabled) instead of
-- the current schema (notification_type, in_app_enabled, push_enabled) from migration 150.
-- This caused the function to error at step 3 and skip steps 4-6 (including flows).

CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- 1. Create default preferences
  INSERT INTO public.coach_preferences (coach_id, theme, language, units, color_preset)
  VALUES (NEW.id, 'light', 'en', 'metric', 'default')
  ON CONFLICT (coach_id) DO NOTHING;

  -- 2. Generate and insert unique coach code (if not already present)
  INSERT INTO public.coach_unique_codes (coach_id, code)
  VALUES (
    NEW.id,
    upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
  )
  ON CONFLICT (coach_id, code) DO NOTHING;

  -- 3. Create default notification preferences (FIXED: use correct column names)
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

  -- 4. Create Getting Started checklist
  INSERT INTO public.coach_getting_started_checklist (coach_id)
  VALUES (NEW.id)
  ON CONFLICT (coach_id) DO NOTHING;

  -- 5. Create default flows (5 flows)
  -- Flow 1: Workout Finished
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Workout Finished',
    'Triggered when a client completes a workout.',
    '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Workout finished","option":{"id":"workout-finished","name":"Workout finished"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  ) ON CONFLICT DO NOTHING;

  -- Flow 2: Check-in Completed
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Check-in Completed',
    'Triggered when a client completes a check-in.',
    '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Check in completed","option":{"id":"check-in-completed","name":"Check in completed"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  ) ON CONFLICT DO NOTHING;

  -- Flow 3: Missed Workout
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Missed Workout',
    'Triggered when a client misses a scheduled workout.',
    '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed workout","option":{"id":"missed-workout","name":"Missed workout"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  ) ON CONFLICT DO NOTHING;

  -- Flow 4: Missed Habit Log
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Missed Habit Log',
    'Triggered when a client misses logging a habit.',
    '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed habit log","option":{"id":"missed-habit-log","name":"Missed habit log"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  ) ON CONFLICT DO NOTHING;

  -- Flow 5: Missed Metric Log
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Missed Metric Log',
    'Triggered when a client misses logging a metric.',
    '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed metric log","option":{"id":"missed-metric-log","name":"Missed metric log"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  ) ON CONFLICT DO NOTHING;

  -- 6. Create default Onboarding Flow
  INSERT INTO public.coach_onboardings (coach_id, flow_data, is_active)
  VALUES (
    NEW.id,
    '{"edges":[{"id":"trigger-to-add-trigger","type":"smoothstep","source":"trigger","target":"add-action-trigger"},{"id":"add-trigger-to-end","type":"smoothstep","source":"add-action-trigger","target":"end"}],"nodes":[{"id":"trigger","data":{"icon":{},"label":"Trigger","subtitle":"New client sign up","isOnboarding":true},"type":"trigger","width":300,"height":56,"position":{"x":0,"y":0}},{"id":"add-action-trigger","data":{"metadata":{"index":0}},"type":"addAction","width":300,"height":40,"position":{"x":0,"y":94}},{"id":"end","data":{"label":"End"},"type":"end","width":300,"height":30,"position":{"x":0,"y":164}}]}'::jsonb,
    false
  )
  ON CONFLICT (coach_id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    -- Expected for race conditions, safe to ignore
    RETURN NEW;
  WHEN foreign_key_violation THEN
    RAISE WARNING 'FK violation in coach setup for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error in coach setup for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
