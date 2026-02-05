-- Migration: Final Coach Library Cleanup
-- Goal: Ensure no coach library tables accidentally contain a client_id column.
-- These were already removed in 033, but this ensures a clean slate.

ALTER TABLE public.coach_metrics DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_habits DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_files DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_checkins DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_questionnaires DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_workouts DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_programs DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.coach_exercises DROP COLUMN IF EXISTS client_id;
