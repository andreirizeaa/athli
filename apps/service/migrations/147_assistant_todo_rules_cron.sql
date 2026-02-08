-- ================================================
-- 147: Athli Assistant – automated coach todo rules via pg_cron
-- ================================================
-- Runs every 30 minutes. For each active client, resolves their local
-- timezone (client → coach → UTC fallback). Only processes clients
-- where it is currently between 00:00 and 00:30 in their local time
-- (i.e. start of their new day). Evaluates 9 rules and inserts any
-- findings into coach_auto_todolist. Idempotent via title+client
-- dedup check.
-- ================================================

-- ============================================================================
-- 1. Add description column to coach_auto_todolist
-- ============================================================================
ALTER TABLE public.coach_auto_todolist
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- 2. Core function: generate_assistant_todos()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_assistant_todos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_rows  INTEGER := 0;
    v_tmp   INTEGER;
BEGIN
    -- ── Rule 1: Running out of workouts ─────────────────────────────
    -- Client has had workouts before but none scheduled beyond today.
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' is running out of workouts',
        'No workouts are scheduled beyond ' ||
            to_char(COALESCE(latest.last_date, cd.client_today), 'Mon DD, YYYY') ||
            '. Consider programming their next training block.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    -- Only run at midnight window
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Check client has had workouts before
    CROSS JOIN LATERAL (
        SELECT MAX(ct.date) AS last_date
        FROM public.client_training ct
        WHERE ct.client_id = cca.client_id
          AND ct.coach_id = cca.coach_id
          AND ct.training_data != '{}'::jsonb
    ) latest
    -- Check no future workouts exist
    LEFT JOIN LATERAL (
        SELECT 1 AS has_future
        FROM public.client_training ct
        WHERE ct.client_id = cca.client_id
          AND ct.coach_id = cca.coach_id
          AND ct.date > cd.client_today
          AND ct.training_data != '{}'::jsonb
        LIMIT 1
    ) future ON true
    -- Dedup: no existing uncompleted auto todo with same title for this client
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' is running out of workouts'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND latest.last_date IS NOT NULL  -- has had workouts before
      AND future.has_future IS NULL     -- no future workouts
      AND existing.id IS NULL;          -- not already flagged

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 2: Inactive client (no activity in 7 days) ────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' has had no activity in 7 days',
        'No workouts, check-ins, habits, or metrics logged since ' ||
            to_char(COALESCE(last_act.last_activity, cca.connected_at), 'Mon DD, YYYY') ||
            '. They may need a check-in.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Find the most recent activity across all tables
    CROSS JOIN LATERAL (
        SELECT MAX(activity_date) AS last_activity
        FROM (
            -- Training completions
            SELECT cth.date AS activity_date
            FROM public.client_training_history cth
            WHERE cth.client_id = cca.client_id
              AND cth.coach_id = cca.coach_id
              AND cth.status IN ('in_progress', 'completed')
              AND cth.date >= cd.client_today - 7
            UNION ALL
            -- Habit logs
            SELECT chl.date AS activity_date
            FROM public.client_habit_logs chl
            WHERE chl.client_id = cca.client_id
              AND chl.coach_id = cca.coach_id
              AND chl.date >= cd.client_today - 7
            UNION ALL
            -- Metric logs
            SELECT cml.date AS activity_date
            FROM public.client_metric_logs cml
            WHERE cml.client_id = cca.client_id
              AND cml.coach_id = cca.coach_id
              AND cml.date >= cd.client_today - 7
            UNION ALL
            -- Check-in logs
            SELECT ccl.submission_date AS activity_date
            FROM public.client_checkin_logs ccl
            WHERE ccl.client_id = cca.client_id
              AND ccl.coach_id = cca.coach_id
              AND ccl.submission_date >= cd.client_today - 7
        ) all_activity
    ) last_act
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' has had no activity in 7 days'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND cca.connected_at IS NOT NULL
      AND cca.connected_at <= NOW() - INTERVAL '7 days'  -- not brand new
      AND last_act.last_activity IS NULL  -- no recent activity
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 3: Missed workout streak (3+ in a row) ────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' has missed 3+ workouts in a row',
        streak.missed_count || ' consecutive workouts missed since ' ||
            to_char(streak.streak_start, 'Mon DD, YYYY') ||
            '. Their program may need adjusting.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Count consecutive missed workouts from most recent backward
    CROSS JOIN LATERAL (
        SELECT
            COUNT(*) AS missed_count,
            MIN(h.date) AS streak_start
        FROM (
            SELECT
                cth.date,
                cth.status,
                ROW_NUMBER() OVER (ORDER BY cth.date DESC, cth.workout_id DESC) AS rn
            FROM public.client_training_history cth
            WHERE cth.client_id = cca.client_id
              AND cth.coach_id = cca.coach_id
              AND cth.date <= cd.client_today
            ORDER BY cth.date DESC, cth.workout_id DESC
            LIMIT 20  -- look back at most 20 entries
        ) h
        WHERE h.status = 'missed'
          AND h.rn = (
              -- Only count from the start: find the unbroken streak
              SELECT MIN(s.rn)
              FROM (
                  SELECT
                      hi.rn,
                      hi.status,
                      hi.rn - ROW_NUMBER() OVER (ORDER BY hi.rn) AS grp
                  FROM (
                      SELECT
                          cth2.status,
                          ROW_NUMBER() OVER (ORDER BY cth2.date DESC, cth2.workout_id DESC) AS rn
                      FROM public.client_training_history cth2
                      WHERE cth2.client_id = cca.client_id
                        AND cth2.coach_id = cca.coach_id
                        AND cth2.date <= cd.client_today
                      ORDER BY cth2.date DESC, cth2.workout_id DESC
                      LIMIT 20
                  ) hi
                  WHERE hi.status = 'missed'
              ) s
              WHERE s.grp = 0  -- first contiguous group from rn=1
          ) OR h.rn <= (
              -- Alternative: count all missed from rn=1 until first non-missed
              SELECT COALESCE(MIN(brk.rn) - 1, 20)
              FROM (
                  SELECT
                      ROW_NUMBER() OVER (ORDER BY cth3.date DESC, cth3.workout_id DESC) AS rn,
                      cth3.status
                  FROM public.client_training_history cth3
                  WHERE cth3.client_id = cca.client_id
                    AND cth3.coach_id = cca.coach_id
                    AND cth3.date <= cd.client_today
                  ORDER BY cth3.date DESC, cth3.workout_id DESC
                  LIMIT 20
              ) brk
              WHERE brk.status != 'missed'
          )
    ) streak
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' has missed 3+ workouts in a row'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND streak.missed_count >= 3
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 4: Pending questionnaire overdue (3+ days) ────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cq.coach_id,
        cq.client_id,
        up.name || ' hasn''t completed their questionnaire: ' || cq.name,
        'Sent ' || EXTRACT(DAY FROM NOW() - cq.sent_at)::INTEGER || ' days ago on ' ||
            to_char(cq.sent_at, 'Mon DD, YYYY') || ' and still pending.',
        'client'
    FROM public.client_questionnaires cq
    JOIN public.coach_client_assignments cca
        ON cca.coach_id = cq.coach_id AND cca.client_id = cq.client_id
    JOIN public.user_profiles up ON up.id = cq.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cq.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cq.coach_id
        AND existing.client_id = cq.client_id
        AND existing.title = up.name || ' hasn''t completed their questionnaire: ' || cq.name
        AND existing.completed = false
    WHERE cq.status = 'pending'
      AND cq.sent_at IS NOT NULL
      AND cq.sent_at < NOW() - INTERVAL '3 days'
      AND cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 5: Declining habit compliance ─────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || '''s habit compliance has dropped',
        'Completion rate went from ' || prev_week.rate || '% to ' || this_week.rate ||
            '% compared to the previous week.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- This week's habit completion rate
    CROSS JOIN LATERAL (
        SELECT
            COUNT(*) FILTER (WHERE chl.status = 'completed') AS completed,
            COUNT(*) AS total,
            CASE WHEN COUNT(*) >= 3
                THEN ROUND(100.0 * COUNT(*) FILTER (WHERE chl.status = 'completed') / COUNT(*))
                ELSE NULL
            END AS rate
        FROM public.client_habit_logs chl
        WHERE chl.client_id = cca.client_id
          AND chl.coach_id = cca.coach_id
          AND chl.date BETWEEN cd.client_today - 6 AND cd.client_today
    ) this_week
    -- Previous week's habit completion rate
    CROSS JOIN LATERAL (
        SELECT
            COUNT(*) FILTER (WHERE chl.status = 'completed') AS completed,
            COUNT(*) AS total,
            CASE WHEN COUNT(*) >= 3
                THEN ROUND(100.0 * COUNT(*) FILTER (WHERE chl.status = 'completed') / COUNT(*))
                ELSE NULL
            END AS rate
        FROM public.client_habit_logs chl
        WHERE chl.client_id = cca.client_id
          AND chl.coach_id = cca.coach_id
          AND chl.date BETWEEN cd.client_today - 13 AND cd.client_today - 7
    ) prev_week
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || '''s habit compliance has dropped'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND prev_week.rate IS NOT NULL
      AND this_week.rate IS NOT NULL
      AND prev_week.rate >= 70           -- was doing well
      AND prev_week.rate - this_week.rate >= 30  -- significant drop
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 6: New client needs setup ─────────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' has no assignments yet',
        'Connected ' || EXTRACT(DAY FROM NOW() - cca.connected_at)::INTEGER ||
            ' days ago but has no workouts, check-ins, habits, or metrics assigned.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Check no assignments exist
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_training ct
        WHERE ct.client_id = cca.client_id AND ct.coach_id = cca.coach_id LIMIT 1
    ) t ON true
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_checkins ci
        WHERE ci.client_id = cca.client_id AND ci.coach_id = cca.coach_id LIMIT 1
    ) ci ON true
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_habits ch
        WHERE ch.client_id = cca.client_id AND ch.coach_id = cca.coach_id LIMIT 1
    ) h ON true
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_metrics cm
        WHERE cm.client_id = cca.client_id AND cm.coach_id = cca.coach_id LIMIT 1
    ) m ON true
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' has no assignments yet'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND cca.status = 'connected'
      AND cca.connected_at IS NOT NULL
      AND cca.connected_at < NOW() - INTERVAL '1 day'  -- give coach a day
      AND tw.is_midnight = true
      AND t.has_any IS NULL
      AND ci.has_any IS NULL
      AND h.has_any IS NULL
      AND m.has_any IS NULL
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 7: Metric not logged ──────────────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cm.coach_id,
        cm.client_id,
        up.name || ' hasn''t logged ''' || cm.name || '''',
        'Last logged ' ||
            CASE WHEN last_log.last_date IS NOT NULL
                THEN EXTRACT(DAY FROM NOW() - last_log.last_date::timestamp)::INTEGER || ' days ago on ' ||
                     to_char(last_log.last_date, 'Mon DD, YYYY')
                ELSE 'never'
            END ||
            '. Expected frequency: ' || COALESCE(cm.schedule_config->>'frequency', 'unknown') || '.',
        'client'
    FROM public.client_metrics cm
    JOIN public.coach_client_assignments cca
        ON cca.coach_id = cm.coach_id AND cca.client_id = cm.client_id
    JOIN public.user_profiles up ON up.id = cm.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cm.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Most recent log for this metric
    CROSS JOIN LATERAL (
        SELECT MAX(cml.date) AS last_date
        FROM public.client_metric_logs cml
        WHERE cml.assignment_id = cm.id
          AND cml.client_id = cm.client_id
          AND cml.coach_id = cm.coach_id
    ) last_log
    -- Determine threshold based on frequency
    CROSS JOIN LATERAL (
        SELECT CASE cm.schedule_config->>'frequency'
            WHEN 'daily'    THEN 2
            WHEN 'weekly'   THEN 14
            WHEN 'biweekly' THEN 28
            WHEN 'monthly'  THEN 60
            ELSE 14  -- default to 2 weeks
        END AS threshold_days
    ) freq
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cm.coach_id
        AND existing.client_id = cm.client_id
        AND existing.title = up.name || ' hasn''t logged ''' || cm.name || ''''
        AND existing.completed = false
    WHERE cm.schedule_config IS NOT NULL
      AND cm.schedule_config != '{}'::jsonb
      AND cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND (
          last_log.last_date IS NULL  -- never logged
          OR last_log.last_date < cd.client_today - freq.threshold_days
      )
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 8: Client birthday coming up (within 3 days) ──────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || '''s birthday is ' ||
            CASE days_away.days
                WHEN 0 THEN 'today'
                WHEN 1 THEN 'tomorrow'
                ELSE 'in ' || days_away.days || ' days'
            END,
        'They''re turning ' ||
            (EXTRACT(YEAR FROM cd.client_today) - EXTRACT(YEAR FROM cp.date_of_birth))::INTEGER ||
            ' on ' || to_char(
                (EXTRACT(YEAR FROM cd.client_today)::INTEGER || '-' ||
                 LPAD(EXTRACT(MONTH FROM cp.date_of_birth)::TEXT, 2, '0') || '-' ||
                 LPAD(EXTRACT(DAY FROM cp.date_of_birth)::TEXT, 2, '0'))::date,
                'Mon DD, YYYY'
            ) || '.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    JOIN public.client_profiles cp ON cp.client_id = cca.client_id
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Calculate days until birthday this year (handle year wrap)
    CROSS JOIN LATERAL (
        SELECT
            CASE
                WHEN (MAKE_DATE(EXTRACT(YEAR FROM cd.client_today)::INTEGER,
                                EXTRACT(MONTH FROM cp.date_of_birth)::INTEGER,
                                EXTRACT(DAY FROM cp.date_of_birth)::INTEGER)
                     ) >= cd.client_today
                THEN (MAKE_DATE(EXTRACT(YEAR FROM cd.client_today)::INTEGER,
                                EXTRACT(MONTH FROM cp.date_of_birth)::INTEGER,
                                EXTRACT(DAY FROM cp.date_of_birth)::INTEGER)
                     ) - cd.client_today
                ELSE (MAKE_DATE(EXTRACT(YEAR FROM cd.client_today)::INTEGER + 1,
                                EXTRACT(MONTH FROM cp.date_of_birth)::INTEGER,
                                EXTRACT(DAY FROM cp.date_of_birth)::INTEGER)
                     ) - cd.client_today
            END AS days
    ) days_away
    -- Dedup: check no existing todo with birthday-related title for this client
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title LIKE up.name || '''s birthday is %'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND cp.date_of_birth IS NOT NULL
      AND days_away.days BETWEEN 0 AND 3
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 9: Client anniversary ─────────────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        anniv.label || ' with ' || up.name,
        'You''ve been working together since ' ||
            to_char(cca.connected_at, 'Mon DD, YYYY') || '.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Check milestone anniversaries
    CROSS JOIN LATERAL (
        SELECT milestone.label, milestone.anniversary_date
        FROM (
            VALUES
                ('1 month anniversary',  cca.connected_at + INTERVAL '1 month'),
                ('3 month anniversary',  cca.connected_at + INTERVAL '3 months'),
                ('6 month anniversary',  cca.connected_at + INTERVAL '6 months'),
                ('1 year anniversary',   cca.connected_at + INTERVAL '1 year'),
                ('2 year anniversary',   cca.connected_at + INTERVAL '2 years'),
                ('3 year anniversary',   cca.connected_at + INTERVAL '3 years')
        ) AS milestone(label, anniversary_date)
        WHERE milestone.anniversary_date::date BETWEEN cd.client_today AND cd.client_today + 3
        LIMIT 1
    ) anniv
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = anniv.label || ' with ' || up.name
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND cca.connected_at IS NOT NULL
      AND tw.is_midnight = true
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_assistant_todos() TO service_role;

-- ============================================================================
-- 3. Wrapper with logging
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assistant_todo_cron_log (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    rows_inserted INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assistant_todo_cron_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage assistant todo log"
    ON public.assistant_todo_cron_log
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.trigger_generate_assistant_todos()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_log_id UUID;
    v_rows   INTEGER;
BEGIN
    INSERT INTO public.assistant_todo_cron_log (started_at)
    VALUES (now())
    RETURNING id INTO v_log_id;

    v_rows := public.generate_assistant_todos();

    UPDATE public.assistant_todo_cron_log
    SET completed_at = now(),
        rows_inserted = v_rows
    WHERE id = v_log_id;

    IF v_rows > 0 THEN
        RAISE NOTICE 'generate_assistant_todos: inserted % rows', v_rows;
    END IF;

EXCEPTION WHEN OTHERS THEN
    UPDATE public.assistant_todo_cron_log
    SET completed_at = now(),
        error_message = SQLERRM
    WHERE id = v_log_id;

    RAISE WARNING 'generate_assistant_todos failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_assistant_todos() TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_generate_assistant_todos() TO service_role;

-- ============================================================================
-- 4. Schedule pg_cron job (runs at :10 and :40 past every hour)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('generate-assistant-todos');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        PERFORM cron.schedule(
            'generate-assistant-todos',
            '10,40 * * * *',
            'SELECT public.trigger_generate_assistant_todos()'
        );

        RAISE NOTICE 'Cron job scheduled: generate-assistant-todos at :10 and :40 past every hour';
    ELSE
        RAISE NOTICE 'pg_cron not available. Run manually:';
        RAISE NOTICE 'SELECT cron.schedule(''generate-assistant-todos'', ''10,40 * * * *'', ''SELECT public.trigger_generate_assistant_todos()'')';
    END IF;
END;
$$;

-- ============================================================================
-- 5. Permissions and cleanup
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.assistant_todo_cron_log TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_assistant_todo_logs(
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
    DELETE FROM public.assistant_todo_cron_log
    WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;
