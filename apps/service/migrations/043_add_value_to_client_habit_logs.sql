-- Add value column to client_habit_logs to track numeric progress
ALTER TABLE client_habit_logs
ADD COLUMN value numeric; -- nullable, as legacy logs might only be status

-- Grant update if needed (usually handled by existing policies on table)
