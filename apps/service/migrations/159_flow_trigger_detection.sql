-- ================================================
-- 159: Flow Trigger Detection
-- ================================================
-- Detects trigger conditions for coach flows and creates
-- flow_executions rows. Runs every 30 minutes via pg_cron.
-- Follows the pattern from migration 143.
-- ================================================

-- ============================================================================
-- 1. Cron log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.flow_trigger_cron_log (
  id            UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  rows_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ftcl_started_at
  ON public.flow_trigger_cron_log (started_at DESC);

ALTER TABLE public.flow_trigger_cron_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ftcl_service" ON public.flow_trigger_cron_log;
CREATE POLICY "ftcl_service" ON public.flow_trigger_cron_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.flow_trigger_cron_log TO service_role;

-- ============================================================================
-- 2. Helper: extract trigger type from flow_data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_flow_trigger_type(p_flow_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_node JSONB;
BEGIN
  -- Find the trigger node in the nodes array
  FOR v_node IN SELECT jsonb_array_elements(p_flow_data->'nodes')
  LOOP
    IF v_node->>'type' = 'trigger' AND v_node->'data'->'option'->>'id' IS NOT NULL THEN
      RETURN v_node->'data'->'option'->>'id';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- ============================================================================
-- 3. Core function: detect_flow_triggers()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.detect_flow_triggers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rows  INTEGER := 0;
  v_tmp   INTEGER;
BEGIN
  -- ── 3a. missed-check-in ───────────────────────────────────────
  -- Fires when a client_task with task_type='check_in' has due_date < client's today
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    ct.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-check-in',
    jsonb_build_object(
      'reference_id', ct.reference_id,
      'task_type', ct.task_type,
      'due_date', ct.due_date
    ),
    'missed-check-in:' || ct.client_id || ':' || ct.reference_id || ':' || ct.due_date
  FROM public.client_tasks ct
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = ct.coach_id
    AND cca.client_id = ct.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = ct.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-check-in'
  -- Timezone resolution
  LEFT JOIN public.user_profiles cup
    ON cup.id = ct.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = ct.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE ct.task_type = 'check_in'
    AND ct.due_date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3b. missed-habit-log ──────────────────────────────────────
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    ct.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-habit-log',
    jsonb_build_object(
      'reference_id', ct.reference_id,
      'task_type', ct.task_type,
      'due_date', ct.due_date
    ),
    'missed-habit-log:' || ct.client_id || ':' || ct.reference_id || ':' || ct.due_date
  FROM public.client_tasks ct
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = ct.coach_id
    AND cca.client_id = ct.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = ct.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-habit-log'
  LEFT JOIN public.user_profiles cup
    ON cup.id = ct.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = ct.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE ct.task_type = 'habit'
    AND ct.due_date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3c. missed-metric-log ─────────────────────────────────────
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    ct.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-metric-log',
    jsonb_build_object(
      'reference_id', ct.reference_id,
      'task_type', ct.task_type,
      'due_date', ct.due_date
    ),
    'missed-metric-log:' || ct.client_id || ':' || ct.reference_id || ':' || ct.due_date
  FROM public.client_tasks ct
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = ct.coach_id
    AND cca.client_id = ct.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = ct.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-metric-log'
  LEFT JOIN public.user_profiles cup
    ON cup.id = ct.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = ct.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE ct.task_type = 'metric'
    AND ct.due_date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3d. missed-workout ────────────────────────────────────────
  -- Fires when client_training_history has status='missed' within last 2 days
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    cth.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-workout',
    jsonb_build_object(
      'date', cth.date,
      'workout_id', cth.workout_id
    ),
    'missed-workout:' || cth.client_id || ':' || cth.date
  FROM public.client_training_history cth
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = cth.coach_id
    AND cca.client_id = cth.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = cth.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-workout'
  LEFT JOIN public.user_profiles cup
    ON cup.id = cth.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = cth.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE cth.status = 'missed'
    AND cth.date >= cd.client_today - 2
    AND cth.date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3e. inactive-7-days ───────────────────────────────────────
  -- Reuses the same logic as migration 147 rule 2: no activity across
  -- all tables for 7+ days. Re-triggers daily if still inactive.
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cca.coach_id,
    cca.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'inactive-7-days',
    jsonb_build_object(
      'last_activity', last_act.last_activity,
      'client_today', cd.client_today
    ),
    'inactive-7-days:' || cca.client_id || ':' || cd.client_today
  FROM public.coach_client_assignments cca
  JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
  LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  -- Find the most recent activity across all tables
  CROSS JOIN LATERAL (
    SELECT MAX(activity_date) AS last_activity
    FROM (
      SELECT cth.date AS activity_date
      FROM public.client_training_history cth
      WHERE cth.client_id = cca.client_id
        AND cth.coach_id = cca.coach_id
        AND cth.status IN ('in_progress', 'completed')
        AND cth.date >= cd.client_today - 7
      UNION ALL
      SELECT chl.date AS activity_date
      FROM public.client_habit_logs chl
      WHERE chl.client_id = cca.client_id
        AND chl.coach_id = cca.coach_id
        AND chl.date >= cd.client_today - 7
      UNION ALL
      SELECT cml.date AS activity_date
      FROM public.client_metric_logs cml
      WHERE cml.client_id = cca.client_id
        AND cml.coach_id = cca.coach_id
        AND cml.date >= cd.client_today - 7
      UNION ALL
      SELECT ccl.submission_date AS activity_date
      FROM public.client_checkin_logs ccl
      WHERE ccl.client_id = cca.client_id
        AND ccl.coach_id = cca.coach_id
        AND ccl.submission_date >= cd.client_today - 7
    ) all_activity
  ) last_act
  JOIN public.coach_flows cf
    ON cf.coach_id = cca.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'inactive-7-days'
  WHERE cca.is_active = true
    AND cca.is_archived = false
    AND cca.connected_at IS NOT NULL
    AND last_act.last_activity IS NULL
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_flow_triggers() TO service_role;

-- ============================================================================
-- 4. Wrapper (handles logging)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_detect_flow_triggers()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id UUID;
  v_rows   INTEGER;
BEGIN
  INSERT INTO public.flow_trigger_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  v_rows := public.detect_flow_triggers();

  UPDATE public.flow_trigger_cron_log
  SET completed_at = now(),
      rows_inserted = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'detect_flow_triggers: created % executions', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  UPDATE public.flow_trigger_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'detect_flow_triggers failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_detect_flow_triggers() TO service_role;

-- ============================================================================
-- 5. pg_cron schedule: every 30 minutes at :15 and :45
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('detect-flow-triggers');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'detect-flow-triggers',
      '15,45 * * * *',
      'SELECT public.trigger_detect_flow_triggers()'
    );

    RAISE NOTICE 'Cron job scheduled: detect-flow-triggers every 30 minutes';
  ELSE
    RAISE NOTICE 'pg_cron not available. Run manually:';
    RAISE NOTICE 'SELECT cron.schedule(''detect-flow-triggers'', ''15,45 * * * *'', ''SELECT public.trigger_detect_flow_triggers()'')';
  END IF;
END;
$$;

-- ============================================================================
-- 6. Cleanup: auto-delete log entries older than 30 days
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_flow_trigger_logs(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.flow_trigger_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
