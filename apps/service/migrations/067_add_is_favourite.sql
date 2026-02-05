-- Add is_favourite column to coach items
ALTER TABLE public.coach_workouts ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.coach_programs ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.coach_exercises ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN NOT NULL DEFAULT FALSE;
