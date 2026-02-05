-- Remove started_at and completed_at columns from client_training table
-- We track execution times via completedSummary inside training_data JSONB instead

ALTER TABLE client_training DROP COLUMN IF EXISTS started_at;
ALTER TABLE client_training DROP COLUMN IF EXISTS completed_at;
