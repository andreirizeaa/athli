-- ================================================
-- 155: Fix EXTRACT type error in biweekly calculation
-- ================================================
-- `date - date` in PostgreSQL returns an integer (days), not an interval.
-- `EXTRACT(EPOCH FROM integer)` has no matching function signature.
-- Fix: use integer arithmetic `(days / 7) % 2` instead.
-- ================================================

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
                  ((cd.client_today - ci.created_at::date) / 7) % 2 = 0
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
                  ((cd.client_today - m.created_at::date) / 7) % 2 = 0
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
