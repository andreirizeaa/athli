-- ================================================
-- Fix: prevent task regeneration after completion
-- ================================================
-- The generate_daily_client_tasks() cron creates tasks for today but doesn't
-- check if a log already exists. When a client completes a task (log inserted,
-- task deleted), the next cron run re-creates it. Fix: add NOT EXISTS checks
-- against the relevant log tables so completed items don't get new tasks.

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
    -- ── Check-ins (status = 'live') ──────────────────────────
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
          (ci.schedule_config->>'frequency' = 'daily')
          OR (
              ci.schedule_config->>'frequency' = 'weekly'
              AND ci.schedule_config->'selectedDays' ? dp.dow_name
          )
          OR (
              ci.schedule_config->>'frequency' = 'biweekly'
              AND ci.schedule_config->'selectedDays' ? dp.dow_name
              AND (
                  FLOOR(EXTRACT(EPOCH FROM (cd.client_today - ci.created_at::date)) / 604800)::INTEGER % 2 = 0
              )
          )
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
      -- Skip if already completed today
      AND NOT EXISTS (
          SELECT 1 FROM public.client_checkin_logs ccl
          WHERE ccl.assignment_id = ci.id
            AND ccl.client_id = ci.client_id
            AND ccl.submission_date = cd.client_today
      )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Metrics (scheduled) ──────────────────────────────────
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
      -- Skip if already logged today
      AND NOT EXISTS (
          SELECT 1 FROM public.client_metric_logs cml
          WHERE cml.assignment_id = m.id
            AND cml.client_id = m.client_id
            AND cml.date = cd.client_today
      )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Habits ───────────────────────────────────────────────
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
        -- Skip if already logged today
        AND NOT EXISTS (
            SELECT 1 FROM public.client_habit_logs chl
            WHERE chl.assignment_id = h.id
              AND chl.client_id = h.client_id
              AND chl.date = cd.client_today
        )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- NOTE: Questionnaires are handled by a trigger (see section 5 of migration 146),
    -- not by this cron function.

    RETURN v_rows;
END;
$$;
