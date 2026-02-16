-- ================================================
-- 235: Add Event-Driven Flow Triggers
-- ================================================
-- check-in-completed and workout-finished flows are event-driven
-- (not cron-based). These DB triggers fire immediately when the
-- relevant event occurs and create flow_executions rows.
-- ================================================

-- ============================================================================
-- A. trigger_flow_on_checkin_completed()
-- ============================================================================
-- Fires on INSERT to client_checkin_logs WHERE status = 'review'.
-- Looks up active coach_flows with trigger type 'check-in-completed'
-- and creates a flow_execution for each matching flow.

CREATE OR REPLACE FUNCTION public.trigger_flow_on_checkin_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flow RECORD;
  v_trigger_key TEXT;
BEGIN
  -- Only fire when a check-in is submitted for review
  IF NEW.status <> 'review' THEN
    RETURN NEW;
  END IF;

  -- Find all active flows with check-in-completed trigger for this coach
  FOR v_flow IN
    SELECT cf.id AS flow_id, cf.coach_id, cf.automation_schema
    FROM public.coach_flows cf
    WHERE cf.coach_id = NEW.coach_id
      AND cf.is_active = true
      AND cf.automation_schema IS NOT NULL
      AND cf.automation_schema->'trigger'->>'type' = 'check-in-completed'
  LOOP
    v_trigger_key := 'check-in-completed:' || NEW.client_id || ':' || NEW.coach_checkin_id || ':' || NEW.submission_date;

    INSERT INTO public.flow_executions (
      flow_id,
      coach_id,
      client_id,
      automation_schema,
      status,
      trigger_type,
      trigger_key,
      trigger_context,
      started_at
    ) VALUES (
      v_flow.flow_id,
      v_flow.coach_id,
      NEW.client_id,
      v_flow.automation_schema,
      'pending',
      'check-in-completed',
      v_trigger_key,
      jsonb_build_object(
        'reference_id', NEW.id,
        'assignment_id', NEW.coach_checkin_id,
        'submission_date', NEW.submission_date
      ),
      now()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_flow_on_checkin_completed failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flow_checkin_completed ON public.client_checkin_logs;
CREATE TRIGGER trg_flow_checkin_completed
  AFTER INSERT ON public.client_checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_flow_on_checkin_completed();

-- ============================================================================
-- B. trigger_flow_on_workout_finished()
-- ============================================================================
-- Fires on INSERT or UPDATE to client_training_history WHERE status = 'completed'.
-- Looks up active coach_flows with trigger type 'workout-finished'
-- and creates a flow_execution for each matching flow.

CREATE OR REPLACE FUNCTION public.trigger_flow_on_workout_finished()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flow RECORD;
  v_trigger_key TEXT;
BEGIN
  -- Only fire when a workout is completed
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Skip if this is an UPDATE and old status was already completed
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Find all active flows with workout-finished trigger for this coach
  FOR v_flow IN
    SELECT cf.id AS flow_id, cf.coach_id, cf.automation_schema
    FROM public.coach_flows cf
    WHERE cf.coach_id = NEW.coach_id
      AND cf.is_active = true
      AND cf.automation_schema IS NOT NULL
      AND cf.automation_schema->'trigger'->>'type' = 'workout-finished'
  LOOP
    v_trigger_key := 'workout-finished:' || NEW.client_id || ':' || NEW.date || ':' || NEW.workout_id;

    INSERT INTO public.flow_executions (
      flow_id,
      coach_id,
      client_id,
      automation_schema,
      status,
      trigger_type,
      trigger_key,
      trigger_context,
      started_at
    ) VALUES (
      v_flow.flow_id,
      v_flow.coach_id,
      NEW.client_id,
      v_flow.automation_schema,
      'pending',
      'workout-finished',
      v_trigger_key,
      jsonb_build_object(
        'date', NEW.date,
        'workout_id', NEW.workout_id
      ),
      now()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_flow_on_workout_finished failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flow_workout_finished ON public.client_training_history;
CREATE TRIGGER trg_flow_workout_finished
  AFTER INSERT OR UPDATE ON public.client_training_history
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_flow_on_workout_finished();
