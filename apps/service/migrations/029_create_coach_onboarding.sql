-- ================================================
-- ATHLI Coach Onboarding: Client Onboarding Flows
-- ================================================

-- STEP 1: Drop current objects if they exist (Idempotency)
DROP TABLE IF EXISTS public.coach_onboarding CASCADE;

-- STEP 2: Create coach_onboarding table
CREATE TABLE public.coach_onboarding (
  id           UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL,

  -- The serializable automation schema (trigger + actions dictionary + traversal links)
  -- Note: trigger is always 'new-client-signup' for onboarding flows
  flow_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Publish state: when true, this onboarding flow is active for new clients
  is_active BOOLEAN NOT NULL DEFAULT FALSE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_onboarding_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- STEP 3: Indexes
-- Fast lookup per coach
CREATE INDEX idx_onboarding_coach ON public.coach_onboarding(coach_id);

-- SINGLE ONBOARDING PER COACH: Ensure only one row per coach
CREATE UNIQUE INDEX uq_coach_onboarding_single 
  ON public.coach_onboarding (coach_id);

-- STEP 4: Enable RLS
ALTER TABLE public.coach_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_onboarding FORCE ROW LEVEL SECURITY;

-- STEP 5: RLS Policies
-- Single FOR ALL policy to cover CRUD (SELECT, INSERT, UPDATE, DELETE)
-- Optimized with (select auth.uid()) to prevent re-evaluation warnings
CREATE POLICY co_all
  ON public.coach_onboarding
  FOR ALL
  TO authenticated
USING (coach_id = (select auth.ud()))
  WITH CHECK (coach_id = (select auth.uid()));

-- STEP 6: Triggers
-- Automated updated_at timestamp refinement
CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON public.coach_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
