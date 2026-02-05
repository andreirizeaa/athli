-- Migration 041: Fix all remaining trigger functions that reference cp.coach_id
-- Purpose: After the refactoring in migrations 037+, client_profiles no longer has
--          a coach_id column. All triggers must use coach_client_assignments instead.

-- 1. Fix enforce_todolist_client_belongs_to_coach
-- This function was checking cp.coach_id which no longer exists
CREATE OR REPLACE FUNCTION public.enforce_todolist_client_belongs_to_coach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Defense-in-depth: Coach MUST match auth.uid() (if user session)
  IF auth.uid() IS NOT NULL AND NEW.coach_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'coach_id must equal auth.uid()';
  END IF;

  -- Normalize / validate (matches your CHECK constraints)
  IF NEW.type = 'general' THEN
    NEW.client_id := NULL; -- Force consistency
    RETURN NEW;
  ELSIF NEW.type = 'client' THEN
    IF NEW.client_id IS NULL THEN
      RAISE EXCEPTION 'type=client requires client_id';
    END IF;

    -- Use coach_client_assignments instead of client_profiles.coach_id
    IF NOT EXISTS (
      SELECT 1
      FROM public.coach_client_assignments cca
      WHERE cca.client_id = NEW.client_id
        AND cca.coach_id = NEW.coach_id
    ) THEN
      RAISE EXCEPTION 'client_id does not belong to this coach';
    END IF;

    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'invalid type (expected client/general)';
  END IF;
END;
$$;

-- 2. Fix protect_client_profile_fields
-- Remove references to coach_id since client_profiles no longer has it
CREATE OR REPLACE FUNCTION public.protect_client_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    -- Block system fields (coach_id is no longer on this table)
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Clients cannot change profile creation date.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Fix validate_coach_role
-- This trigger checks against user_profiles which may have changed
CREATE OR REPLACE FUNCTION public.validate_coach_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles
    WHERE coach_id = NEW.coach_id
  ) THEN
    RAISE EXCEPTION 'Referenced user is not a coach.';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Update triggers on new table names (client_metrics, client_habits, client_files)
-- These tables were renamed in 037, but the triggers might be missing or outdated

-- Drop old triggers if they exist on the renamed tables
DROP TRIGGER IF EXISTS trg_cma_integrity ON public.client_metrics;
DROP TRIGGER IF EXISTS trg_cha_integrity ON public.client_habits;
DROP TRIGGER IF EXISTS trg_cfa_integrity ON public.client_files;
DROP TRIGGER IF EXISTS trg_cca_integrity ON public.client_checkins;
DROP TRIGGER IF EXISTS trg_cqa_integrity ON public.client_questionnaires;

-- The new client_* tables contain coach_id directly and don't need the old 
-- assignment integrity triggers. But we should ensure any insert without
-- coach_id gets it from the assignment.

-- Simple trigger for client_metrics: populate coach_id if not provided
CREATE OR REPLACE FUNCTION public.set_client_item_coach_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT cca.coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments cca
    WHERE cca.client_id = NEW.client_id
    LIMIT 1;
    
    IF NEW.coach_id IS NULL THEN
      RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers if the tables exist and need them
-- client_metrics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_metrics' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS trg_cm_coach_id ON public.client_metrics;
    CREATE TRIGGER trg_cm_coach_id
    BEFORE INSERT ON public.client_metrics
    FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();
  END IF;
END $$;

-- client_habits
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_habits' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS trg_ch_coach_id ON public.client_habits;
    CREATE TRIGGER trg_ch_coach_id
    BEFORE INSERT ON public.client_habits
    FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();
  END IF;
END $$;

-- client_files
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_files' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS trg_cf_coach_id ON public.client_files;
    CREATE TRIGGER trg_cf_coach_id
    BEFORE INSERT ON public.client_files
    FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();
  END IF;
END $$;

-- client_checkins
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_checkins' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS trg_cc_coach_id ON public.client_checkins;
    CREATE TRIGGER trg_cc_coach_id
    BEFORE INSERT ON public.client_checkins
    FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();
  END IF;
END $$;

-- client_questionnaires
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_questionnaires' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS trg_cq_coach_id ON public.client_questionnaires;
    CREATE TRIGGER trg_cq_coach_id
    BEFORE INSERT ON public.client_questionnaires
    FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();
  END IF;
END $$;

-- 5. Update other log triggers that may still reference cp.coach_id
-- These were defined in 003 and need updating

-- enforce_metric_entry_integrity
CREATE OR REPLACE FUNCTION public.enforce_metric_entry_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  -- Check assignment exists (now in client_metrics table)
  IF NOT EXISTS (
    SELECT 1 FROM public.client_metrics cm
    WHERE cm.client_id = NEW.client_id
      AND cm.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'metric is not assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

-- enforce_habit_log_integrity
CREATE OR REPLACE FUNCTION public.enforce_habit_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  -- Check assignment exists (now in client_habits table)
  IF NOT EXISTS (
    SELECT 1 FROM public.client_habits ch
    WHERE ch.client_id = NEW.client_id
      AND ch.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'habit is not assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

-- enforce_checkin_log_integrity
CREATE OR REPLACE FUNCTION public.enforce_checkin_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  -- Check assignment exists (now in client_checkins table)
  IF NOT EXISTS (
    SELECT 1 FROM public.client_checkins cc
    WHERE cc.client_id = NEW.client_id
      AND cc.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'checkin is not assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;

-- enforce_quest_log_integrity
CREATE OR REPLACE FUNCTION public.enforce_quest_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  -- Check assignment exists (now in client_questionnaires table)
  IF NOT EXISTS (
    SELECT 1 FROM public.client_questionnaires cq
    WHERE cq.client_id = NEW.client_id
      AND cq.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'questionnaire is not assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;

-- enforce_photo_log_integrity
CREATE OR REPLACE FUNCTION public.enforce_photo_log_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment (not client_profiles)
  SELECT cca.coach_id INTO v_coach 
  FROM public.coach_client_assignments cca 
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;
  
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;

-- enforce_coach_private_integrity (for bio, goals, injuries, notes, training)
CREATE OR REPLACE FUNCTION public.enforce_coach_private_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment (not client_profiles)
  SELECT cca.coach_id INTO v_coach 
  FROM public.coach_client_assignments cca 
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN 
    RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id; 
  END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;

-- 6. Fix any remaining RLS policies that might reference cp.coach_id

-- cts_select was handled in 038, but let's ensure it's correct
DROP POLICY IF EXISTS cts_select ON public.client_training_summary;
CREATE POLICY cts_select
ON public.client_training_summary
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_training_summary.client_id
      AND cca.coach_id = (select auth.uid())
  )
);
