import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientHabitsController = {
    /**
     * Get all habits for a client
     */
    getHabits: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        let targetClientId: string;
        let targetCoachId: string | undefined;

        // Determine request context by matching userId to headers
        const isCoachRequest = coachIdHeader && coachIdHeader === userId;

        if (isCoachRequest) {
            // COACH SCENARIO: Coach accessing client's data
            if (!clientIdHeader) {
                return forbidden(res, { message: 'x-client-id header required for coach requests' });
            }

            targetClientId = clientIdHeader;
            targetCoachId = coachIdHeader;

            // Verify coach-client relationship
            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) {
                return forbidden(res, { message: 'Client not assigned to this coach' });
            }
        } else {
            // CLIENT SCENARIO: Client accessing their own data
            // If x-client-id provided, it must match authenticated user
            if (clientIdHeader && clientIdHeader !== userId) {
                return forbidden(res, { message: 'Cannot access another client\'s data' });
            }

            targetClientId = clientIdHeader || userId;

            // x-coach-id scopes to a specific coach relationship (optional)
            if (coachIdHeader) {
                // Verify client is assigned to this coach
                const supabase = getSupabaseClient();
                const { data: assignment } = await supabase
                    .from('coach_client_assignments')
                    .select('coach_id')
                    .eq('client_id', targetClientId)
                    .eq('coach_id', coachIdHeader)
                    .single();

                if (!assignment) {
                    return forbidden(res, { message: 'Not assigned to this coach' });
                }

                targetCoachId = coachIdHeader;
            }
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_habits')
            .select('*, logs:client_habit_logs(*)')
            .eq('client_id', targetClientId)
            .order('created_at', { ascending: false });

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: habits, error } = await query;

        if (error) return res.status(500).json({ success: false, message: error.message });

        const formatted = habits.map((a: any) => ({
            id: a.id,
            assignment_id: a.id,
            coach_id: a.coach_id,
            name: a.name,
            description: a.description,
            amount: a.amount,
            unit: a.unit,
            period: a.period,
            schedule_type: a.schedule_type,
            schedule_config: a.schedule_config,
            custom_schedule: a.custom_schedule,
            days_of_week: a.days_of_week,
            times_of_day: a.times_of_day,
            timezone: a.timezone,
            start_date: a.start_date,
            end_date: a.end_date,
            logs: (a.logs || []).map((l: any) => ({
                id: l.id,
                status: l.status,
                value: l.value,
                date: l.date
            })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));

        success(res, {
            message: 'Client habits retrieved successfully',
            data: { habits: formatted },
        });
    },

    /**
     * Assign habits (Library or Private) (Coach Only)
     */
    assignHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { habitIds, clientIds, name, description, amount, unit, period, custom_schedule } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });

        const targetCoachId = coachIdHeader as string;
        let targetClientIds: string[] = [];

        if (Array.isArray(clientIds) && clientIds.length > 0) {
            targetClientIds = clientIds;
        } else if (clientIdHeader) {
            targetClientIds = [clientIdHeader as string];
        } else {
            return forbidden(res, { message: 'x-client-id header or clientIds body param required' });
        }

        const supabase = getSupabaseClient();

        // Verify Relationships
        const { data: relations, error: relationError } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .in('client_id', targetClientIds);

        if (relationError || !relations || relations.length !== targetClientIds.length) {
            return forbidden(res, { message: 'One or more clients not assigned to this coach' });
        }

        // 1. Private
        if (name) {
            const inserts = targetClientIds.map(cid => ({
                client_id: cid,
                coach_id: targetCoachId,
                name,
                description,
                amount,
                unit,
                period,
                schedule_type: period === 'weekly' ? 'weekly' : 'daily',
                custom_schedule,
            }));

            const { data: habits, error } = await supabase
                .from('client_habits')
                .insert(inserts)
                .select();

            if (error) return res.status(500).json({ success: false, message: error.message });
            return created(res, { message: 'Private habits created', data: { habits } });
        }

        // 2. Library
        if (!Array.isArray(habitIds) || habitIds.length === 0) return res.status(400).json({ success: false, message: 'habitIds required' });

        const { data: libraryHabits, error: fetchError } = await supabase
            .from('coach_habits')
            .select('*')
            .in('id', habitIds);

        if (fetchError) return res.status(500).json({ success: false, message: fetchError.message });
        if (!libraryHabits || libraryHabits.length === 0) return notFound(res, { message: 'No habits found' });

        const assignments: any[] = [];
        for (const cid of targetClientIds) {
            for (const h of libraryHabits) {
                const scheduleConfig = h.schedule_config || {};
                assignments.push({
                    client_id: cid,
                    coach_id: targetCoachId,
                    name: h.name,
                    description: h.description,
                    schedule_type: h.schedule_type,
                    days_of_week: h.days_of_week,
                    times_of_day: h.times_of_day,
                    timezone: h.timezone,
                    start_date: h.start_date,
                    end_date: h.end_date,
                    schedule_config: h.schedule_config,
                    amount: scheduleConfig.amount ?? null,
                    unit: scheduleConfig.unit ?? null,
                    period: scheduleConfig.period ?? h.schedule_type,
                });
            }
        }

        // Deduplication & Renaming
        const { data: existingHabits } = await supabase
            .from('client_habits')
            .select('client_id, name')
            .in('client_id', targetClientIds);

        const existingSet = new Set(
            (existingHabits || []).map((h: any) => `${h.client_id}:${h.name}`)
        );

        // Process assignments to ensure unique names
        for (const assignment of assignments) {
            let originalName = assignment.name;
            let checkName = originalName;
            let counter = 1;

            while (existingSet.has(`${assignment.client_id}:${checkName}`)) {
                checkName = `${originalName} ${counter}`;
                counter++;
            }

            assignment.name = checkName;
            existingSet.add(`${assignment.client_id}:${checkName}`);
        }

        const { error: insertError } = await supabase.from('client_habits').insert(assignments);
        if (insertError) return res.status(500).json({ success: false, message: insertError.message });

        created(res, { message: 'Habits assigned successfully' });
    },

    /**
     * Bulk Delete
     */
    deleteAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { habitIds } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!Array.isArray(habitIds)) return res.status(400).json({ success: false, message: 'habitIds array required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_habits')
            .delete()
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .in('id', habitIds);

        if (error) return res.status(500).json({ success: false, message: error.message });
        success(res, { message: 'Habits removed successfully' });
    },

    /**
     * Log habit (create log entry)
     */
    logHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { assignmentId, status, date, value } = req.body;

        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });
        if (!assignmentId) return res.status(400).json({ success: false, message: 'assignmentId required in body' });

        const supabase = getSupabaseClient();

        // Get habit for coach_id
        const { data: habit, error: fetchError } = await supabase
            .from('client_habits')
            .select('coach_id')
            .eq('id', assignmentId)
            .eq('client_id', targetClientId)
            .single();

        if (fetchError || !habit) return notFound(res, { message: 'Habit not found' });

        // Use upsert to handle duplicate dates
        const { data: log, error: logError } = await supabase
            .from('client_habit_logs')
            .upsert({
                client_id: targetClientId,
                coach_id: habit.coach_id,
                assignment_id: assignmentId,
                status,
                value,
                date: date || new Date().toISOString().split('T')[0]
            }, {
                onConflict: 'assignment_id,date'
            })
            .select()
            .single();

        if (logError) return res.status(500).json({ success: false, message: logError.message });

        success(res, { message: 'Habit logged', data: { log } });
    },

    /**
     * Update assignment details (Coach Only)
     */
    updateAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { assignmentId, name, description, amount, unit, period, custom_schedule } = req.body;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        if (!coachIdHeader || coachIdHeader !== userId) {
            return unauthorized(res, { message: 'Only coaches can edit assignments' });
        }
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!assignmentId) return res.status(400).json({ success: false, message: 'assignmentId required in body' });

        const supabase = getSupabaseClient();
        const updateData: any = { name, description };
        if (amount !== undefined) updateData.amount = amount;
        if (unit !== undefined) updateData.unit = unit;
        if (period) {
            updateData.period = period;
            updateData.schedule_type = period === 'weekly' ? 'weekly' : 'daily';
        }
        if (custom_schedule) updateData.custom_schedule = custom_schedule;

        const { data: habit, error } = await supabase
            .from('client_habits')
            .update(updateData)
            .eq('id', assignmentId)
            .eq('client_id', clientIdHeader)
            .eq('coach_id', coachIdHeader)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!habit) return notFound(res, { message: 'Habit not found' });

        success(res, { message: 'Habit updated', data: { habit } });
    },

    /**
     * Delete log entry
     */
    deleteLog: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { logId } = req.body;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });
        if (!logId) return res.status(400).json({ success: false, message: 'logId required in body' });

        const supabase = getSupabaseClient();

        // First get the log to find its coach_id
        const { data: log } = await supabase
            .from('client_habit_logs')
            .select('coach_id')
            .eq('id', logId)
            .eq('client_id', targetClientId)
            .single();

        if (!log) return notFound(res, { message: 'Log not found' });

        const { error } = await supabase
            .from('client_habit_logs')
            .delete()
            .eq('id', logId)
            .eq('client_id', targetClientId)
            .eq('coach_id', log.coach_id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        success(res, { message: 'Log deleted' });
    },

    /**
     * Update log entry
     */
    updateLog: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { logId, status, date, value } = req.body;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });
        if (!logId) return res.status(400).json({ success: false, message: 'logId required in body' });

        const supabase = getSupabaseClient();

        // First get the log to find its coach_id
        const { data: existingLog } = await supabase
            .from('client_habit_logs')
            .select('coach_id')
            .eq('id', logId)
            .eq('client_id', targetClientId)
            .single();

        if (!existingLog) return notFound(res, { message: 'Log not found' });

        const { data: log, error } = await supabase
            .from('client_habit_logs')
            .update({ status, date, value })
            .eq('id', logId)
            .eq('client_id', targetClientId)
            .eq('coach_id', existingLog.coach_id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!log) return notFound(res, { message: 'Log not found' });

        success(res, { message: 'Log updated', data: { log } });
    },

    /**
     * Check if a log exists for a specific date
     */
    checkExistingLog: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { assignmentId, date } = req.body;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });
        if (!assignmentId) return res.status(400).json({ success: false, message: 'assignmentId required in body' });
        if (!date) return res.status(400).json({ success: false, message: 'date required in body' });

        const supabase = getSupabaseClient();

        // Get habit to find its coach_id
        const { data: habit } = await supabase
            .from('client_habits')
            .select('coach_id')
            .eq('id', assignmentId)
            .eq('client_id', targetClientId)
            .single();

        if (!habit) return notFound(res, { message: 'Habit not found' });

        const { data: log, error } = await supabase
            .from('client_habit_logs')
            .select('id, value, status, date')
            .eq('assignment_id', assignmentId)
            .eq('client_id', targetClientId)
            .eq('coach_id', habit.coach_id)
            .eq('date', date)
            .maybeSingle();

        if (error) return res.status(500).json({ success: false, message: error.message });

        success(res, {
            message: 'Check completed',
            data: {
                exists: !!log,
                log: log || undefined
            }
        });
    },

    /**
     * Get habit streaks (longest all-time and current)
     */
    getStreaks: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { assignmentId } = req.body;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });
        if (!assignmentId) return res.status(400).json({ success: false, message: 'assignmentId required in body' });

        const supabase = getSupabaseClient();

        // Get habit to find its coach_id
        const { data: habit } = await supabase
            .from('client_habits')
            .select('coach_id')
            .eq('id', assignmentId)
            .eq('client_id', targetClientId)
            .single();

        if (!habit) return notFound(res, { message: 'Habit not found' });

        // Use SQL to efficiently calculate streaks
        const { data, error } = await supabase.rpc('calculate_habit_streaks', {
            p_assignment_id: assignmentId,
            p_client_id: targetClientId,
            p_coach_id: habit.coach_id
        });

        if (error) {
            // If function doesn't exist yet, fall back to application logic
            console.warn('calculate_habit_streaks function not found, using fallback logic');

            // Fetch all logs for this habit
            const { data: logs, error: logsError } = await supabase
                .from('client_habit_logs')
                .select('date')
                .eq('assignment_id', assignmentId)
                .eq('client_id', targetClientId)
                .eq('coach_id', habit.coach_id)
                .order('date', { ascending: true });

            if (logsError) return res.status(500).json({ success: false, message: logsError.message });

            // Calculate streaks in application
            const streaks = calculateStreaksInApp(logs || []);
            return success(res, {
                message: 'Streaks calculated',
                data: streaks
            });
        }

        success(res, {
            message: 'Streaks calculated',
            data: data || { longest_streak: 0, current_streak: 0 }
        });
    },
};

