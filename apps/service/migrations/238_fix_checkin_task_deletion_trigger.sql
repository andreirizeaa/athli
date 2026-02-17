-- ================================================
-- 238: Fix check-in task deletion trigger
-- ================================================
-- Two fixes:
--
-- 1. Timezone mismatch: The trigger previously compared
--    due_date = NEW.submission_date. However, due_date is set using
--    the client's local timezone (via generate_daily_client_tasks),
--    while submission_date is recorded in UTC. When the dates differ,
--    the DELETE matched nothing. Fix: drop the date comparison — the
--    remaining columns uniquely identify the active task(s).
--
-- 2. Status check: Accept both 'review' and 'completed' so the
--    trigger fires regardless of which status the controller sends.
-- ================================================

CREATE OR REPLACE FUNCTION public.trg_delete_task_on_checkin_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.status IN ('review', 'completed') THEN
        DELETE FROM public.client_tasks
        WHERE task_type    = 'check_in'
          AND reference_id = NEW.assignment_id
          AND client_id    = NEW.client_id
          AND coach_id     = NEW.coach_id;
    END IF;
    RETURN NEW;
END;
$$;
