-- ================================================
-- Create client_training_history Table
-- ================================================

-- 1. Create Table
CREATE TABLE public.client_training_history (
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  date DATE NOT NULL,
  workout_id TEXT NOT NULL, -- Key from 'training_data' JSONB (e.g., 'workout_1')

  status TEXT NOT NULL DEFAULT 'not_started' 
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Primary Key (Composite)
  PRIMARY KEY (client_id, coach_id, date, workout_id),

  -- Foreign Keys
  CONSTRAINT fk_cth_client 
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cth_coach 
    FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE
);

-- 2. Indexes
-- Optimized for: "Show me all users who have completed/missed workouts for date X"
CREATE INDEX idx_cth_coach_date_status 
  ON public.client_training_history (coach_id, date, status);

-- Optimized for: Client viewing own history
CREATE INDEX idx_cth_client_date 
  ON public.client_training_history (client_id, date);

-- 3. Enable RLS
ALTER TABLE public.client_training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_training_history FORCE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Shared Read (Coach & Client)
CREATE POLICY cth_select
ON public.client_training_history
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- Shared Modify (Insert/Update/Delete) - Both can update status
CREATE POLICY cth_modify
ON public.client_training_history
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
GRANT ALL ON public.client_training_history TO postgres;
GRANT ALL ON public.client_training_history TO authenticated;
GRANT ALL ON public.client_training_history TO service_role;
