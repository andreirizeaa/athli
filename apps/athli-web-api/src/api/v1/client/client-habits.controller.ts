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

        if (coachIdHeader) {
            if (coachIdHeader !== userId) {
                if (coachIdHeader !== userId) return unauthorized(res, { message: 'Coach ID mismatch' });
            }
            if (!clientIdHeader) return forbidden(res, { message: 'x-client-id header required' });

            targetClientId = clientIdHeader as string;
            targetCoachId = coachIdHeader as string;

            // Verify Relation
            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) return forbidden(res, { message: 'Forbidden' });

        } else {
            if (clientIdHeader && clientIdHeader !== userId) return forbidden(res, { message: 'Client ID mismatch' });
            targetClientId = userId;
            targetCoachId = coachIdHeader as string;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_habits')
            .select('*')
            .eq('client_id', targetClientId);

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
            schedule_type: a.schedule_type,
            schedule_config: a.schedule_config,
            custom_schedule: a.custom_schedule, // Note: migrated schema kept custom_schedule? Yes.
            days_of_week: a.days_of_week,
            times_of_day: a.times_of_day,
            timezone: a.timezone,
            start_date: a.start_date,
            end_date: a.end_date
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
        const { habitIds, name, description, amount, unit, period, custom_schedule } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Verify
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .eq('client_id', targetClientId)
            .single();

        if (!relation) return forbidden(res, { message: 'Forbidden' });

        // 1. Private
        if (name) {
            const { data: habit, error } = await supabase
                .from('client_habits')
                .insert({
                    client_id: targetClientId,
                    coach_id: targetCoachId,
                    name,
                    description,
                    schedule_type: period === 'weekly' ? 'weekly' : 'daily', // Approximation from older detailed params
                    // Or mapping custom_schedule to new fields...
                    // Assuming basic fields for now based on prev controller usage
                })
                .select()
                .single();

            if (error) return res.status(500).json({ success: false, message: error.message });
            return created(res, { message: 'Private habit created', data: { habit } });
        }

        // 2. Library
        if (!Array.isArray(habitIds) || habitIds.length === 0) return res.status(400).json({ success: false, message: 'habitIds required' });

        const { data: libraryHabits, error: fetchError } = await supabase
            .from('coach_habits')
            .select('*')
            .in('id', habitIds);

        if (fetchError) return res.status(500).json({ success: false, message: fetchError.message });
        if (!libraryHabits || libraryHabits.length === 0) return notFound(res, { message: 'No habits found' });

        const assignments = libraryHabits.map(h => ({
            client_id: targetClientId,
            coach_id: targetCoachId,
            name: h.name,
            description: h.description,
            schedule_type: h.schedule_type,
            days_of_week: h.days_of_week,
            times_of_day: h.times_of_day,
            timezone: h.timezone,
            start_date: h.start_date,
            end_date: h.end_date,
            schedule_config: h.schedule_config
        }));

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
     * Log habit status
     */
    updateHabitStatus: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { status, date, note } = req.body;

        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });

        const supabase = getSupabaseClient();

        // Get habit for coach_id
        const { data: habit, error: fetchError } = await supabase
            .from('client_habits')
            .select('coach_id')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .single();

        if (fetchError || !habit) return notFound(res, { message: 'Habit not found' });

        const { data: log, error: logError } = await supabase
            .from('client_habit_logs')
            .insert({
                client_id: targetClientId,
                coach_id: habit.coach_id,
                assignment_id: id,
                status,
                recorded_date: date || new Date().toISOString().split('T')[0],
                note
            })
            .select()
            .single();

        if (logError) return res.status(500).json({ success: false, message: logError.message });

        success(res, { message: 'Habit status logged', data: { log } });
    },
};
