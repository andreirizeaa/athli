-- ================================================
-- Migration 017: Update coach_workouts table
-- Adds top-level columns for type, equipment, and difficulty
-- ================================================

ALTER TABLE public.coach_workouts
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS equipment TEXT[],
ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Create index for filtering if needed
CREATE INDEX IF NOT EXISTS idx_coach_workouts_type ON public.coach_workouts(type);
