-- ================================================
-- Migration: Auto-Incrementing Name Suffixes
-- ================================================

-- 1. Create the generic trigger function
CREATE OR REPLACE FUNCTION public.resolve_coach_item_name_conflict()
RETURNS TRIGGER AS $$
DECLARE
    base_name TEXT;
    target_name TEXT;
    counter INTEGER := 1;
    exists_already BOOLEAN;
BEGIN
    base_name := NEW.name;
    target_name := base_name;

    -- Look for conflicts within the same coach's library
    -- TG_TABLE_NAME provides the name of the table that fired the trigger
    LOOP
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM public.%I WHERE coach_id = $1 AND lower(name) = lower($2) AND id IS DISTINCT FROM $3)',
            TG_TABLE_NAME
        )
        INTO exists_already
        USING NEW.coach_id, target_name, NEW.id;

        IF NOT exists_already THEN
            EXIT;
        END IF;

        target_name := base_name || ' ' || counter;
        counter := counter + 1;
    END LOOP;

    NEW.name := target_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach triggers to all library tables

-- 2.1 coach_metrics
DROP TRIGGER IF EXISTS trg_resolve_metric_name_conflict ON public.coach_metrics;
CREATE TRIGGER trg_resolve_metric_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

-- 2.2 coach_habits
DROP TRIGGER IF EXISTS trg_resolve_habit_name_conflict ON public.coach_habits;
CREATE TRIGGER trg_resolve_habit_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_habits
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

-- 2.3 coach_checkins
DROP TRIGGER IF EXISTS trg_resolve_checkin_name_conflict ON public.coach_checkins;
CREATE TRIGGER trg_resolve_checkin_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

-- 2.4 coach_questionnaires
DROP TRIGGER IF EXISTS trg_resolve_questionnaire_name_conflict ON public.coach_questionnaires;
CREATE TRIGGER trg_resolve_questionnaire_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

-- 2.5 coach_exercises
DROP TRIGGER IF EXISTS trg_resolve_exercise_name_conflict ON public.coach_exercises;
CREATE TRIGGER trg_resolve_exercise_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_exercises
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

-- 2.6 coach_workouts
DROP TRIGGER IF EXISTS trg_resolve_workout_name_conflict ON public.coach_workouts;
CREATE TRIGGER trg_resolve_workout_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_workouts
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

-- 2.7 coach_programs
DROP TRIGGER IF EXISTS trg_resolve_program_name_conflict ON public.coach_programs;
CREATE TRIGGER trg_resolve_program_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_programs
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

-- 2.8 coach_flows
DROP TRIGGER IF EXISTS trg_resolve_flow_name_conflict ON public.coach_flows;
CREATE TRIGGER trg_resolve_flow_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_flows
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();
