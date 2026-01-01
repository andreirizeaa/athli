-- Remove day_status column from client_training table
-- We track status via completedSummary.status inside training_data JSONB instead

ALTER TABLE client_training DROP COLUMN IF EXISTS day_status;
