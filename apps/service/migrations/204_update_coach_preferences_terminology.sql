-- ================================================
-- Update coach_preferences: Remove units/timezone, Add client_terminology
-- ================================================

-- STEP 1: Drop the units column
ALTER TABLE public.coach_preferences DROP COLUMN IF EXISTS units;

-- STEP 2: Drop the timezone column
ALTER TABLE public.coach_preferences DROP COLUMN IF EXISTS timezone;

-- STEP 3: Add client_terminology column with constraint
ALTER TABLE public.coach_preferences
ADD COLUMN IF NOT EXISTS client_terminology TEXT NOT NULL DEFAULT 'athlete';

-- Add check constraint for valid values
ALTER TABLE public.coach_preferences
DROP CONSTRAINT IF EXISTS coach_preferences_client_terminology_check;

ALTER TABLE public.coach_preferences
ADD CONSTRAINT coach_preferences_client_terminology_check
CHECK (client_terminology IN ('athlete', 'client', 'member'));

-- STEP 4: Update the trigger function that creates coach preferences
-- Find and update the function that inserts into coach_preferences
CREATE OR REPLACE FUNCTION public.handle_new_coach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Create default preferences (without units/timezone, with client_terminology)
    INSERT INTO public.coach_preferences (coach_id, theme, language, color_preset, client_terminology)
    VALUES (NEW.id, 'light', 'en', 'default', 'athlete')
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

    RETURN NEW;
END;
$$;