// Fallback function to calculate streaks in application code
function calculateStreaksInApp(logs: { date: string }[]): { longest_streak: number; current_streak: number } {
    if (logs.length === 0) return { longest_streak: 0, current_streak: 0 };

    // Sort by date ascending
    const sortedDates = logs
        .map(l => new Date(l.date))
        .sort((a, b) => a.getTime() - b.getTime());

    let longestStreak = 1;
    let currentStreakLength = 1;

    // Calculate longest streak
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = sortedDates[i - 1];
        const currDate = sortedDates[i];
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreakLength++;
            longestStreak = Math.max(longestStreak, currentStreakLength);
        } else {
            currentStreakLength = 1;
        }
    }

    // Calculate current streak (from today backwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let currentStreak = 0;
    let checkDate = new Date(today);

    // Allow today to be empty - start checking from yesterday
    const lastLogDate = sortedDates[sortedDates.length - 1];
    lastLogDate.setHours(0, 0, 0, 0);

    // If last log is today, start from today; otherwise start from yesterday
    if (lastLogDate.getTime() === today.getTime()) {
        checkDate = new Date(today);
    } else if (lastLogDate.getTime() === yesterday.getTime()) {
        checkDate = new Date(yesterday);
    } else {
        // Last log is older than yesterday, current streak is 0
        return { longest_streak: longestStreak, current_streak: 0 };
    }

    // Count backwards from the check date
    const dateSet = new Set(sortedDates.map(d => d.getTime()));

    while (dateSet.has(checkDate.getTime())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return { longest_streak: longestStreak, current_streak: currentStreak };
}
