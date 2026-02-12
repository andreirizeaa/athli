-- Fix handle_new_coach_setup() to remove invalid ON CONFLICT clauses
--
-- Two issues in migration 198:
--
-- 1. coach_flows: "ON CONFLICT DO NOTHING" without a target is invalid.
--    The table has a unique index on (coach_id, lower(name)), so PostgreSQL
--    requires specifying the conflict target.
--
-- 2. coach_onboardings: "ON CONFLICT (coach_id) DO NOTHING" is invalid.
--    The table has NO unique constraint on coach_id - only a foreign key and index.
--
-- These caused the function to error, get caught by the exception handler, and
-- silently return without creating any flows or the default onboarding.
--
-- Fix: Remove ON CONFLICT from both coach_flows and coach_onboardings inserts
-- since this is a new coach setup and there won't be any existing rows to conflict with.

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
    upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12))
  )
  ON CONFLICT (coach_id, code) DO NOTHING;

  -- 3. Create default notification preferences (use correct column names from migration 150)
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

  -- 5. Create default flows (6 flows)
  -- FIXED: Removed "ON CONFLICT DO NOTHING" - it was invalid without a conflict target
  -- and this is a new coach so there won't be any existing flows anyway

  -- Flow 1: Workout Finished
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Workout Finished',
    'Triggered when a client completes a workout.',
    '{"nodes":[{"id":"trigger","type":"trigger","nodeType":"trigger","position":{"x":0,"y":0},"data":{"icon":{},"label":"Trigger","subtitle":"Workout finished","option":{"id":"workout-finished","name":"Workout finished"}},"dagre":{"x":150,"y":32,"rank":0,"width":300,"height":64}},{"id":"add-action-trigger","type":"addAction","nodeType":"add-action","position":{"x":0,"y":94},"data":{"metadata":{"index":0}},"dagre":{"x":150,"y":96,"rank":1,"width":300,"height":40}},{"id":"end","type":"end","nodeType":"end","position":{"x":0,"y":164},"data":{"label":"End"},"dagre":{"x":150,"y":156,"rank":2,"width":300,"height":30}}],"edges":[{"id":"trigger-to-add-trigger","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-trigger-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  );

  -- Flow 2: Check-in Completed
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Check-in Completed',
    'Triggered when a client completes a check-in.',
    '{"nodes":[{"id":"trigger","type":"trigger","nodeType":"trigger","position":{"x":0,"y":0},"data":{"icon":{},"label":"Trigger","subtitle":"Check in completed","option":{"id":"check-in-completed","name":"Check in completed"}},"dagre":{"x":150,"y":32,"rank":0,"width":300,"height":64}},{"id":"add-action-trigger","type":"addAction","nodeType":"add-action","position":{"x":0,"y":94},"data":{"metadata":{"index":0}},"dagre":{"x":150,"y":96,"rank":1,"width":300,"height":40}},{"id":"end","type":"end","nodeType":"end","position":{"x":0,"y":164},"data":{"label":"End"},"dagre":{"x":150,"y":156,"rank":2,"width":300,"height":30}}],"edges":[{"id":"trigger-to-add-trigger","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-trigger-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  );

  -- Flow 3: Missed Check-in
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Missed Check-in',
    'Triggered when a client misses a scheduled check-in.',
    '{"nodes":[{"id":"trigger","type":"trigger","nodeType":"trigger","position":{"x":0,"y":0},"data":{"icon":{},"label":"Trigger","subtitle":"Missed check in","option":{"id":"missed-check-in","name":"Missed check in"}},"dagre":{"x":150,"y":32,"rank":0,"width":300,"height":64}},{"id":"add-action-trigger","type":"addAction","nodeType":"add-action","position":{"x":0,"y":94},"data":{"metadata":{"index":0}},"dagre":{"x":150,"y":96,"rank":1,"width":300,"height":40}},{"id":"end","type":"end","nodeType":"end","position":{"x":0,"y":164},"data":{"label":"End"},"dagre":{"x":150,"y":156,"rank":2,"width":300,"height":30}}],"edges":[{"id":"trigger-to-add-trigger","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-trigger-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  );

  -- Flow 4: Missed Workout
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Missed Workout',
    'Triggered when a client misses a scheduled workout.',
    '{"nodes":[{"id":"trigger","type":"trigger","nodeType":"trigger","position":{"x":0,"y":0},"data":{"icon":{},"label":"Trigger","subtitle":"Missed workout","option":{"id":"missed-workout","name":"Missed workout"}},"dagre":{"x":150,"y":32,"rank":0,"width":300,"height":64}},{"id":"add-action-trigger","type":"addAction","nodeType":"add-action","position":{"x":0,"y":94},"data":{"metadata":{"index":0}},"dagre":{"x":150,"y":96,"rank":1,"width":300,"height":40}},{"id":"end","type":"end","nodeType":"end","position":{"x":0,"y":164},"data":{"label":"End"},"dagre":{"x":150,"y":156,"rank":2,"width":300,"height":30}}],"edges":[{"id":"trigger-to-add-trigger","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-trigger-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  );

  -- Flow 5: Missed Habit Log
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Missed Habit Log',
    'Triggered when a client misses logging a habit.',
    '{"nodes":[{"id":"trigger","type":"trigger","nodeType":"trigger","position":{"x":0,"y":0},"data":{"icon":{},"label":"Trigger","subtitle":"Missed habit log","option":{"id":"missed-habit-log","name":"Missed habit log"}},"dagre":{"x":150,"y":32,"rank":0,"width":300,"height":64}},{"id":"add-action-trigger","type":"addAction","nodeType":"add-action","position":{"x":0,"y":94},"data":{"metadata":{"index":0}},"dagre":{"x":150,"y":96,"rank":1,"width":300,"height":40}},{"id":"end","type":"end","nodeType":"end","position":{"x":0,"y":164},"data":{"label":"End"},"dagre":{"x":150,"y":156,"rank":2,"width":300,"height":30}}],"edges":[{"id":"trigger-to-add-trigger","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-trigger-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  );

  -- Flow 6: Missed Metric Log
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'Missed Metric Log',
    'Triggered when a client misses logging a metric.',
    '{"nodes":[{"id":"trigger","type":"trigger","nodeType":"trigger","position":{"x":0,"y":0},"data":{"icon":{},"label":"Trigger","subtitle":"Missed metric log","option":{"id":"missed-metric-log","name":"Missed metric log"}},"dagre":{"x":150,"y":32,"rank":0,"width":300,"height":64}},{"id":"add-action-trigger","type":"addAction","nodeType":"add-action","position":{"x":0,"y":94},"data":{"metadata":{"index":0}},"dagre":{"x":150,"y":96,"rank":1,"width":300,"height":40}},{"id":"end","type":"end","nodeType":"end","position":{"x":0,"y":164},"data":{"label":"End"},"dagre":{"x":150,"y":156,"rank":2,"width":300,"height":30}}],"edges":[{"id":"trigger-to-add-trigger","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-trigger-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  );

  -- 7. Create default Onboarding Flow
  -- FIXED: Removed "ON CONFLICT (coach_id) DO NOTHING" - coach_onboardings has no unique constraint on coach_id
  -- FIXED: Added required "name" column
  INSERT INTO public.coach_onboardings (coach_id, name, description, flow_data, is_active)
  VALUES (
    NEW.id,
    'New Client Onboarding',
    'Triggered when a new client signs up.',
    '{"nodes":[{"id":"trigger","type":"trigger","nodeType":"trigger","position":{"x":0,"y":0},"data":{"icon":{},"label":"Trigger","subtitle":"New client sign up","isOnboarding":true},"dagre":{"x":150,"y":32,"rank":0,"width":300,"height":64}},{"id":"add-action-trigger","type":"addAction","nodeType":"add-action","position":{"x":0,"y":94},"data":{"metadata":{"index":0}},"dagre":{"x":150,"y":96,"rank":1,"width":300,"height":40}},{"id":"end","type":"end","nodeType":"end","position":{"x":0,"y":164},"data":{"label":"End"},"dagre":{"x":150,"y":156,"rank":2,"width":300,"height":30}}],"edges":[{"id":"trigger-to-add-trigger","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-trigger-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb,
    false
  );

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
