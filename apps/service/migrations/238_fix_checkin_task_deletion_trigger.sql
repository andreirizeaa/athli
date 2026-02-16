-- ================================================
-- 238: Fix check-in task deletion trigger (timezone mismatch)
-- ================================================
-- The trigger trg_delete_task_on_checkin_submit previously compared
-- due_date = NEW.submission_date. However, due_date is set using the
-- client's local timezone (via generate_daily_client_tasks), while
-- submission_date is recorded in UTC. When the UTC date differs from
-- the client's local date, the DELETE matched nothing and the task
-- was never removed.
--
-- Fix: remove the due_date comparison. The remaining columns
-- (task_type, reference_id, client_id, coach_id) uniquely identify
-- the active task for a given check-in assignment. The cron job only
-- generates one task per assignment per day, so there is at most one
-- matching row.
-- ================================================

CREATE OR REPLACE FUNCTION public.trg_delete_task_on_checkin_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.status = 'review' THEN
        DELETE FROM public.client_tasks
        WHERE task_type    = 'check_in'
          AND reference_id = NEW.assignment_id
          AND client_id    = NEW.client_id
          AND coach_id     = NEW.coach_id;
    END IF;
    RETURN NEW;
END;
$$;
