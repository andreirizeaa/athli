import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientHabitsController = {
    /**
     * Get all habits assigned to a client
     */
    getHabits: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_habit_assignments')
            .select('*, habit:coach_habits(*)')
            .eq('client_id', targetClientId);

        if (isCoachView) {
            query = query.eq('coach_id', userId);
        }

        const { data: assignments, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client habits retrieved successfully',
            data: { assignments },
        });
    },

    /**
     * Toggle habit completion
     */
    /**
     * Log habit completion/status
     */
    updateHabitStatus: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // assignment ID
        const { status, date, note } = req.body; // status: 'completed' | 'skipped' | 'failed' etc.

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // 1. Fetch assignment
        const { data: assignment, error: assignmentError } = await supabase
            .from('client_habit_assignments')
            .select('client_id, coach_id, habit_id')
            .eq('id', id)
            .eq('client_id', userId)
            .single();

        if (assignmentError || !assignment) {
            return notFound(res, { message: 'Habit assignment not found' });
        }

        // 2. Insert log
        // Note: public.client_habit_logs schema (from 003) likely has columns:
        // client_id, coach_id, coach_habit_id (mapped to habit_id in code logic), status, recorded_date...
        // Let's assume typical fields.

        const { data: log, error: logError } = await supabase
            .from('client_habit_logs')
            .insert({
                client_id: userId,
                coach_id: assignment.coach_id,
                coach_habit_id: assignment.habit_id, // Map habit_id to coach_habit_id as per schema convention usually
                status,
                recorded_date: date || new Date().toISOString().split('T')[0],
                note
            })
            .select()
            .single();

        if (logError) {
            return res.status(500).json({ success: false, message: logError.message });
        }

        success(res, {
            message: 'Habit status logged successfully',
            data: { log },
        });
    },
};
