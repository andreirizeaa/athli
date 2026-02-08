-- ================================================
-- 146: Client Tasks – daily to-do list via pg_cron
-- ================================================
-- A materialised to-do list for clients. A pg_cron job runs hourly,
-- resolves each client's timezone (client → coach → UTC), computes
-- their local "today", and inserts a task row for each assignment due
-- that day. The unique constraint + ON CONFLICT DO NOTHING makes it
-- fully idempotent – subsequent hourly runs are no-ops for clients
-- whose tasks were already created. Uncompleted tasks persist
-- indefinitely. When a client completes something the matching task
-- row is hard-deleted via DB triggers.
-- ================================================

-- ============================================================================
-- 1. Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.client_tasks (
    id            UUID DEFAULT gen_random_uuid() NOT NULL,
    client_id     UUID NOT NULL,
    coach_id      UUID NOT NULL,
    task_type     TEXT NOT NULL,
    reference_id  UUID NOT NULL,
    due_date      DATE NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT client_tasks_pkey PRIMARY KEY (client_id, coach_id, id),
    CONSTRAINT client_tasks_type_check CHECK (
        task_type IN ('check_in', 'metric', 'habit', 'questionnaire')
    ),
    CONSTRAINT client_tasks_unique UNIQUE (client_id, coach_id, task_type, reference_id, due_date)
);

ALTER TABLE public.client_tasks OWNER TO postgres;
ALTER TABLE public.client_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_all" ON public.client_tasks;
CREATE POLICY "ct_all" ON public.client_tasks
    TO authenticated
    USING  ((client_id = auth.uid()) OR (coach_id = auth.uid()))
    WITH CHECK ((client_id = auth.uid()) OR (coach_id = auth.uid()));

-- Service role full access
DROP POLICY IF EXISTS "ct_service" ON public.client_tasks;
CREATE POLICY "ct_service" ON public.client_tasks
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_client_tasks_client_due   ON public.client_tasks (client_id, due_date);
CREATE INDEX IF NOT EXISTS idx_client_tasks_coach_client ON public.client_tasks (coach_id, client_id);

-- ============================================================================
-- 3. Core function: generate_daily_client_tasks()
-- ============================================================================
-- Timezone resolution (same as mark_missed_workouts):
--   1. Client's own timezone  (user_profiles WHERE user_type='client')
--   2. Coach's timezone       (user_profiles WHERE user_type='coach')
--   3. 'UTC' fallback
--
-- Each query computes the client's local "today" per-row via LATERAL,
-- then evaluates the schedule against that date. The unique constraint
-- + ON CONFLICT DO NOTHING keeps it idempotent across hourly runs.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_daily_client_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_rows  INTEGER := 0;
    v_tmp   INTEGER;
