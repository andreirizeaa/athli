-- ================================================
-- Migration 072: Add total_workouts to coach_programs
-- ================================================

-- Add total_workouts column
ALTER TABLE public.coach_programs
ADD COLUMN IF NOT EXISTS total_workouts INTEGER DEFAULT 0;