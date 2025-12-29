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
     * Get training calendar for a client within a date range
     * Request body: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
     */
    getTrainingCalendar: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { startDate, endDate } = req.body;

        // Validate date parameters
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required in request body (format: YYYY-MM-DD)'
            });
        }

        // Validate date format (basic check)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        const supabase = getSupabaseClient();

        // Query the partitioned client_training table
        // This will benefit from partition pruning for optimal performance
        const { data: trainingData, error } = await supabase
            .from('client_training')
            .select('date, training_data, day_status, started_at, completed_at')
            .eq('client_id', targetClientId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Transform data to match frontend format
        // Frontend expects: { [date: string]: Array<Workout> }
        // Backend returns: Array<{ date: string, training_data: Workout[] }>
        const calendar: { [date: string]: any[] } = {};

        if (trainingData) {
            trainingData.forEach((entry) => {
                // Format date as dd-mm-yyyy for frontend compatibility
                const [year, month, day] = entry.date.split('-');
                const formattedDate = `${day}-${month}-${year}`;

                // training_data is a JSONB array of workouts
                calendar[formattedDate] = Array.isArray(entry.training_data)
                    ? entry.training_data
                    : [];
            });
        }

        success(res, {
            message: 'Training calendar retrieved successfully',
            data: { calendar },
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
