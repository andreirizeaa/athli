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
            .select('*, logs:client_metric_logs(*)')
            .eq('client_id', targetClientId)
            .order('created_at', { ascending: false });

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
            min_value: m.min_value,
            max_value: m.max_value,
            cron_expression: m.cron_expression,
            schedule_config: m.schedule_config,
            is_private: false, // All client_metrics are copies now
            logs: (m.logs || []).map((l: any) => ({
                id: l.id,
                value: l.value,
                date: l.date
            })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
        const { metricIds, clientIds, name, unit, description, value_kind, min_value, max_value, cron_expression, schedule_config } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) {
            return unauthorized(res, { message: 'Only coaches can assign metrics' });
        }

        const targetCoachId = coachIdHeader as string;
        let targetClientIds: string[] = [];

        // Determine target clients
        if (Array.isArray(clientIds) && clientIds.length > 0) {
            targetClientIds = clientIds;
        } else if (clientIdHeader) {
            targetClientIds = [clientIdHeader as string];
        } else {
            return forbidden(res, { message: 'x-client-id header or clientIds body param required' });
        }

        const supabase = getSupabaseClient();

        // Verify Relationships (Bulk)
        const { data: relations, error: relationError } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .in('client_id', targetClientIds);

        if (relationError || !relations || relations.length !== targetClientIds.length) {
            // Some clients might not be assigned. For simplicity, we can error or filter.
            // Let's error if any are invalid to be safe/strict.
            return forbidden(res, { message: 'One or more clients not assigned to this coach' });
        }

        // 1. Private Metric Creation (for each client)
        if (name) {
            const inserts = targetClientIds.map(cid => ({
                client_id: cid,
                coach_id: targetCoachId,
                name,
                unit,
                description,
                value_kind: value_kind || 'number',
                min_value,
                max_value,
                cron_expression,
                schedule_config,
            }));

            const { data: metrics, error } = await supabase
                .from('client_metrics')
                .insert(inserts)
                .select();

            if (error) return res.status(500).json({ success: false, message: error.message });

            return created(res, {
                message: 'Private metrics created successfully',
                data: { metrics },
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
        // Logic: Cross Join Clients x Metrics
        const assignments: any[] = [];
        for (const cid of targetClientIds) {
            for (const m of libraryMetrics) {
                assignments.push({
                    client_id: cid,
                    coach_id: targetCoachId,
                    name: m.name,
                    unit: m.unit,
                    description: m.description,
                    value_kind: m.value_kind,
                    min_value: m.min_value,
                    max_value: m.max_value,
                    cron_expression: m.cron_expression,
                    schedule_config: m.schedule_config,
                });
            }
        }

        // Deduplication & Renaming: Fetch existing metrics for these clients
        const { data: existingMetrics } = await supabase
            .from('client_metrics')
            .select('client_id, name')
            .in('client_id', targetClientIds);

        const existingSet = new Set(
            (existingMetrics || []).map((m: any) => `${m.client_id}:${m.name}`)
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

            // Assign unique name
            assignment.name = checkName;
            // Add to set to prevent internal collisions in this batch
            existingSet.add(`${assignment.client_id}:${checkName}`);
        }

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
     * Log metric (create log entry)
     */
    logMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { assignmentId, value, date } = req.body;

        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });
        if (!assignmentId) return res.status(400).json({ success: false, message: 'assignmentId required in body' });

        const supabase = getSupabaseClient();

        // Get the metric to find its coach_id
        const { data: metric, error: fetchError } = await supabase
            .from('client_metrics')
            .select('coach_id')
            .eq('id', assignmentId)
            .eq('client_id', targetClientId)
            .single();

        if (fetchError || !metric) return notFound(res, { message: 'Metric not found' });

        // Use upsert to handle duplicate dates
        const { data: log, error: logError } = await supabase
            .from('client_metric_logs')
            .upsert({
                client_id: targetClientId,
                coach_id: metric.coach_id,
                assignment_id: assignmentId,
                value,
                date: date || new Date().toISOString().split('T')[0]
            }, {
                onConflict: 'assignment_id,date'
            })
            .select()
            .single();

        if (logError) return res.status(500).json({ success: false, message: logError.message });

        success(res, { message: 'Metric logged', data: { log } });
    },

    /**
     * Update assignment details
     */
    updateAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { assignmentId, name, unit, description, min_value, max_value, cron_expression, schedule_config } = req.body;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        // Only coaches can edit assignments
        if (!coachIdHeader || coachIdHeader !== userId) {
            return unauthorized(res, { message: 'Only coaches can edit assignments' });
        }
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!assignmentId) return res.status(400).json({ success: false, message: 'assignmentId required in body' });

        const supabase = getSupabaseClient();
        const { data: metric, error } = await supabase
            .from('client_metrics')
            .update({ name, unit, description, min_value, max_value, cron_expression, schedule_config })
            .eq('id', assignmentId)
            .eq('client_id', clientIdHeader)
            .eq('coach_id', coachIdHeader)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!metric) return notFound(res, { message: 'Metric not found' });

        success(res, { message: 'Metric updated', data: { metric } });
    },

    /**
     * Delete a log entry
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
            .from('client_metric_logs')
            .select('coach_id')
            .eq('id', logId)
            .eq('client_id', targetClientId)
            .single();

        if (!log) return notFound(res, { message: 'Log not found' });

        const { error } = await supabase
            .from('client_metric_logs')
            .delete()
            .eq('id', logId)
            .eq('client_id', targetClientId)
            .eq('coach_id', log.coach_id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        success(res, { message: 'Log deleted' });
    },

    /**
     * Update a log entry
     */
    updateLog: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { logId, value, date } = req.body;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });
        if (!logId) return res.status(400).json({ success: false, message: 'logId required in body' });

        const supabase = getSupabaseClient();

        // First get the log to find its coach_id
        const { data: existingLog } = await supabase
            .from('client_metric_logs')
            .select('coach_id')
            .eq('id', logId)
            .eq('client_id', targetClientId)
            .single();

        if (!existingLog) return notFound(res, { message: 'Log not found' });

        const { data: log, error } = await supabase
            .from('client_metric_logs')
            .update({ value, date })
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

        // Get metric to find its coach_id
        const { data: metric } = await supabase
            .from('client_metrics')
            .select('coach_id')
            .eq('id', assignmentId)
            .eq('client_id', targetClientId)
            .single();

        if (!metric) return notFound(res, { message: 'Metric not found' });

        const { data: log, error } = await supabase
            .from('client_metric_logs')
            .select('id, value, date')
            .eq('assignment_id', assignmentId)
            .eq('client_id', targetClientId)
            .eq('coach_id', metric.coach_id)
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
};
