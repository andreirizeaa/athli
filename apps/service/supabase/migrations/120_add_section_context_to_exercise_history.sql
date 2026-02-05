-- Add section context columns to exercise history for graphing
-- section_type: NULL for standalone/regular exercises, otherwise the interval section type
-- section_completed_rounds: Rounds completed (for interval sections only)

ALTER TABLE client_training_exercise_history
ADD COLUMN section_type text DEFAULT NULL,
ADD COLUMN section_completed_rounds integer DEFAULT NULL;

-- Add constraint to ensure section_type is a valid value
ALTER TABLE client_training_exercise_history
ADD CONSTRAINT chk_section_type
CHECK (section_type IS NULL OR section_type IN ('amrap', 'tabata', 'hiit', 'emom', 'circuits'));
