-- ============================================================
-- Migration: 113_simplify_coach_exercises.sql
-- Description: Simplify coach exercises schema to align with MuscleWiki
--              - Add difficulty column
--              - Drop modality column
--              - Keep category (maps to equipment type)
-- ============================================================

-- Add difficulty column
ALTER TABLE public.coach_exercises ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Drop modality column (no longer used)
ALTER TABLE public.coach_exercises DROP COLUMN IF EXISTS modality;

-- Drop equipment column (using category instead which maps to MuscleWiki's equipment/category)
ALTER TABLE public.coach_exercises DROP COLUMN IF EXISTS equipment;

-- Add comment explaining the schema
COMMENT ON COLUMN public.coach_exercises.category IS 'Equipment type from MuscleWiki: Barbell, Bodyweight, Cables, Dumbbells, etc.';
COMMENT ON COLUMN public.coach_exercises.muscle_group IS 'Target muscles from MuscleWiki: Chest, Back, Shoulders, etc.';
COMMENT ON COLUMN public.coach_exercises.difficulty IS 'Difficulty level from MuscleWiki: Novice, Intermediate, Advanced';
