-- Migration: Add SQL function to efficiently calculate habit streaks
-- This function calculates:
-- 1. longest_streak: The longest consecutive streak of days with logs (all-time)
-- 2. current_streak: The current consecutive streak counting backwards from today
--    (today can be empty - we start counting from yesterday if today has no log)

CREATE OR REPLACE FUNCTION calculate_habit_streaks(
    p_assignment_id UUID,
    p_client_id UUID,
    p_coach_id UUID
)
RETURNS TABLE (
    longest_streak INTEGER,
    current_streak INTEGER
) AS $$
DECLARE
    v_longest_streak INTEGER := 0;
    v_current_streak INTEGER := 0;
    v_temp_streak INTEGER := 1;
    v_prev_date DATE := NULL;
    v_curr_date DATE;
    v_today DATE := CURRENT_DATE;
    v_check_date DATE;
    v_has_today BOOLEAN := FALSE;
    v_has_yesterday BOOLEAN := FALSE;
BEGIN
    -- Calculate longest all-time streak
    FOR v_curr_date IN (
        SELECT date
        FROM client_habit_logs
        WHERE assignment_id = p_assignment_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
        ORDER BY date ASC
    )
    LOOP
        IF v_prev_date IS NULL THEN
            v_temp_streak := 1;
        ELSIF v_curr_date = v_prev_date + INTERVAL '1 day' THEN
            v_temp_streak := v_temp_streak + 1;
        ELSE
            v_temp_streak := 1;
        END IF;

        v_longest_streak := GREATEST(v_longest_streak, v_temp_streak);
        v_prev_date := v_curr_date;
    END LOOP;

    -- Calculate current streak (counting backwards from today)
    -- Check if we have logs for today and yesterday
    SELECT EXISTS (
        SELECT 1 FROM client_habit_logs
        WHERE assignment_id = p_assignment_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND date = v_today
    ) INTO v_has_today;

    SELECT EXISTS (
        SELECT 1 FROM client_habit_logs
        WHERE assignment_id = p_assignment_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND date = v_today - INTERVAL '1 day'
    ) INTO v_has_yesterday;

    -- Determine starting point for current streak
    IF v_has_today THEN
        v_check_date := v_today;
    ELSIF v_has_yesterday THEN
        v_check_date := v_today - INTERVAL '1 day';
    ELSE
        -- No recent logs, current streak is 0
        RETURN QUERY SELECT v_longest_streak, 0;
        RETURN;
    END IF;

    -- Count backwards from check_date
    WHILE EXISTS (
        SELECT 1 FROM client_habit_logs
        WHERE assignment_id = p_assignment_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND date = v_check_date
    ) LOOP
        v_current_streak := v_current_streak + 1;
        v_check_date := v_check_date - INTERVAL '1 day';
    END LOOP;

    RETURN QUERY SELECT v_longest_streak, v_current_streak;
END;
$$ LANGUAGE plpgsql;
