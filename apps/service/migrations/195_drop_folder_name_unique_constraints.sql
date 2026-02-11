-- Migration: Drop unique name constraints on folder tables
-- The application will handle duplicates by appending "(Copy)" to the name

-- Drop the unique constraints
ALTER TABLE coach_metric_folders DROP CONSTRAINT IF EXISTS uq_coach_metric_folders_name_ci;
ALTER TABLE coach_habit_folders DROP CONSTRAINT IF EXISTS uq_coach_habit_folders_name_ci;
ALTER TABLE coach_file_folders DROP CONSTRAINT IF EXISTS uq_coach_file_folders_name_ci;

-- Drop the indexes that were created for the constraints
DROP INDEX IF EXISTS idx_coach_metric_folders_name_ci;
DROP INDEX IF EXISTS idx_coach_habit_folders_name_ci;
DROP INDEX IF EXISTS idx_coach_file_folders_name_ci;
