-- ================================================
-- ATHLI Getting Started Checklist
-- Tracks coach onboarding/feature exploration progress
-- ================================================

-- STEP 1: Create the checklist table
CREATE TABLE IF NOT EXISTS public.coach_getting_started_checklist (
  coach_id UUID PRIMARY KEY,
  
  -- Accordion 1 & 3: App demos (manual)
  client_app_demo BOOLEAN NOT NULL DEFAULT false,
  coach_app_demo BOOLEAN NOT NULL DEFAULT false,
  
  -- Accordion 2: Feature exploration (9 items, triggered by API saves)
  workout_ai BOOLEAN NOT NULL DEFAULT false,
  program_templates BOOLEAN NOT NULL DEFAULT false,
  custom_exercises BOOLEAN NOT NULL DEFAULT false,
  automate_onboardings BOOLEAN NOT NULL DEFAULT false,
  check_ins_forms BOOLEAN NOT NULL DEFAULT false,
  powerful_flows BOOLEAN NOT NULL DEFAULT false,
  lifestyle_habits BOOLEAN NOT NULL DEFAULT false,
  track_metrics BOOLEAN NOT NULL DEFAULT false,
  on_demand_resources BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_checklist_coach
    FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE
);

-- STEP 2: Add completion flag to coach_profiles
ALTER TABLE public.coach_profiles 
ADD COLUMN IF NOT EXISTS getting_started_checklist_complete BOOLEAN NOT NULL DEFAULT false;

-- STEP 3: Enable RLS
ALTER TABLE public.coach_getting_started_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_getting_started_checklist FORCE ROW LEVEL SECURITY;

-- STEP 4: RLS Policy - coaches can only access their own checklist
DROP POLICY IF EXISTS cgsc_coach_all ON public.coach_getting_started_checklist;
CREATE POLICY cgsc_coach_all
  ON public.coach_getting_started_checklist
  FOR ALL
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

-- STEP 5: Backfill existing coaches
INSERT INTO public.coach_getting_started_checklist (coach_id)
SELECT id FROM public.coach_profiles
ON CONFLICT (coach_id) DO NOTHING;

-- STEP 6: Updated_at trigger
DROP TRIGGER IF EXISTS trg_cgsc_updated_at ON public.coach_getting_started_checklist;
CREATE TRIGGER trg_cgsc_updated_at
  BEFORE UPDATE ON public.coach_getting_started_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- STEP 7: Grants
GRANT SELECT, INSERT, UPDATE ON public.coach_getting_started_checklist TO authenticated;

-- ================================================
-- COMPLETION TRIGGERS
-- These fire on INSERT to each coach table and flip the corresponding boolean
-- They use UPDATE ... WHERE column = false to ensure idempotency
-- ================================================

-- 1. Workout AI (coach_workouts)
CREATE OR REPLACE FUNCTION public.mark_checklist_workout_ai()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET workout_ai = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND workout_ai = false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_workout_ai ON public.coach_workouts;
CREATE TRIGGER trg_checklist_workout_ai
  AFTER INSERT ON public.coach_workouts FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_workout_ai();

-- 2. Program Templates (coach_programs)
CREATE OR REPLACE FUNCTION public.mark_checklist_program_templates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET program_templates = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND program_templates = false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_program_templates ON public.coach_programs;
CREATE TRIGGER trg_checklist_program_templates
  AFTER INSERT ON public.coach_programs FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_program_templates();

-- 3. Custom Exercises (coach_exercises)
CREATE OR REPLACE FUNCTION public.mark_checklist_custom_exercises()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET custom_exercises = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND custom_exercises = false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_custom_exercises ON public.coach_exercises;
CREATE TRIGGER trg_checklist_custom_exercises
  AFTER INSERT ON public.coach_exercises FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_custom_exercises();

-- 4. Automate Onboardings (coach_flows where name = 'New Client Sign Up' and is_active = true)
CREATE OR REPLACE FUNCTION public.mark_checklist_automate_onboardings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name = 'New Client Sign Up' AND NEW.is_active = true THEN
    UPDATE public.coach_getting_started_checklist
    SET automate_onboardings = true, updated_at = now()
    WHERE coach_id = NEW.coach_id AND automate_onboardings = false;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_automate_onboardings ON public.coach_flows;
CREATE TRIGGER trg_checklist_automate_onboardings
  AFTER INSERT OR UPDATE ON public.coach_flows FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_automate_onboardings();

-- 5. Check-ins & Forms (coach_questionnaires)
CREATE OR REPLACE FUNCTION public.mark_checklist_check_ins_forms_questionnaire()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET check_ins_forms = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND check_ins_forms = false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_check_ins_forms_q ON public.coach_questionnaires;
CREATE TRIGGER trg_checklist_check_ins_forms_q
  AFTER INSERT ON public.coach_questionnaires FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_check_ins_forms_questionnaire();

-- 6. Powerful Flows (coach_flows where name != 'New Client Sign Up' and is_active = true)
CREATE OR REPLACE FUNCTION public.mark_checklist_powerful_flows()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name != 'New Client Sign Up' AND NEW.is_active = true THEN
    UPDATE public.coach_getting_started_checklist
    SET powerful_flows = true, updated_at = now()
    WHERE coach_id = NEW.coach_id AND powerful_flows = false;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_powerful_flows ON public.coach_flows;
CREATE TRIGGER trg_checklist_powerful_flows
  AFTER INSERT OR UPDATE ON public.coach_flows FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_powerful_flows();

-- 7. Lifestyle Habits (coach_habits)
CREATE OR REPLACE FUNCTION public.mark_checklist_lifestyle_habits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET lifestyle_habits = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND lifestyle_habits = false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_lifestyle_habits ON public.coach_habits;
CREATE TRIGGER trg_checklist_lifestyle_habits
  AFTER INSERT ON public.coach_habits FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_lifestyle_habits();

-- 8. Track Metrics (coach_metrics)
CREATE OR REPLACE FUNCTION public.mark_checklist_track_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET track_metrics = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND track_metrics = false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_track_metrics ON public.coach_metrics;
CREATE TRIGGER trg_checklist_track_metrics
  AFTER INSERT ON public.coach_metrics FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_track_metrics();

-- 9. On Demand Resources (coach_files)
CREATE OR REPLACE FUNCTION public.mark_checklist_on_demand_resources()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET on_demand_resources = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND on_demand_resources = false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_checklist_on_demand_resources ON public.coach_files;
CREATE TRIGGER trg_checklist_on_demand_resources
  AFTER INSERT ON public.coach_files FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_on_demand_resources();
