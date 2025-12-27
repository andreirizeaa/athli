import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientMetricsController = {
    /**
     * Get all metrics for a client
     * Context: Client (x-client-id) or Coach (x-coach-id + x-client-id)
     */
    getMetrics: async (req: Request, res: Response) => {
        const userId = (req as any).userId; // Authenticated User ID
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        // IF acting as Coach: clientIdHeader is mandatory, coachIdHeader is mandatory (and must match auth user)
        // IF acting as Client: clientIdHeader is optional (defaults to userId), coachIdHeader is optional (defaults to assigned coach?)
        // WAIT: The user wants "x-client-id and x-coach-id sent in the request headers"

        // 1. Determine Context
        let targetClientId: string;
        let targetCoachId: string | undefined;

        if (coachIdHeader) {
            // Coach View
            if (coachIdHeader !== userId) {
                // Ensure the authenticated user is actually the coach they claim to be?
                // Or maybe the user IS the coach. 
                // Let's assume userId is the coach_id if x-coach-id is present.
                if (coachIdHeader !== userId) return unauthorized(res, { message: 'Coach ID mismatch' });
            }
            if (!clientIdHeader) return forbidden(res, { message: 'x-client-id header required for coach view' });

            targetClientId = clientIdHeader as string;
            targetCoachId = coachIdHeader as string;

            // Verify Relationship
            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) return forbidden(res, { message: 'Client not assigned to this coach' });

        } else {
            // Client View
            // If checking own metrics
            if (clientIdHeader && clientIdHeader !== userId) return forbidden(res, { message: 'Client ID mismatch' });
            targetClientId = userId;

            // Client might have multiple coaches?
            // "client routes also need to pass in the x-coach-id into the req headers too"
            // So client must specify WHICH coach's metrics they want to see?
            // "so this makes sure they get their relevant data only"
            targetCoachId = coachIdHeader as string;
            // If client doesn't send coach-id, do we show all? User says "composite pk... query with coach_id in key"
            // So arguably, x-coach-id is REQUIRED if we want to hit the PK index efficiently or satisfy the logic.
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_metrics')
            .select('*')
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: metrics, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Map to response format
        const formattedMetrics = metrics.map((m: any) => ({
            id: m.id,
            assignment_id: m.id,
            coach_id: m.coach_id,
            name: m.name,
            unit: m.unit,
            description: m.description,
            value_kind: m.value_kind,
            is_private: false, // All client_metrics are copies now
        }));

        success(res, {
            message: 'Client metrics retrieved successfully',
            data: { metrics: formattedMetrics },
        });
    },

    /**
     * Assign metrics (Library or Private) to a client
     * Context: Coach Only (x-coach-id required)
     */
    assignMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { metricIds, name, unit, description, value_kind } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) {
            return unauthorized(res, { message: 'Only coaches can assign metrics' });
        }
        if (!clientIdHeader) {
            return forbidden(res, { message: 'x-client-id header required' });
        }

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Verify Relationship
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .eq('client_id', targetClientId)
            .single();

        if (!relation) return forbidden(res, { message: 'Client not assigned to this coach' });

        // 1. Private Metric Creation
        if (name) {
            const { data: metric, error } = await supabase
                .from('client_metrics')
                .insert({
                    client_id: targetClientId,
                    coach_id: targetCoachId,
                    name,
                    unit,
                    description,
                    value_kind: value_kind || 'number',
                })
                .select()
                .single();

            if (error) return res.status(500).json({ success: false, message: error.message });

            return created(res, {
                message: 'Private metric created successfully',
                data: { metric },
            });
        }

        // 2. Library Assignment
        if (!Array.isArray(metricIds) || metricIds.length === 0) {
            return res.status(400).json({ success: false, message: 'metricIds array or name is required' });
        }

        // Fetch source metrics
        const { data: libraryMetrics, error: fetchError } = await supabase
            .from('coach_metrics')
            .select('*')
            .in('id', metricIds);

        if (fetchError) return res.status(500).json({ success: false, message: fetchError.message });
        if (!libraryMetrics || libraryMetrics.length === 0) return notFound(res, { message: 'No metrics found' });

        // Transform for client_metrics
        // Logic: Copy data, set coach_id + client_id
        const assignments = libraryMetrics.map(m => ({
            client_id: targetClientId,
            coach_id: targetCoachId,
            name: m.name,
            unit: m.unit,
            description: m.description,
            value_kind: m.value_kind,
        }));

        // Upsert? Or Insert? 
        // With composite key (id, client_id, coach_id), conflict is ID. But these are new rows with new IDs (default).
        // If we want to prevent duplicates based on name? Or something else?
        // Previous logic used `(client_id, metric_id)` unique constraint. That constraint is gone.
        // So we just insert new copies.
        const { error: insertError } = await supabase
            .from('client_metrics')
            .insert(assignments);

        if (insertError) return res.status(500).json({ success: false, message: insertError.message });

        created(res, { message: 'Metrics assigned successfully' });
    },

    /**
     * Remove metrics (Bulk Delete)
     * Context: Coach Only (usually)
     */
    deleteAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { metricIds } = req.body; // Array of client_metrics.id

        if (!coachIdHeader || coachIdHeader !== userId) {
            return unauthorized(res, { message: 'Only coaches can delete assignments' });
        }
        if (!clientIdHeader) {
            return forbidden(res, { message: 'x-client-id header required' });
        }
        if (!Array.isArray(metricIds) || metricIds.length === 0) {
            return res.status(400).json({ success: false, message: 'metricIds array required' });
        }

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Delete from client_metrics where client_id AND coach_id match (composite safe)
        const { error } = await supabase
            .from('client_metrics')
            .delete()
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .in('id', metricIds);

        if (error) return res.status(500).json({ success: false, message: error.message });

        success(res, { message: 'Metrics removed successfully' });
    },

    /**
     * Record a metric log
     */
    recordMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_metrics.id
        const { value, date, note } = req.body;

        // Use headers for lookup validation, though auth.uid() check in RLS might suffice.
        const clientIdHeader = req.header('x-client-id');

        // If coach recording for client?
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;

        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });

        const supabase = getSupabaseClient();

        // Get the metric to find its coach_id (needed for log composite if we enforced it, or just for correctness)
        const { data: metric, error: fetchError } = await supabase
            .from('client_metrics')
            .select('coach_id')
            .eq('id', id)
            .eq('client_id', targetClientId) // Ensure it belongs to target
            .single();

        if (fetchError || !metric) return notFound(res, { message: 'Metric not found' });

        // Insert Log
        const { data: log, error: logError } = await supabase
            .from('client_metric_logs')
            .insert({
                client_id: targetClientId,
                coach_id: metric.coach_id,
                assignment_id: id,
                value,
                date: date || new Date().toISOString().split('T')[0],
                note
            })
            .select()
            .single();

        if (logError) return res.status(500).json({ success: false, message: logError.message });

        success(res, {
            message: 'Metric recorded successfully',
            data: { log },
        });
    },
};
