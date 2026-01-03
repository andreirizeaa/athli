-- ================================================
-- Remove Partitioning from client_training
-- ================================================

-- 1. Create new unpartitioned table
CREATE TABLE public.client_training_new (
  client_id UUID NOT NULL,
  date DATE NOT NULL,
  coach_id UUID NOT NULL,
  
  -- Updated per migration 075: Default to Empty Object '{}'
  training_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Primary Key (updated to include coach_id per request)
  PRIMARY KEY (client_id, date, coach_id),

  CONSTRAINT fk_ct_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  
  -- Updated per migration 075: Enforce Object Type
  CONSTRAINT chk_training_data_is_object CHECK (jsonb_typeof(training_data) = 'object')
);

-- 2. Copy data from partitioned table to new table
INSERT INTO public.client_training_new (
  client_id, date, coach_id, training_data, created_at, updated_at
)
SELECT 
  client_id, date, coach_id, training_data, created_at, updated_at
FROM public.client_training;

-- 3. Drop old partitioned table
-- Use CASCADE to drop dependent objects (partitions, RLS policies, etc.)
DROP TABLE public.client_training CASCADE;

-- 4. Rename new table
ALTER TABLE public.client_training_new RENAME TO client_training;

-- 5. Recreate Indexes
-- Primary Key (client_id, date, coach_id) is already created by TABLE definition

-- Coach Index (Requested: coach_id, client_id, date context)
-- Original request was coach_id, client_id, date.
-- PK covers (client_id, date, coach_id).
-- We still need an index starting with coach_id for coach-filtered queries.
CREATE INDEX idx_client_training_coach_date ON public.client_training (coach_id, date);

-- 6. Enable RLS
ALTER TABLE public.client_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_training FORCE ROW LEVEL SECURITY;

-- 7. Restore RLS Policies
-- Sourced from: 005_rls_optimization_patch.sql

-- Policy: ct_select (Shared Read)
CREATE POLICY ct_select
ON public.client_training
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- Policy: ct_insert_coach (Coach Insert)
CREATE POLICY ct_insert_coach
ON public.client_training
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = coach_id);

-- Policy: ct_update_shared (Shared Update - e.g. client requesting, coach assigning)
-- Note: 'coach_id' in USING/CHECK ensures only involved parties can update
CREATE POLICY ct_update_shared
ON public.client_training
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
)
WITH CHECK (
  (select auth.uid()) = client_id
  OR (select auth.uid()) = coach_id
);

-- Policy: ct_delete_coach (Coach Delete)
CREATE POLICY ct_delete_coach
ON public.client_training
FOR DELETE
TO authenticated
USING ((select auth.uid()) = coach_id);

-- 8. Grant permissions (standard for this project)
GRANT ALL ON public.client_training TO postgres;
GRANT ALL ON public.client_training TO authenticated;
GRANT ALL ON public.client_training TO service_role;
