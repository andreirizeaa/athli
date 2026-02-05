-- ================================================
-- Migration 068: Refactor Workout and Program Schema
-- ================================================
-- Purpose: Separate metadata from JSONB data fields
-- - Add type, difficulty, weeks columns to coach_programs
-- - Migrate existing data from program_data JSONB to columns
-- - Clean up workout_data to only contain sections array
-- - Clean up program_data to only contain days array

-- ================================================
-- STEP 1: Add columns to coach_programs
-- ================================================

-- Add type column
ALTER TABLE public.coach_programs
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add difficulty column
ALTER TABLE public.coach_programs
ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Add weeks column
ALTER TABLE public.coach_programs
ADD COLUMN IF NOT EXISTS weeks INTEGER;

-- ================================================
-- STEP 2: Migrate program metadata from JSONB to columns
-- ================================================

-- Extract type, difficulty, and weeks from program_data JSONB
UPDATE public.coach_programs
SET 
  type = COALESCE(program_data->>'type', ''),
  difficulty = COALESCE(program_data->>'difficulty', ''),
  weeks = CASE 
    WHEN program_data->>'weeks' IS NOT NULL 
    THEN (program_data->>'weeks')::INTEGER 
    ELSE NULL 
  END
WHERE program_data IS NOT NULL;

-- ================================================
-- STEP 3: Clean up program_data JSONB
-- ================================================

-- Remove metadata fields from program_data, keeping only the schema/days array
UPDATE public.coach_programs
SET program_data = CASE
  WHEN program_data ? 'schema' THEN
    jsonb_build_object('schema', program_data->'schema')
  WHEN program_data ? 'days' THEN
    jsonb_build_object('days', program_data->'days')
  ELSE
    '{}'::jsonb
END
WHERE program_data IS NOT NULL;

-- ================================================
-- STEP 4: Clean up workout_data JSONB
-- ================================================

-- Remove metadata fields from workout_data, keeping only sections and execution tracking
UPDATE public.coach_workouts
SET workout_data = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(workout_data)
  WHERE key NOT IN ('title', 'description', 'type', 'difficulty', 'equipment', 'totalExercises')
)
WHERE workout_data IS NOT NULL
  AND (
    workout_data ? 'title' OR 
    workout_data ? 'description' OR 
    workout_data ? 'type' OR 
    workout_data ? 'difficulty' OR 
    workout_data ? 'equipment' OR 
    workout_data ? 'totalExercises'
  );

-- ================================================
-- STEP 5: Add indexes for new columns
-- ================================================

-- Index on program type for filtering
CREATE INDEX IF NOT EXISTS idx_coach_programs_type 
ON public.coach_programs(type) 
WHERE type IS NOT NULL;

-- Index on program difficulty for filtering
CREATE INDEX IF NOT EXISTS idx_coach_programs_difficulty 
ON public.coach_programs(difficulty) 
WHERE difficulty IS NOT NULL;

-- ================================================
-- STEP 6: Add comments for documentation
-- ================================================

COMMENT ON COLUMN public.coach_programs.type IS 'Program type (e.g., strength, hypertrophy, endurance)';
COMMENT ON COLUMN public.coach_programs.difficulty IS 'Program difficulty level (e.g., beginner, intermediate, advanced)';
COMMENT ON COLUMN public.coach_programs.weeks IS 'Total number of weeks in the program';
COMMENT ON COLUMN public.coach_programs.program_data IS 'Program structure containing only the days/schema array';
COMMENT ON COLUMN public.coach_workouts.workout_data IS 'Workout structure containing only sections array and execution tracking fields';
