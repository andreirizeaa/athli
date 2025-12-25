-- ================================================
-- ATHLI Coach Preferences
-- ================================================

-- STEP 1: Drop current objects if they exist (Idempotency)
DROP TABLE IF EXISTS public.coach_preferences CASCADE;

-- STEP 2: Create coach_preferences table
CREATE TABLE public.coach_preferences (
  id           UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL UNIQUE, -- One preferences record per coach

  theme        TEXT NOT NULL DEFAULT 'light',
  language     TEXT NOT NULL DEFAULT 'en',
  timezone     TEXT,
  
  -- Flexible storage for additional preferences
  custom_data  JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_preferences_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- STEP 3: Indexes
CREATE INDEX idx_coach_preferences_owner ON public.coach_preferences(coach_id);

-- STEP 4: Enable RLS
ALTER TABLE public.coach_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_preferences FORCE ROW LEVEL SECURITY;

-- STEP 5: RLS Policies
-- Drop policies if they exist (Idempotency)
DROP POLICY IF EXISTS coach_p_select ON public.coach_preferences;
DROP POLICY IF EXISTS coach_p_insert ON public.coach_preferences;
DROP POLICY IF EXISTS coach_p_update ON public.coach_preferences;
DROP POLICY IF EXISTS coach_p_delete ON public.coach_preferences;

-- Coach can manage their own preferences
CREATE POLICY coach_p_select
  ON public.coach_preferences
  FOR SELECT
  TO authenticated
  USING (coach_id = (select auth.uid()));

CREATE POLICY coach_p_insert
  ON public.coach_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY coach_p_update
  ON public.coach_preferences
  FOR UPDATE
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY coach_p_delete
  ON public.coach_preferences
  FOR DELETE
  TO authenticated
  USING (coach_id = (select auth.uid()));

-- STEP 6: Triggers
-- Automated updated_at timestamp refinement
CREATE TRIGGER trg_coach_preferences_updated_at
  BEFORE UPDATE ON public.coach_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
