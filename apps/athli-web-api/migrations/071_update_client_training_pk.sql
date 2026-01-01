-- Migration to update client_training primary key to (client_id, date, coach_id)

-- Drop the existing primary key
ALTER TABLE client_training DROP CONSTRAINT IF EXISTS client_training_pkey;

-- Add the new primary key
ALTER TABLE client_training ADD PRIMARY KEY (client_id, date, coach_id);
