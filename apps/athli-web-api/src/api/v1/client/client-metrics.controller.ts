import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientMetricsController = {
    /**
     * Get all metrics assigned to a client
     */
    getMetrics: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_metric_assignments')
            .select('*, metric:coach_metrics(*)')
            .eq('client_id', targetClientId);

        if (isCoachView) {
            query = query.eq('coach_id', userId);
        }

        const { data: assignments, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client metrics retrieved successfully',
            data: { assignments },
        });
    },

    /**
     * Record a metric value
     */
    /**
     * Record a metric log
     */
    recordMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // This is the assignment ID, but we usually log against the metric_id. 
        // Wait, the route /metrics/:id/logs implies :id is what? 
        // If the client lists "assignments", they have assignment_id.
        // But logs should link to the underlying *metric* or the *assignment*? 
        // My migration links to `metric_id`.
        // So I need to fetch the assignment to get the metric_id and coach_id.

        const { value, date, note } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // 1. Fetch assignment to verify access and get metadata
        const { data: assignment, error: assignmentError } = await supabase
            .from('client_metric_assignments')
            .select('client_id, coach_id, metric_id')
            .eq('id', id)
            .eq('client_id', userId)
            .single();

        if (assignmentError || !assignment) {
            return notFound(res, { message: 'Metric assignment not found' });
        }

        // 2. Insert log
        const { data: log, error: logError } = await supabase
            .from('client_metric_logs')
            .insert({
                client_id: userId,
                coach_id: assignment.coach_id,
                metric_id: assignment.metric_id,
                value,
                date: date || new Date().toISOString().split('T')[0],
                note
            })
            .select()
            .single();

        if (logError) {
            return res.status(500).json({ success: false, message: logError.message });
        }

        success(res, {
            message: 'Metric recorded successfully',
            data: { log },
        });
    },
};
