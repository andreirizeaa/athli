-- ================================================
-- ATHLI Notifications Infrastructure & Preferences
-- ================================================

-- STEP 1: Drop current objects if they exist (Idempotency)
DROP TABLE IF EXISTS public.coach_notification_preferences CASCADE;
DROP TABLE IF EXISTS public.available_notification_events CASCADE;

-- STEP 2: Create available_notification_events table
-- This table stores all notification types developers can trigger
CREATE TABLE public.available_notification_events (
  id              UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key       TEXT NOT NULL UNIQUE, -- e.g., 'new_client_signup'
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'general', -- e.g., 'client', 'system', 'marketing'
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 3: Create coach_notification_preferences table
-- This table stores coach-specific overrides for available events
CREATE TABLE public.coach_notification_preferences (
  id           UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL,
  event_id     UUID NOT NULL,
  enabled      BOOLEAN NOT NULL,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_notif_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_event
    FOREIGN KEY (event_id) REFERENCES public.available_notification_events(id) ON DELETE CASCADE,
  CONSTRAINT unique_coach_event
    UNIQUE (coach_id, event_id)
);

-- STEP 4: Indexes
CREATE INDEX idx_coach_notif_prefs_owner ON public.coach_notification_preferences(coach_id);
CREATE INDEX idx_notif_events_key ON public.available_notification_events(event_key);

-- STEP 5: Enable RLS
ALTER TABLE public.available_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_notification_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.coach_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_notification_preferences FORCE ROW LEVEL SECURITY;

-- STEP 6: RLS Policies
-- Available events are viewable by any authenticated user
CREATE POLICY "Available events are viewable by authenticated users"
  ON public.available_notification_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Coach can manage their own notification preferences
CREATE POLICY "Coaches can view their own notification preferences"
  ON public.coach_notification_preferences
  FOR SELECT
  TO authenticated
  USING (coach_id = (select auth.uid()));

CREATE POLICY "Coaches can insert their own notification preferences"
  ON public.coach_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY "Coaches can update their own notification preferences"
  ON public.coach_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY "Coaches can delete their own notification preferences"
  ON public.coach_notification_preferences
  FOR DELETE
  TO authenticated
  USING (coach_id = (select auth.uid()));

-- STEP 7: Triggers
CREATE TRIGGER trg_available_notif_updated_at
  BEFORE UPDATE ON public.available_notification_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_coach_notif_prefs_updated_at
  BEFORE UPDATE ON public.coach_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- STEP 8: Seed initial events
INSERT INTO public.available_notification_events (event_key, name, description, category)
VALUES 
  ('new_client_signup', 'New Client Signup', 'Receive a notification when a new client signs up via your link.', 'client'),
  ('client_activity', 'Client Activity', 'Receive updates on client check-ins and performance.', 'client'),
  ('client_messages', 'Client Messages', 'Receive a notification when a client sends you a message.', 'client'),
  ('pre_appointment_info', 'Pre-Appointment Info', 'Notifications for pre-appointment information updates.', 'system'),
  ('system_downtime', 'System Downtimes', 'Important notifications about system maintenance and downtime.', 'system'),
  ('new_features', 'New Features', 'Stay updated with the latest tools and features added to Athli.', 'marketing')
ON CONFLICT (event_key) DO NOTHING;

-- STEP 9: Create consolidated view for settings
-- This view merges available events with current user preferences
-- Note: This uses security_invoker = true to respect RLS of the querying user
CREATE OR REPLACE VIEW public.v_my_notification_settings 
WITH (security_invoker = true)
AS
SELECT 
  ane.id AS event_id,
  ane.event_key,
  ane.name,
  ane.description,
  ane.category,
  COALESCE(cnp.enabled, ane.default_enabled) AS enabled
FROM public.available_notification_events ane
LEFT JOIN public.coach_notification_preferences cnp 
  ON ane.id = cnp.event_id 
  AND cnp.coach_id = (SELECT auth.uid());

-- Grant access to authenticated users
GRANT SELECT ON public.v_my_notification_settings TO authenticated;
