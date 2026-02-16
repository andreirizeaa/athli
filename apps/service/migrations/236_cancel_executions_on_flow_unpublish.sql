-- ================================================
-- 236: Cancel Executions on Flow Unpublish
-- ================================================
-- When a coach unpublishes (deactivates) a flow, any pending or
-- waiting executions for that flow should be cancelled automatically.
-- ================================================

CREATE OR REPLACE FUNCTION public.cancel_executions_on_flow_unpublish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when is_active transitions from true to false
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE public.flow_executions
    SET status = 'cancelled'
    WHERE flow_id = NEW.id
      AND status IN ('pending', 'waiting');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_executions_on_unpublish ON public.coach_flows;
CREATE TRIGGER trg_cancel_executions_on_unpublish
  AFTER UPDATE ON public.coach_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_executions_on_flow_unpublish();
