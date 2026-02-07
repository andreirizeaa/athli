-- Replace automate_onboardings trigger: fire on coach_onboardings instead of coach_flows
CREATE OR REPLACE FUNCTION public.mark_checklist_automate_onboardings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET automate_onboardings = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND automate_onboardings = false;
  RETURN NEW;
END;
$$;

-- Drop old trigger on coach_flows
DROP TRIGGER IF EXISTS trg_checklist_automate_onboardings ON public.coach_flows;

-- Create new trigger on coach_onboardings
DROP TRIGGER IF EXISTS trg_checklist_automate_onboardings ON public.coach_onboardings;
CREATE TRIGGER trg_checklist_automate_onboardings
  AFTER INSERT ON public.coach_onboardings FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_automate_onboardings();
