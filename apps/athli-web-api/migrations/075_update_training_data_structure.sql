-- Updating training_data structure to strict Object format
-- Table is empty, so no data migration needed.

-- 1. Drop existing Array constraint
ALTER TABLE client_training DROP CONSTRAINT IF EXISTS chk_training_data_is_array;

-- 2. Add new strict Object constraint
ALTER TABLE client_training ADD CONSTRAINT chk_training_data_is_object 
  CHECK (jsonb_typeof(training_data) = 'object');

-- 3. Update default value to empty Object
ALTER TABLE client_training ALTER COLUMN training_data SET DEFAULT '{}'::jsonb;
