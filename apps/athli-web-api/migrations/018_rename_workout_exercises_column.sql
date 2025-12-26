-- ================================================
-- Migration 018: Rename number_of_exercises to total_exercises
-- Aligns DB schema with frontend schema
-- ================================================

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'coach_workouts' AND column_name = 'number_of_exercises') THEN
    ALTER TABLE public.coach_workouts RENAME COLUMN number_of_exercises TO total_exercises;
  END IF;
END $$;
