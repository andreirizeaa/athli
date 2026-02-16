-- ================================================
-- Add AI Assistant to Getting Started Checklist
-- ================================================
-- Adds a new checklist item for AI Assistant feature exploration

-- STEP 1: Add the new column
ALTER TABLE public.coach_getting_started_checklist
ADD COLUMN IF NOT EXISTS ai_assistant BOOLEAN NOT NULL DEFAULT false;

-- STEP 2: Create trigger function for AI Assistant
-- Triggered when a coach uses the AI assistant (ai_assistant_daily_usage)
CREATE OR REPLACE FUNCTION public.mark_checklist_ai_assistant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET ai_assistant = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND ai_assistant = false;
  RETURN NEW;
END;
$$;

-- STEP 3: Create trigger on ai_assistant_daily_usage table
DROP TRIGGER IF EXISTS trg_checklist_ai_assistant ON public.ai_assistant_daily_usage;
CREATE TRIGGER trg_checklist_ai_assistant
  AFTER INSERT ON public.ai_assistant_daily_usage FOR EACH ROW
  EXECUTE FUNCTION public.mark_checklist_ai_assistant();
