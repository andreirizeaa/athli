import { Request, Response } from 'express';
import { success, forbidden, unauthorized, noContent, badRequest } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientTasksController = {
    /**
     * GET /tasks – list tasks for a client
     * Query params: ?type=check_in,metric  ?from=2026-01-01&to=2026-02-08
     */
    getTasks: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        let targetClientId: string;
        let targetCoachId: string | undefined;

        const isCoachRequest = coachIdHeader && coachIdHeader === userId;

        if (isCoachRequest) {
            if (!clientIdHeader) {
                return forbidden(res, { message: 'x-client-id header required for coach requests' });
            }
            targetClientId = clientIdHeader;
            targetCoachId = coachIdHeader;

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
            if (clientIdHeader && clientIdHeader !== userId) {
                return forbidden(res, { message: 'Cannot access another client\'s data' });
            }
            targetClientId = clientIdHeader || userId;

            if (coachIdHeader) {
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
            .from('client_tasks')
            .select('*')
            .eq('client_id', targetClientId)
            .order('due_date', { ascending: true });

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        // Optional type filter: ?type=check_in,metric
        const typeFilter = req.query.type as string | undefined;
        if (typeFilter) {
            const types = typeFilter.split(',').map(t => t.trim());
            query = query.in('task_type', types);
        }

        // Optional date range: ?from=...&to=...
        const from = req.query.from as string | undefined;
        const to = req.query.to as string | undefined;
        if (from) query = query.gte('due_date', from);
        if (to)   query = query.lte('due_date', to);

        const { data: tasks, error } = await query;

        if (error) return res.status(500).json({ success: false, message: error.message });

        // Enrich tasks with name/description from reference tables
        const enriched = await enrichTasks(supabase, tasks || []);

        success(res, {
            message: 'Client tasks retrieved successfully',
            data: { tasks: enriched },
        });
    },

    /**
     * DELETE /tasks/:id – manually dismiss/complete a task
     */
    deleteTask: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { id } = req.params;

        const isCoachRequest = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoachRequest ? clientIdHeader : (clientIdHeader || userId);
        const targetCoachId = isCoachRequest ? coachIdHeader : coachIdHeader;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });

        const supabase = getSupabaseClient();

        let deleteQuery = supabase
            .from('client_tasks')
            .delete()
            .eq('id', id)
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            deleteQuery = deleteQuery.eq('coach_id', targetCoachId);
        }

        const { error } = await deleteQuery;

        if (error) return res.status(500).json({ success: false, message: error.message });

        noContent(res);
    },

    /**
     * POST /tasks/generate – manually trigger task generation (coach only)
     */
    generateTasks: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const coachIdHeader = req.header('x-coach-id');

        if (!coachIdHeader || coachIdHeader !== userId) {
            return unauthorized(res, { message: 'Unauthorized' });
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('generate_daily_client_tasks');

        if (error) return res.status(500).json({ success: false, message: error.message });

        success(res, {
            message: 'Tasks generated successfully',
            data: { rows_created: data ?? 0 },
        });
    },
};

/**
 * Enrich task rows with name/description by joining reference tables.
 */
async function enrichTasks(supabase: any, tasks: any[]): Promise<any[]> {
    if (tasks.length === 0) return [];

    // Group reference_ids by task_type
    const idsByType: Record<string, string[]> = {};
    for (const t of tasks) {
        if (!idsByType[t.task_type]) idsByType[t.task_type] = [];
        idsByType[t.task_type].push(t.reference_id);
    }

    const refMap: Record<string, { name?: string; description?: string }> = {};

    // Fetch names in parallel
    const fetches: Promise<void>[] = [];

    if (idsByType.check_in?.length) {
        fetches.push(
            supabase
                .from('client_checkins')
                .select('id, name, description')
                .in('id', idsByType.check_in)
                .then(({ data }: any) => {
                    for (const r of data || []) refMap[r.id] = { name: r.name, description: r.description };
                })
        );
    }

    if (idsByType.metric?.length) {
        fetches.push(
            supabase
                .from('client_metrics')
                .select('id, name, description')
                .in('id', idsByType.metric)
                .then(({ data }: any) => {
                    for (const r of data || []) refMap[r.id] = { name: r.name, description: r.description };
                })
        );
    }

    if (idsByType.habit?.length) {
        fetches.push(
            supabase
                .from('client_habits')
                .select('id, name, description')
                .in('id', idsByType.habit)
                .then(({ data }: any) => {
                    for (const r of data || []) refMap[r.id] = { name: r.name, description: r.description };
                })
        );
    }

    if (idsByType.questionnaire?.length) {
        fetches.push(
            supabase
                .from('client_questionnaires')
                .select('id, name, description')
                .in('id', idsByType.questionnaire)
                .then(({ data }: any) => {
                    for (const r of data || []) refMap[r.id] = { name: r.name, description: r.description };
                })
        );
    }

    await Promise.all(fetches);

    return tasks.map(t => ({
        ...t,
        name: refMap[t.reference_id]?.name,
        description: refMap[t.reference_id]?.description,
    }));
}
