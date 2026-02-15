-- Migration: Add habit reminder fields and tracking table
-- Description: Allow coaches to set reminders for habits that send push notifications to clients

-- Add reminder fields to coach_habits table
ALTER TABLE public.coach_habits
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_time TIME,
ADD COLUMN IF NOT EXISTS reminder_message TEXT;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_coach_habits_reminder_enabled
ON public.coach_habits(reminder_enabled)
WHERE reminder_enabled = TRUE;

-- Create habit reminder log table for deduplication
-- Prevents sending the same reminder twice on the same day
CREATE TABLE IF NOT EXISTS public.habit_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  coach_habit_id UUID NOT NULL REFERENCES public.coach_habits(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_habit_reminder_log UNIQUE(client_id, coach_habit_id, reminder_date)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_habit_reminder_log_lookup
ON public.habit_reminder_log(client_id, coach_habit_id, reminder_date);

CREATE INDEX IF NOT EXISTS idx_habit_reminder_log_date
ON public.habit_reminder_log(reminder_date);

-- Enable RLS on habit_reminder_log
ALTER TABLE public.habit_reminder_log ENABLE ROW LEVEL SECURITY;

-- RLS policy: Clients can view their own reminder logs
CREATE POLICY client_view_own_habit_reminder_log ON public.habit_reminder_log
FOR SELECT TO authenticated
USING (client_id = auth.uid());

-- Service role can insert/update (for edge function)
CREATE POLICY service_manage_habit_reminder_log ON public.habit_reminder_log
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.habit_reminder_log IS 'Tracks sent habit reminders to prevent duplicate notifications';
COMMENT ON COLUMN public.coach_habits.reminder_enabled IS 'Whether to send push notification reminders for this habit';
COMMENT ON COLUMN public.coach_habits.reminder_time IS 'Time of day to send reminder (in client timezone)';
COMMENT ON COLUMN public.coach_habits.reminder_message IS 'Optional custom message for the reminder notification';

-- Create cleanup function for old habit reminder logs (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_habit_reminder_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.habit_reminder_log
  WHERE reminder_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- Schedule daily cleanup at 3 AM UTC
SELECT cron.schedule(
  'cleanup-habit-reminder-logs',
  '0 3 * * *',
  'SELECT public.cleanup_habit_reminder_logs()'
);
