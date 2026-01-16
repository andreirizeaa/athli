-- Migration: Make category nullable in coach_client_assignments
-- Reason: We don't know the client's category (online/in-person/hybrid) when they first sign up
-- The coach will set this later based on their training arrangement

-- Step 1: Drop the existing check constraint
ALTER TABLE public.coach_client_assignments
DROP CONSTRAINT IF EXISTS coach_client_assignments_category_check;

-- Step 2: Drop the default value
ALTER TABLE public.coach_client_assignments
ALTER COLUMN category DROP DEFAULT;

-- Step 3: Make the column nullable
ALTER TABLE public.coach_client_assignments
ALTER COLUMN category DROP NOT NULL;

-- Step 4: Add new check constraint that allows NULL
ALTER TABLE public.coach_client_assignments
ADD CONSTRAINT coach_client_assignments_category_check
CHECK (category IS NULL OR category IN ('online', 'in-person', 'hybrid'));

-- Step 5: Add comment explaining the NULL state
COMMENT ON COLUMN public.coach_client_assignments.category IS
'Training category: online, in-person, or hybrid. NULL when client first signs up; coach sets this later based on training arrangement.';
