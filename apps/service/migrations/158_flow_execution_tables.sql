-- ================================================
-- 158: Flow Execution Tables
-- ================================================
-- Adds automation_schema column to coach_flows,
-- creates flow_executions table for tracking active
-- flow runs, and flow_execution_log for audit trail.
-- ================================================

-- ============================================================================
-- 1. Add automation_schema column to coach_flows
-- ============================================================================
ALTER TABLE public.coach_flows
  ADD COLUMN IF NOT EXISTS automation_schema JSONB;

-- ============================================================================
-- 2. flow_executions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.flow_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id           UUID,
  coach_id          UUID NOT NULL,
  client_id         UUID NOT NULL,
  automation_schema JSONB NOT NULL,
  current_action_id TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'waiting', 'completed', 'cancelled', 'failed')),
  wait_until        TIMESTAMPTZ,
  trigger_type      TEXT NOT NULL,
  trigger_context   JSONB,
  trigger_key       TEXT NOT NULL,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_fe_flow  FOREIGN KEY (flow_id)  REFERENCES public.coach_flows(id) ON DELETE SET NULL,
  CONSTRAINT fk_fe_coach  FOREIGN KEY (coach_id)  REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fe_client FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Partial unique index: prevent duplicate active executions for same trigger
CREATE UNIQUE INDEX IF NOT EXISTS idx_fe_trigger_key_active
  ON public.flow_executions (trigger_key)
  WHERE status NOT IN ('completed', 'cancelled', 'failed');

-- Index for the processor cron to find work
CREATE INDEX IF NOT EXISTS idx_fe_status_wait
  ON public.flow_executions (status, wait_until)
  WHERE status IN ('pending', 'waiting');

-- Index for flow-level queries
CREATE INDEX IF NOT EXISTS idx_fe_flow_status
  ON public.flow_executions (flow_id, status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_flow_executions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flow_executions_updated_at ON public.flow_executions;
CREATE TRIGGER trg_flow_executions_updated_at
  BEFORE UPDATE ON public.flow_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_flow_executions_updated_at();

-- ============================================================================
-- 3. flow_execution_log table (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.flow_execution_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  UUID NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  action_id     TEXT NOT NULL,
  action_type   TEXT NOT NULL,
  result        TEXT,
  error_message TEXT,
  executed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fel_execution
  ON public.flow_execution_log (execution_id, executed_at);

-- ============================================================================
-- 4. RLS
-- ============================================================================
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_execution_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "fe_service" ON public.flow_executions;
CREATE POLICY "fe_service" ON public.flow_executions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fel_service" ON public.flow_execution_log;
CREATE POLICY "fel_service" ON public.flow_execution_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read their own
DROP POLICY IF EXISTS "fe_auth_read" ON public.flow_executions;
CREATE POLICY "fe_auth_read" ON public.flow_executions
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR client_id = auth.uid());

DROP POLICY IF EXISTS "fel_auth_read" ON public.flow_execution_log;
CREATE POLICY "fel_auth_read" ON public.flow_execution_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flow_executions fe
      WHERE fe.id = execution_id
        AND (fe.coach_id = auth.uid() OR fe.client_id = auth.uid())
    )
  );

-- ============================================================================
-- 5. Permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_executions TO service_role;
GRANT SELECT ON public.flow_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_execution_log TO service_role;
GRANT SELECT ON public.flow_execution_log TO authenticated;
