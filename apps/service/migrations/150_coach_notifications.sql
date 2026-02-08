-- ================================================
-- Coach Notifications System
-- ================================================
-- Replaces old client_updates (coach notes) and unused notification preferences
-- infrastructure with a new coach_notifications table for real-time notifications.

-- ================================================
-- STEP 1: Drop old tables and views
-- ================================================

-- Drop the old notification preferences view
DROP VIEW IF EXISTS public.v_my_notification_settings;

-- Drop old tables (CASCADE handles any dependent objects)
DROP TABLE IF EXISTS public.coach_notification_preferences CASCADE;
DROP TABLE IF EXISTS public.available_notification_events CASCADE;
DROP TABLE IF EXISTS public.client_updates CASCADE;

-- ================================================
-- STEP 2: Update handle_new_coach_setup() trigger function
-- Remove notification preferences seeding block
-- ================================================
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

    -- 5. Create default onboarding flow
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
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Error seeding coach defaults: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ================================================
-- STEP 3: Create coach_notifications table
-- ================================================
CREATE TABLE public.coach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- STEP 4: Indexes
-- ================================================

-- Main feed query: coach's notifications ordered by date
CREATE INDEX idx_cn_coach_created ON public.coach_notifications (coach_id, created_at DESC);

-- Unread count: partial index for fast unread badge
CREATE INDEX idx_cn_coach_unread ON public.coach_notifications (coach_id) WHERE read_at IS NULL;

-- Filter by type
CREATE INDEX idx_cn_type ON public.coach_notifications (notification_type);

-- ================================================
-- STEP 5: RLS
-- ================================================
ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;

-- Coaches can read their own notifications
CREATE POLICY "Coaches can view own notifications"
  ON public.coach_notifications FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

-- Coaches can mark their own notifications as read
CREATE POLICY "Coaches can update own notifications"
  ON public.coach_notifications FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Coaches can delete their own notifications
CREATE POLICY "Coaches can delete own notifications"
  ON public.coach_notifications FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid());

-- No INSERT policy: service role bypasses RLS for inserts (more secure)

-- ================================================
-- STEP 6: Create coach_notification_preferences table
-- ================================================
-- Each row represents a coach's preference for a specific notification type.
-- Two independent toggles: in_app_enabled (web dashboard) and push_enabled (push notifications).

CREATE TABLE public.coach_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, notification_type)
);

-- Index for fast lookups by coach
CREATE INDEX idx_cnp_coach ON public.coach_notification_preferences (coach_id);

-- RLS
ALTER TABLE public.coach_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own notification preferences"
  ON public.coach_notification_preferences FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can update own notification preferences"
  ON public.coach_notification_preferences FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can insert own notification preferences"
  ON public.coach_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid());

-- ================================================
-- STEP 7: Update mark_missed_workouts() to also create coach notifications
-- ================================================
CREATE OR REPLACE FUNCTION public.mark_missed_workouts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  -- Insert a 'missed' row for every workout that exists in client_training
  -- but has no corresponding row in client_training_history.
  --
  -- Timezone resolution order:
  --   1. Client's own timezone (user_profiles where user_type='client')
  --   2. Coach's timezone (user_profiles where id = coach_id)
  --   3. 'UTC' fallback
  --
  -- We look back 2 days (yesterday + day before) as a catch-up window
  -- in case a previous cron run failed.
  --
  -- The ON CONFLICT DO NOTHING makes this fully idempotent.

  WITH missed AS (
    INSERT INTO public.client_training_history
      (client_id, coach_id, date, workout_id, status)
    SELECT
      ct.client_id,
      ct.coach_id,
      ct.date,
      wk.workout_id,
      'missed'
    FROM public.client_training ct
    LEFT JOIN public.user_profiles client_up
      ON client_up.id = ct.client_id AND client_up.user_type = 'client'
    LEFT JOIN public.user_profiles coach_up
      ON coach_up.id = ct.coach_id AND coach_up.user_type = 'coach'
    CROSS JOIN LATERAL jsonb_object_keys(ct.training_data) AS wk(workout_id)
    LEFT JOIN public.client_training_history cth
      ON  cth.client_id  = ct.client_id
      AND cth.coach_id   = ct.coach_id
      AND cth.date       = ct.date
      AND cth.workout_id = wk.workout_id
    WHERE
      ct.date < (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date
      AND ct.date >= (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date - 2
      AND cth.client_id IS NULL
      AND ct.training_data != '{}'::jsonb
    ON CONFLICT (client_id, coach_id, date, workout_id) DO NOTHING
    RETURNING client_id, coach_id, date, workout_id
  )
  -- Create a coach notification for each missed workout
  INSERT INTO public.coach_notifications
    (coach_id, client_id, notification_type, title, description, metadata)
  SELECT
    m.coach_id,
    m.client_id,
    'workout_missed',
    'Workout missed',
    COALESCE(up.first_name || ' ' || up.last_name, 'Client') || ' missed a workout on ' || to_char(m.date, 'Mon DD, YYYY'),
    jsonb_build_object('workout_id', m.workout_id, 'date', m.date)
  FROM missed m
  LEFT JOIN public.user_profiles up ON up.id = m.client_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;
