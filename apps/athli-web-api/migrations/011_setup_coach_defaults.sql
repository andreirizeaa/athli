-- ================================================
-- ATHLI Automatic Coach Defaults Seeding
-- ================================================

-- STEP 0: Create table for unique coach codes
CREATE TABLE IF NOT EXISTS public.coach_unique_codes (
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (coach_id, code),
    CONSTRAINT coach_unique_codes_code_key UNIQUE (code)
);

-- Enable RLS
ALTER TABLE public.coach_unique_codes ENABLE ROW LEVEL SECURITY;

-- Create Policy (Coaches can read their own code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'coach_unique_codes' 
        AND policyname = 'Coaches can view own unique code'
    ) THEN
        CREATE POLICY "Coaches can view own unique code"
        ON public.coach_unique_codes FOR SELECT
        TO authenticated
        USING (coach_id = auth.uid());
    END IF;
END $$;

-- STEP 1: Create trigger function to handle new coach setup
-- This function automatically populates defaults for new coach profiles
CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the new profile is a coach
  IF NEW.user_type = 'coach' THEN
    
    -- 1. Create default preferences (theme, language, units, color_preset)
    -- Removed custom_data and renamed color_palette to color_preset to match schema
    INSERT INTO public.coach_preferences (coach_id, theme, language, units, color_preset)
    VALUES (NEW.id, 'light', 'en', 'metric', 'default')
    ON CONFLICT (coach_id) DO NOTHING;

    -- 3. Create default coach company information
    -- Insert an empty row so UPDATEs work immediately without needing an UPSERT
    -- Must provide company_name as it is NOT NULL
    INSERT INTO public.coach_company_information (coach_id, company_name)
    VALUES (NEW.id, 'My Company')
    ON CONFLICT (coach_id) DO NOTHING;

    -- 4. Generate and insert unique coach code
    -- Simple generation of 8-char alphanumeric code
    INSERT INTO public.coach_unique_codes (coach_id, code)
    VALUES (
        NEW.id, 
        upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
    )
    ON CONFLICT (coach_id, code) DO NOTHING;

    -- 2. Create default notification preferences
    -- We insert a record for every available event, using its default_enabled status
    INSERT INTO public.coach_notification_preferences (coach_id, event_id, enabled)
    SELECT 
      NEW.id, 
      id, 
      true -- We default all to enabled for new coaches as per requirements
    FROM public.available_notification_events
    ON CONFLICT (coach_id, event_id) DO NOTHING;

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

-- STEP 2: Create trigger
-- Triggered AFTER INSERT on user_profiles
DROP TRIGGER IF EXISTS on_coach_profile_created ON public.user_profiles;
CREATE TRIGGER on_coach_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_coach_setup();
