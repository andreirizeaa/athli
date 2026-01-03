-- ================================================
-- Create client_training_exercise_history Table
-- ================================================

-- 1. Create Table
CREATE TABLE public.client_training_exercise_history (
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  date DATE NOT NULL,
  workout_id TEXT NOT NULL,  -- Context: Which workout this exercise belonged to
  workout_name TEXT NOT NULL,
  exercise_id TEXT NOT NULL, -- The specific exercise definition ID (e.g., 'bench_press_uuid')
  
  exercise_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- The payload (sets, weights, reps performed)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Primary Key (Composite)
  -- Ensures unique entry for a specific exercise instance within a workout
  PRIMARY KEY (client_id, coach_id, date, workout_id, exercise_id),

  -- Foreign Keys
  CONSTRAINT fk_cteh_client 
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cteh_coach 
    FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
    
  CONSTRAINT chk_exercise_data_is_object CHECK (jsonb_typeof(exercise_data) = 'object')
);

-- 2. Indexes

-- Optimized for: "Show me all the history for client X ... for a specific exercise type"
-- Query: SELECT * FROM table WHERE client_id = ? AND exercise_id = ? ORDER BY date DESC
CREATE INDEX idx_cteh_client_exercise_date 
  ON public.client_training_exercise_history (client_id, exercise_id, date DESC);

-- Optimized for: Coach seeing progression usage across clients (optional but useful)
-- Query: SELECT * FROM table WHERE coach_id = ? AND exercise_id = ?
CREATE INDEX idx_cteh_coach_exercise 
  ON public.client_training_exercise_history (coach_id, exercise_id);

-- 3. Enable RLS
ALTER TABLE public.client_training_exercise_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_training_exercise_history FORCE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Shared Read (Coach & Client)
CREATE POLICY cteh_select
ON public.client_training_exercise_history
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- Shared Modify (Insert/Update/Delete)
CREATE POLICY cteh_modify
ON public.client_training_exercise_history
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- 5. Grant Permissions
GRANT ALL ON public.client_training_exercise_history TO postgres;
GRANT ALL ON public.client_training_exercise_history TO authenticated;
GRANT ALL ON public.client_training_exercise_history TO service_role;


ALTER TABLE public.client_training_exercise_history
  ADD COLUMN row_id BIGINT GENERATED ALWAYS AS IDENTITY;

ALTER TABLE public.client_training_exercise_history
  DROP CONSTRAINT IF EXISTS client_training_exercise_history_pkey;

ALTER TABLE public.client_training_exercise_history
  ADD PRIMARY KEY (client_id, coach_id, date, workout_id, exercise_id, row_id);
