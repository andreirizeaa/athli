-- Migration: Drop unique indexes on folder name columns
-- The application handles duplicate names by appending "(Copy)" to the name
-- Previous migration 195 tried to drop constraints but they were created as indexes

-- Drop the unique indexes (correct approach)
DROP INDEX IF EXISTS public.uq_coach_metric_folders_name_ci;
DROP INDEX IF EXISTS public.uq_coach_habit_folders_name_ci;
DROP INDEX IF EXISTS public.uq_coach_file_folders_name_ci;
