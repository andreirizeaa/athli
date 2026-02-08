-- ================================================
-- 160: Flow Execution Engine
-- ================================================
-- Action executor helper functions (mirroring onboarding-executor.service.ts),
-- check condition evaluator, and the core process_flow_executions() function
-- that walks automation_schema actions. Runs every 5 minutes via pg_cron.
-- ================================================

-- ============================================================================
-- 1. Cron log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.flow_execution_cron_log (
  id            UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  rows_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fecl_started_at
  ON public.flow_execution_cron_log (started_at DESC);

ALTER TABLE public.flow_execution_cron_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fecl_service" ON public.flow_execution_cron_log;
CREATE POLICY "fecl_service" ON public.flow_execution_cron_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.flow_execution_cron_log TO service_role;

-- ============================================================================
-- 2a. Action: send message
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_flow_send_message(
  p_coach_id UUID,
  p_client_id UUID,
  p_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE coach_id = p_coach_id
    AND client_id = p_client_id
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    RAISE WARNING 'execute_flow_send_message: no conversation for coach=% client=%', p_coach_id, p_client_id;
    RETURN;
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, message_type, status)
  VALUES (v_conversation_id, p_coach_id, p_message, 'text', 'sent');
END;
$$;

-- ============================================================================
-- 2b. Action: assign questionnaires
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_flow_assign_questionnaires(
  p_coach_id UUID,
  p_client_id UUID,
  p_ids JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.client_questionnaires (client_id, coach_id, name, description, questions, status, sent_at)
  SELECT
    p_client_id,
    p_coach_id,
    t.name,
    t.description,
    COALESCE(t.questions, '[]'::jsonb),
    'pending',
    now()
  FROM public.coach_questionnaires t
  WHERE t.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND t.coach_id = p_coach_id;
END;
$$;

-- ============================================================================
-- 2c. Action: assign check-ins
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_flow_assign_checkins(
  p_coach_id UUID,
  p_client_id UUID,
  p_ids JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.client_checkins (client_id, coach_id, name, description, questions, schedule_config, cron_expression, status)
  SELECT
    p_client_id,
    p_coach_id,
    t.name,
    t.description,
    COALESCE(t.questions, '[]'::jsonb),
    t.schedule_config,
    t.cron_expression,
    CASE
      WHEN t.questions IS NOT NULL AND jsonb_array_length(t.questions) > 0 THEN 'live'
      ELSE 'draft'
    END
  FROM public.coach_checkins t
  WHERE t.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND t.coach_id = p_coach_id;
END;
$$;

-- ============================================================================
-- 2d. Action: add files
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_flow_add_files(
  p_coach_id UUID,
  p_client_id UUID,
  p_ids JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.client_files (client_id, coach_id, filename, display_name, file_path, mime_type, size)
  SELECT
    p_client_id,
    p_coach_id,
    f.filename,
    f.filename,
    f.file_path,
    f.mime_type,
    f.size
  FROM public.coach_files f
  WHERE f.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND f.coach_id = p_coach_id;
END;
$$;

-- ============================================================================
-- 2e. Action: add habits
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_flow_add_habits(
  p_coach_id UUID,
  p_client_id UUID,
  p_ids JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.client_habits (
    client_id, coach_id, name, description, schedule_type,
    days_of_week, times_of_day, timezone, start_date, end_date,
    schedule_config, amount, unit, period
  )
  SELECT
    p_client_id,
    p_coach_id,
    h.name,
    h.description,
    h.schedule_type,
    h.days_of_week,
    h.times_of_day,
    h.timezone,
    h.start_date,
    h.end_date,
    h.schedule_config,
    (h.schedule_config->>'amount')::numeric,
    h.schedule_config->>'unit',
    COALESCE(h.schedule_config->>'period', h.schedule_type)
  FROM public.coach_habits h
  WHERE h.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND h.coach_id = p_coach_id;
END;
$$;

-- ============================================================================
-- 2f. Action: add metrics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_flow_add_metrics(
  p_coach_id UUID,
  p_client_id UUID,
  p_ids JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.client_metrics (
    client_id, coach_id, name, unit, description,
    value_kind, min_value, max_value, cron_expression, schedule_config
  )
  SELECT
    p_client_id,
    p_coach_id,
    m.name,
    m.unit,
    m.description,
    m.value_kind,
    m.min_value,
    m.max_value,
    m.cron_expression,
    m.schedule_config
  FROM public.coach_metrics m
  WHERE m.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND m.coach_id = p_coach_id;
END;
$$;

-- ============================================================================
-- 3. Check condition evaluator
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_flow_condition(
  p_trigger_type TEXT,
  p_trigger_context JSONB,
  p_client_id UUID,
  p_coach_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ref_id  UUID;
  v_due     DATE;
  v_found   BOOLEAN;
BEGIN
  v_ref_id := (p_trigger_context->>'reference_id')::uuid;
  v_due    := (p_trigger_context->>'due_date')::date;

  CASE p_trigger_type
    WHEN 'missed-check-in' THEN
      -- Check if a check-in log exists for this assignment on the due date
      SELECT EXISTS(
        SELECT 1 FROM public.client_checkin_logs
        WHERE assignment_id = v_ref_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND submission_date = v_due
      ) INTO v_found;

    WHEN 'missed-habit-log' THEN
      -- Check if a habit log exists with completed or partial status
      SELECT EXISTS(
        SELECT 1 FROM public.client_habit_logs
        WHERE assignment_id = v_ref_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND date = v_due
          AND status IN ('completed', 'partial')
      ) INTO v_found;

    WHEN 'missed-metric-log' THEN
      -- Check if a metric log exists for this assignment on the due date
      SELECT EXISTS(
        SELECT 1 FROM public.client_metric_logs
        WHERE assignment_id = v_ref_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND date = v_due
      ) INTO v_found;

    ELSE
      -- Unknown trigger type, default to false (follow NO branch)
      v_found := false;
  END CASE;

  RETURN v_found;
END;
$$;

-- ============================================================================
-- 4. Core function: process_flow_executions()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_flow_executions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_processed INTEGER := 0;
  v_exec      RECORD;
  v_action    JSONB;
  v_action_type TEXT;
  v_payload   JSONB;
  v_next_id   TEXT;
  v_yes_id    TEXT;
  v_no_id     TEXT;
  v_check_result BOOLEAN;
  v_action_id TEXT;
  v_max_steps INTEGER := 50;  -- safety limit per execution
  v_step      INTEGER;
BEGIN
  -- Pick up executions ready to process
  FOR v_exec IN
    SELECT *
    FROM public.flow_executions
    WHERE (status = 'pending' AND current_action_id IS NOT NULL)
       OR (status = 'waiting' AND wait_until <= NOW())
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;
    v_action_id := v_exec.current_action_id;
    v_step := 0;

    -- Mark as started if new
    IF v_exec.started_at IS NULL THEN
      UPDATE public.flow_executions
      SET started_at = now(), status = 'pending'
      WHERE id = v_exec.id;
    END IF;

    -- If resuming from wait, change status back to pending
    IF v_exec.status = 'waiting' THEN
      UPDATE public.flow_executions
      SET status = 'pending', wait_until = NULL
      WHERE id = v_exec.id;
    END IF;

    <<action_loop>>
    LOOP
      v_step := v_step + 1;
      IF v_step > v_max_steps THEN
        UPDATE public.flow_executions
        SET status = 'failed', error_message = 'Max steps exceeded'
        WHERE id = v_exec.id;
        INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result, error_message)
        VALUES (v_exec.id, COALESCE(v_action_id, 'unknown'), 'unknown', 'error', 'Max steps exceeded');
        EXIT action_loop;
      END IF;

      -- No more actions = flow complete
      IF v_action_id IS NULL THEN
        UPDATE public.flow_executions
        SET status = 'completed', completed_at = now(), current_action_id = NULL
        WHERE id = v_exec.id;
        EXIT action_loop;
      END IF;

      -- Look up the action in automation_schema
      v_action := v_exec.automation_schema->'actions'->v_action_id;

      IF v_action IS NULL THEN
        UPDATE public.flow_executions
        SET status = 'completed', completed_at = now(), current_action_id = NULL
        WHERE id = v_exec.id;
        INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
        VALUES (v_exec.id, v_action_id, 'unknown', 'skipped');
        EXIT action_loop;
      END IF;

      v_action_type := v_action->>'type';
      v_next_id := v_action->>'nextId';

      BEGIN
        CASE v_action_type
          -- ── Wait node ───────────────────────────────────────────
          WHEN 'wait' THEN
            DECLARE
              v_wait_minutes INTEGER;
            BEGIN
              v_wait_minutes := COALESCE((v_action->>'payload')::integer, 60);
              UPDATE public.flow_executions
              SET status = 'waiting',
                  wait_until = NOW() + (v_wait_minutes || ' minutes')::interval,
                  current_action_id = v_next_id
              WHERE id = v_exec.id;
              INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
              VALUES (v_exec.id, v_action_id, 'wait', 'success');
              EXIT action_loop;  -- Stop processing, will resume after wait
            END;

          -- ── Check node ──────────────────────────────────────────
          WHEN 'check' THEN
            v_yes_id := v_action->>'yesId';
            v_no_id  := v_action->>'noId';
            v_check_result := public.check_flow_condition(
              v_exec.trigger_type,
              v_exec.trigger_context,
              v_exec.client_id,
              v_exec.coach_id
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'check',
              CASE WHEN v_check_result THEN 'yes' ELSE 'no' END);

            IF v_check_result THEN
              v_action_id := v_yes_id;
            ELSE
              v_action_id := v_no_id;
            END IF;
            -- Update current position
            UPDATE public.flow_executions
            SET current_action_id = v_action_id
            WHERE id = v_exec.id;
            CONTINUE action_loop;

          -- ── Send message ────────────────────────────────────────
          WHEN 'send-message' THEN
            PERFORM public.execute_flow_send_message(
              v_exec.coach_id, v_exec.client_id, v_action->>'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'send-message', 'success');

          -- ── Assign questionnaires ───────────────────────────────
          WHEN 'assign-questionnaire' THEN
            PERFORM public.execute_flow_assign_questionnaires(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'assign-questionnaire', 'success');

          -- ── Assign check-ins ────────────────────────────────────
          WHEN 'assign-check-in' THEN
            PERFORM public.execute_flow_assign_checkins(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'assign-check-in', 'success');

          -- ── Add files ───────────────────────────────────────────
          WHEN 'add-file' THEN
            PERFORM public.execute_flow_add_files(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'add-file', 'success');

          -- ── Add habits ──────────────────────────────────────────
          WHEN 'add-habit' THEN
            PERFORM public.execute_flow_add_habits(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'add-habit', 'success');

          -- ── Add metrics ─────────────────────────────────────────
          WHEN 'add-metric' THEN
            PERFORM public.execute_flow_add_metrics(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'add-metric', 'success');

          ELSE
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, v_action_type, 'skipped');
        END CASE;

        -- Advance to next action
        v_action_id := v_next_id;
        UPDATE public.flow_executions
        SET current_action_id = v_action_id
        WHERE id = v_exec.id;

      EXCEPTION WHEN OTHERS THEN
        -- Log the error and fail the execution
        UPDATE public.flow_executions
        SET status = 'failed',
            error_message = SQLERRM,
            current_action_id = v_action_id
        WHERE id = v_exec.id;
        INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result, error_message)
        VALUES (v_exec.id, v_action_id, COALESCE(v_action_type, 'unknown'), 'error', SQLERRM);
        EXIT action_loop;
      END;
    END LOOP;
  END LOOP;

  RETURN v_processed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_flow_executions() TO service_role;

-- ============================================================================
-- 5. Wrapper (handles logging)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_process_flow_executions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id UUID;
  v_rows   INTEGER;
BEGIN
  INSERT INTO public.flow_execution_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  v_rows := public.process_flow_executions();

  UPDATE public.flow_execution_cron_log
  SET completed_at = now(),
      rows_processed = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'process_flow_executions: processed % executions', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  UPDATE public.flow_execution_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'process_flow_executions failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_process_flow_executions() TO service_role;

-- ============================================================================
-- 6. pg_cron schedule: every 5 minutes
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('process-flow-executions');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'process-flow-executions',
      '*/5 * * * *',
      'SELECT public.trigger_process_flow_executions()'
    );

    RAISE NOTICE 'Cron job scheduled: process-flow-executions every 5 minutes';
  ELSE
    RAISE NOTICE 'pg_cron not available. Run manually:';
    RAISE NOTICE 'SELECT cron.schedule(''process-flow-executions'', ''*/5 * * * *'', ''SELECT public.trigger_process_flow_executions()'')';
  END IF;
END;
$$;

-- ============================================================================
-- 7. Permissions for action executor functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.execute_flow_send_message(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_flow_assign_questionnaires(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_flow_assign_checkins(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_flow_add_files(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_flow_add_habits(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_flow_add_metrics(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_flow_condition(TEXT, JSONB, UUID, UUID) TO service_role;

-- ============================================================================
-- 8. Cleanup: auto-delete log entries older than 30 days
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_flow_execution_logs(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_tmp     INTEGER;
BEGIN
  -- Delete old cron logs
  DELETE FROM public.flow_execution_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted := v_deleted + v_tmp;

  -- Delete old execution logs (for completed/failed/cancelled executions)
  DELETE FROM public.flow_execution_log
  WHERE execution_id IN (
    SELECT id FROM public.flow_executions
    WHERE status IN ('completed', 'failed', 'cancelled')
      AND created_at < now() - (p_retention_days || ' days')::INTERVAL
  );
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted := v_deleted + v_tmp;

  -- Delete old completed executions
  DELETE FROM public.flow_executions
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND created_at < now() - (p_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted := v_deleted + v_tmp;

  RETURN v_deleted;
END;
$$;
