-- ================================================
-- ATHLI Coach Flows: Automation Workflows
-- ================================================

-- STEP 1: Drop current objects if they exist (Idempotency)
DROP TABLE IF EXISTS public.coach_flows CASCADE;

-- STEP 2: Create coach_flows table
CREATE TABLE public.coach_flows (
  id          UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL,

  name        TEXT NOT NULL,
  description TEXT,
  
  -- The serializable automation schema (trigger + actions dictionary + traversal links)
  flow_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_flows_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- STEP 3: Indexes
-- Fast lookup per coach
CREATE INDEX idx_flows_coach ON public.coach_flows(coach_id);

-- Case-insensitive uniqueness per coach
CREATE UNIQUE INDEX uq_coach_flows_name_ci
  ON public.coach_flows (coach_id, lower(name));

-- STEP 4: Enable RLS
ALTER TABLE public.coach_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_flows FORCE ROW LEVEL SECURITY;

-- STEP 5: RLS Policies
-- Single FOR ALL policy to cover CRUD (SELECT, INSERT, UPDATE, DELETE)
-- Optimized with (select auth.uid()) to prevent re-evaluation warnings
CREATE POLICY cf_all
  ON public.coach_flows
  FOR ALL
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

-- STEP 6: Triggers
-- Automated updated_at timestamp refinement
CREATE TRIGGER trg_flows_updated_at
  BEFORE UPDATE ON public.coach_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