BEGIN
    -- ── 3a. Check-ins (status = 'live') ──────────────────────────
    INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
    SELECT
        ci.client_id,
        ci.coach_id,
        'check_in',
        ci.id,
        cd.client_today
    FROM public.client_checkins ci
    LEFT JOIN public.user_profiles cup
        ON cup.id = ci.client_id AND cup.user_type = 'client'
    LEFT JOIN public.user_profiles coup
        ON coup.id = ci.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
    ) cd
    CROSS JOIN LATERAL (
        SELECT
            lower(to_char(cd.client_today, 'fmday'))  AS dow_name,
            EXTRACT(DAY FROM cd.client_today)::INTEGER AS day_of_month,
            EXTRACT(DAY FROM (date_trunc('month', cd.client_today) + INTERVAL '1 month - 1 day'))::INTEGER AS days_in_month
    ) dp
    WHERE ci.status = 'live'
      AND ci.schedule_config IS NOT NULL
      AND (
          -- daily
          (ci.schedule_config->>'frequency' = 'daily')
          -- weekly: client's day name is in selectedDays
          OR (
              ci.schedule_config->>'frequency' = 'weekly'
              AND ci.schedule_config->'selectedDays' ? dp.dow_name
          )
          -- biweekly: correct day AND correct week parity
          OR (
              ci.schedule_config->>'frequency' = 'biweekly'
              AND ci.schedule_config->'selectedDays' ? dp.dow_name
              AND (
                  FLOOR(EXTRACT(EPOCH FROM (cd.client_today - ci.created_at::date)) / 604800)::INTEGER % 2 = 0
              )
          )
          -- monthly
          OR (
              ci.schedule_config->>'frequency' = 'monthly'
              AND (
                  (ci.schedule_config->>'monthlyOption' = 'first'    AND dp.day_of_month = 1)
                  OR (ci.schedule_config->>'monthlyOption' = 'last'  AND dp.day_of_month = dp.days_in_month)
                  OR (
                      ci.schedule_config->>'monthlyOption' = 'specific'
                      AND dp.day_of_month = COALESCE((ci.schedule_config->>'monthlyDay')::INTEGER, 1)
                  )
              )
          )
      )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── 3b. Metrics (cron_expression IS NOT NULL = scheduled) ────
    INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
    SELECT
        m.client_id,
        m.coach_id,
        'metric',
        m.id,
        cd.client_today
    FROM public.client_metrics m
    LEFT JOIN public.user_profiles cup
        ON cup.id = m.client_id AND cup.user_type = 'client'
    LEFT JOIN public.user_profiles coup
        ON coup.id = m.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
    ) cd
    CROSS JOIN LATERAL (
        SELECT
            lower(to_char(cd.client_today, 'fmday'))  AS dow_name,
            EXTRACT(DAY FROM cd.client_today)::INTEGER AS day_of_month,
            EXTRACT(DAY FROM (date_trunc('month', cd.client_today) + INTERVAL '1 month - 1 day'))::INTEGER AS days_in_month
    ) dp
    WHERE m.cron_expression IS NOT NULL
      AND m.schedule_config IS NOT NULL
      AND (
          (m.schedule_config->>'frequency' = 'daily')
          OR (
              m.schedule_config->>'frequency' = 'weekly'
              AND m.schedule_config->'selectedDays' ? dp.dow_name
          )
          OR (
              m.schedule_config->>'frequency' = 'biweekly'
              AND m.schedule_config->'selectedDays' ? dp.dow_name
              AND (
                  FLOOR(EXTRACT(EPOCH FROM (cd.client_today - m.created_at::date)) / 604800)::INTEGER % 2 = 0
              )
          )
          OR (
              m.schedule_config->>'frequency' = 'monthly'
              AND (
                  (m.schedule_config->>'monthlyOption' = 'first'    AND dp.day_of_month = 1)
                  OR (m.schedule_config->>'monthlyOption' = 'last'  AND dp.day_of_month = dp.days_in_month)
                  OR (
                      m.schedule_config->>'monthlyOption' = 'specific'
                      AND dp.day_of_month = COALESCE((m.schedule_config->>'monthlyDay')::INTEGER, 1)
                  )
              )
          )
      )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── 3c. Habits ───────────────────────────────────────────────
    INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
    SELECT
        h.client_id,
        h.coach_id,
        'habit',
        h.id,
        cd.client_today
    FROM public.client_habits h
    LEFT JOIN public.user_profiles cup
        ON cup.id = h.client_id AND cup.user_type = 'client'
    LEFT JOIN public.user_profiles coup
        ON coup.id = h.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
    ) cd
    CROSS JOIN LATERAL (
        SELECT
            EXTRACT(ISODOW FROM cd.client_today)::INTEGER AS dow_iso
    ) dp
    WHERE
        -- Respect date range
        (h.start_date IS NULL OR h.start_date <= cd.client_today)
        AND (h.end_date IS NULL OR h.end_date >= cd.client_today)
        AND (
            h.schedule_type = 'daily'
            OR (
                h.schedule_type = 'weekly'
                AND h.days_of_week IS NOT NULL
                AND dp.dow_iso = ANY(h.days_of_week)
            )
        )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- NOTE: Questionnaires are handled by a trigger (see section 5),
    -- not by this cron function.

    RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_client_tasks() TO service_role;

-- ============================================================================
-- 4. pg_cron schedule – runs hourly (covers all timezones)
-- ============================================================================
-- Runs every 30 minutes (covers half-hour timezones like UTC+5:30,
-- UTC+5:45, etc.). Each run computes each client's local "today" and
-- inserts tasks. ON CONFLICT DO NOTHING means once a client's tasks
-- are created for a given day, subsequent runs are no-ops.
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if present
        BEGIN
            PERFORM cron.unschedule('generate-daily-client-tasks');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        PERFORM cron.schedule(
            'generate-daily-client-tasks',
            '5,35 * * * *',
            'SELECT public.generate_daily_client_tasks()'
        );

        RAISE NOTICE 'Cron job scheduled: generate-daily-client-tasks every 30 minutes';
    ELSE
        RAISE NOTICE 'pg_cron not available. Run manually:';
        RAISE NOTICE 'SELECT cron.schedule(''generate-daily-client-tasks'', ''5,35 * * * *'', ''SELECT public.generate_daily_client_tasks()'')';
    END IF;
