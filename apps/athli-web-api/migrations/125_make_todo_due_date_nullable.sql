-- Make due_date nullable in coach_own_todolist
ALTER TABLE coach_own_todolist
ALTER COLUMN due_date DROP NOT NULL;
