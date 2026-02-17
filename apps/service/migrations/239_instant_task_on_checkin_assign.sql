-- ================================================
-- 239: Create task immediately when a check-in is assigned
-- ================================================
-- When a coach assigns a check-in (INSERT with status='live') or
-- publishes a draft (UPDATE status → 'live'), check if the schedule
-- means it is due today. If so, insert a task row immediately so the
-- client does not have to wait for the next cron run (up to 30 min).
--
-- Uses the same timezone-resolution and schedule-matching logic as
-- generate_daily_client_tasks() (migration 146). The unique constraint
-- + ON CONFLICT DO NOTHING prevents duplicates if the cron also runs.
-- ================================================

CREATE OR REPLACE FUNCTION public.trg_create_task_on_checkin_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_client_tz  TEXT;
    v_coach_tz   TEXT;
    v_tz         TEXT;
    v_today      DATE;
    v_dow_name   TEXT;
    v_dom        INTEGER;   -- day of month
    v_dim        INTEGER;   -- days in month
    v_is_due     BOOLEAN := FALSE;
BEGIN
    -- Only proceed if check-in is live with a schedule
    IF NEW.status != 'live' OR NEW.schedule_config IS NULL THEN
        RETURN NEW;
    END IF;

    -- For UPDATE, only fire when status just changed to 'live'
    IF TG_OP = 'UPDATE' AND OLD.status = 'live' THEN
        RETURN NEW;
    END IF;

    -- Resolve timezone: client → coach → UTC
    SELECT timezone INTO v_client_tz
      FROM public.user_profiles
     WHERE id = NEW.client_id AND user_type = 'client';

    SELECT timezone INTO v_coach_tz
      FROM public.user_profiles
     WHERE id = NEW.coach_id AND user_type = 'coach';

    v_tz    := COALESCE(v_client_tz, v_coach_tz, 'UTC');
    v_today := (NOW() AT TIME ZONE v_tz)::date;

    v_dow_name := lower(to_char(v_today, 'fmday'));
    v_dom      := EXTRACT(DAY FROM v_today)::INTEGER;
    v_dim      := EXTRACT(DAY FROM (date_trunc('month', v_today)
                                    + INTERVAL '1 month - 1 day'))::INTEGER;

    -- Evaluate schedule (mirrors generate_daily_client_tasks logic)
    IF NEW.schedule_config->>'frequency' = 'daily' THEN
        v_is_due := TRUE;

    ELSIF NEW.schedule_config->>'frequency' = 'weekly'
          AND NEW.schedule_config->'selectedDays' ? v_dow_name THEN
        v_is_due := TRUE;

    ELSIF NEW.schedule_config->>'frequency' = 'biweekly'
          AND NEW.schedule_config->'selectedDays' ? v_dow_name THEN
        -- Week parity check (week 0 from created_at is always due)
        IF FLOOR(EXTRACT(EPOCH FROM (v_today - NEW.created_at::date))
                 / 604800)::INTEGER % 2 = 0 THEN
            v_is_due := TRUE;
        END IF;

    ELSIF NEW.schedule_config->>'frequency' = 'monthly' THEN
        IF (NEW.schedule_config->>'monthlyOption' = 'first'    AND v_dom = 1)
        OR (NEW.schedule_config->>'monthlyOption' = 'last'     AND v_dom = v_dim)
        OR (NEW.schedule_config->>'monthlyOption' = 'specific'
            AND v_dom = COALESCE((NEW.schedule_config->>'monthlyDay')::INTEGER, 1))
        THEN
            v_is_due := TRUE;
        END IF;
    END IF;

    IF v_is_due THEN
        INSERT INTO public.client_tasks
            (client_id, coach_id, task_type, reference_id, due_date)
        VALUES
            (NEW.client_id, NEW.coach_id, 'check_in', NEW.id, v_today)
        ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date)
            DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checkin_assign_create_task ON public.client_checkins;
CREATE TRIGGER trg_checkin_assign_create_task
    AFTER INSERT OR UPDATE ON public.client_checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_create_task_on_checkin_assign();