END;
$$;

-- ============================================================================
-- 5. Questionnaire trigger – insert task on pending status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_questionnaire_task_on_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
        VALUES (NEW.client_id, NEW.coach_id, 'questionnaire', NEW.id, CURRENT_DATE)
        ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_questionnaire_pending ON public.client_questionnaires;
CREATE TRIGGER trg_questionnaire_pending
    AFTER INSERT OR UPDATE ON public.client_questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_questionnaire_task_on_pending();

-- ============================================================================
-- 6. Completion triggers – delete task on completion
-- ============================================================================

-- ── 6a. Check-in submitted (status = 'review') ──────────────────
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
          AND coach_id     = NEW.coach_id
          AND due_date     = NEW.submission_date;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checkin_log_complete_task ON public.client_checkin_logs;
CREATE TRIGGER trg_checkin_log_complete_task
    AFTER INSERT ON public.client_checkin_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_task_on_checkin_submit();

-- ── 6b. Metric logged ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_delete_task_on_metric_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM public.client_tasks
    WHERE task_type    = 'metric'
      AND reference_id = NEW.assignment_id
      AND client_id    = NEW.client_id
      AND coach_id     = NEW.coach_id
      AND due_date     = NEW.date;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_metric_log_complete_task ON public.client_metric_logs;
CREATE TRIGGER trg_metric_log_complete_task
    AFTER INSERT OR UPDATE ON public.client_metric_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_task_on_metric_log();

-- ── 6c. Habit logged (completed or partial) ─────────────────────
CREATE OR REPLACE FUNCTION public.trg_delete_task_on_habit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.status IN ('completed', 'partial') THEN
        DELETE FROM public.client_tasks
        WHERE task_type    = 'habit'
          AND reference_id = NEW.assignment_id
          AND client_id    = NEW.client_id
          AND coach_id     = NEW.coach_id
          AND due_date     = NEW.date;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_habit_log_complete_task ON public.client_habit_logs;
CREATE TRIGGER trg_habit_log_complete_task
    AFTER INSERT OR UPDATE ON public.client_habit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_task_on_habit_log();

-- ── 6d. Questionnaire completed ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_delete_task_on_questionnaire_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        DELETE FROM public.client_tasks
        WHERE task_type    = 'questionnaire'
          AND reference_id = NEW.id
          AND client_id    = NEW.client_id
          AND coach_id     = NEW.coach_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_questionnaire_complete_task ON public.client_questionnaires;
CREATE TRIGGER trg_questionnaire_complete_task
    AFTER UPDATE ON public.client_questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_task_on_questionnaire_complete();

-- ============================================================================
-- 7. Assignment deletion triggers – cascade cleanup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_delete_tasks_on_assignment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM public.client_tasks
    WHERE reference_id = OLD.id
      AND client_id    = OLD.client_id
      AND coach_id     = OLD.coach_id;
    RETURN OLD;
END;
$$;

-- client_checkins
DROP TRIGGER IF EXISTS trg_checkin_delete_tasks ON public.client_checkins;
CREATE TRIGGER trg_checkin_delete_tasks
    AFTER DELETE ON public.client_checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

-- client_metrics
DROP TRIGGER IF EXISTS trg_metric_delete_tasks ON public.client_metrics;
CREATE TRIGGER trg_metric_delete_tasks
    AFTER DELETE ON public.client_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

-- client_habits
DROP TRIGGER IF EXISTS trg_habit_delete_tasks ON public.client_habits;
CREATE TRIGGER trg_habit_delete_tasks
    AFTER DELETE ON public.client_habits
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

-- client_questionnaires
DROP TRIGGER IF EXISTS trg_questionnaire_delete_tasks ON public.client_questionnaires;
CREATE TRIGGER trg_questionnaire_delete_tasks
    AFTER DELETE ON public.client_questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

-- ============================================================================
-- 8. Permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tasks TO authenticated;
