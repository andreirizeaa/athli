import { Request, Response } from 'express';
import { success, unauthorized, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientTrainingsController = {
    /**
     * Get all trainings assigned to a client
     */
    getTrainings: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        const supabase = getSupabaseClient();
        const { data: assignments, error } = await supabase
            .from('client_workout_assignments')
            .select('*, workout:coach_workouts(*)')
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client trainings retrieved successfully',
            data: { assignments },
        });
    },

    /**
     * Update training status
     */
    updateTrainingStatus: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { status } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('client_workout_assignments')
            .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
            .eq('id', id)
            .eq('client_id', targetClientId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!data) {
            return notFound(res, { message: 'Training assignment not found' });
        }

        success(res, {
            message: 'Training status updated successfully',
            data: { assignment: data },
        });
    },
};
