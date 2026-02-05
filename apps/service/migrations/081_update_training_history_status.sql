-- Migration: Update client_training_history status options
-- Adds 'missed' to the allowed values for the status column

-- 1. Drop the existing check constraint
ALTER TABLE public.client_training_history
DROP CONSTRAINT IF EXISTS client_training_history_status_check;

-- 2. Add the new check constraint with 'missed' included
-- Allowed values: not_started, in_progress, completed, missed
ALTER TABLE public.client_training_history
ADD CONSTRAINT client_training_history_status_check 
CHECK (status IN ('in_progress', 'completed', 'missed'));
