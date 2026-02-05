-- Migration 036: Restore coach_id for lookup and fix triggers
-- The coach_id column was removed from individual assignment tables in migration 035
-- The coach_id column was removed from client_profiles in migration 031

-- 1. Restore coach_id columns to assignment tables
ALTER TABLE public.client_metric_assignments ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES auth.users(id);
ALTER TABLE public.client_habit_assignments ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES auth.users(id);
ALTER TABLE public.client_file_assignments ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES auth.users(id);
ALTER TABLE public.client_checkin_assignments ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES auth.users(id);
ALTER TABLE public.client_questionnaire_assignments ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES auth.users(id);

-- 2. Simplified trigger functions that only set coach_id for lookup

-- Habits
CREATE OR REPLACE FUNCTION public.enforce_habit_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments
    WHERE client_id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Metrics
CREATE OR REPLACE FUNCTION public.enforce_metric_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments
    WHERE client_id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Files
CREATE OR REPLACE FUNCTION public.enforce_file_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments
    WHERE client_id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Check-ins
CREATE OR REPLACE FUNCTION public.enforce_checkin_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments
    WHERE client_id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Questionnaires
CREATE OR REPLACE FUNCTION public.enforce_questionnaire_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments
    WHERE client_id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Re-ensure triggers are pointing to updated functions (Migration 035 might have dropped some or we ensure they exist)
-- Habits
DROP TRIGGER IF EXISTS trg_cha_integrity ON public.client_habit_assignments;
CREATE TRIGGER trg_cha_integrity
BEFORE INSERT OR UPDATE ON public.client_habit_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_habit_assignment_integrity();

-- Metrics
DROP TRIGGER IF EXISTS trg_cma_integrity ON public.client_metric_assignments;
CREATE TRIGGER trg_cma_integrity
BEFORE INSERT OR UPDATE ON public.client_metric_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_metric_assignment_integrity();

-- Files
DROP TRIGGER IF EXISTS trg_cfa_integrity ON public.client_file_assignments;
CREATE TRIGGER trg_cfa_integrity
BEFORE INSERT OR UPDATE ON public.client_file_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_file_assignment_integrity();

-- Check-ins
DROP TRIGGER IF EXISTS trg_cca_integrity ON public.client_checkin_assignments;
CREATE TRIGGER trg_cca_integrity
BEFORE INSERT OR UPDATE ON public.client_checkin_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_checkin_assignment_integrity();

-- Questionnaires
DROP TRIGGER IF EXISTS trg_cqa_integrity ON public.client_questionnaire_assignments;
CREATE TRIGGER trg_cqa_integrity
BEFORE INSERT OR UPDATE ON public.client_questionnaire_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_questionnaire_assignment_integrity();
