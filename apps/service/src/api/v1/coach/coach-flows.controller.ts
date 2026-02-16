import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachFlowController = {
    /**
     * Get all flows for a coach
     */
    getFlows: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: flows, error } = await supabase
            .from('coach_flows')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach flows retrieved successfully',
            data: { flows },
        });
    },

    /**
     * Get a single flow by ID
     */
    getFlowById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: flow, error } = await supabase
            .from('coach_flows')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return notFound(res, { message: 'Flow not found' });
            }
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach flow retrieved successfully',
            data: { flow },
        });
    },

    /**
     * Create a new flow
     */
    createFlow: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, flow_data, is_active } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_flows')
            .insert([
                {
                    coach_id: userId,
                    name,
                    description,
                    flow_data,
                    is_active: is_active ?? true,
                },
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach flow created successfully',
            data: { flow: data },
        });
    },

    /**
     * Update a flow
     */
    updateFlow: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_flows')
            .update(updates)
            .eq('id', id)
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!data) {
            return notFound(res, { message: 'Flow not found' });
        }

        success(res, {
            message: 'Coach flow updated successfully',
            data: { flow: data },
        });
    },

    /**
     * Get per-client execution stats for a flow
     */
    getFlowStats: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Verify the flow belongs to this coach
        const { data: flow, error: flowError } = await supabase
            .from('coach_flows')
            .select('id')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (flowError || !flow) {
            return notFound(res, { message: 'Flow not found' });
        }

        // Get execution counts grouped by client
        const { data: executions, error: execError } = await supabase
            .from('flow_executions')
            .select('client_id')
            .eq('flow_id', id)
            .eq('coach_id', userId);

        if (execError) {
            return res.status(500).json({ success: false, message: execError.message });
        }

        // Group by client_id and count
        const countMap = new Map<string, number>();
        for (const row of executions || []) {
            countMap.set(row.client_id, (countMap.get(row.client_id) || 0) + 1);
        }

        if (countMap.size === 0) {
            return success(res, {
                message: 'Flow stats retrieved successfully',
                data: { stats: [] },
            });
        }

        // Fetch client details from coach_clients_view
        const clientIds = Array.from(countMap.keys());
        const { data: clients, error: clientError } = await supabase
            .from('coach_clients_view')
            .select('client_id, full_name, avatar_url')
            .in('client_id', clientIds);

        if (clientError) {
            return res.status(500).json({ success: false, message: clientError.message });
        }

        const clientMap = new Map<string, { name: string; avatar_url: string }>();
        for (const c of clients || []) {
            clientMap.set(c.client_id, {
                name: c.full_name || 'Unknown',
                avatar_url: c.avatar_url || '',
            });
        }

        const stats = Array.from(countMap.entries()).map(([clientId, count]) => ({
            client_id: clientId,
            name: clientMap.get(clientId)?.name || 'Unknown',
            avatar_url: clientMap.get(clientId)?.avatar_url || '',
            execution_count: count,
        }));

        // Sort by execution_count descending
        stats.sort((a, b) => b.execution_count - a.execution_count);

        success(res, {
            message: 'Flow stats retrieved successfully',
            data: { stats },
        });
    },

    /**
     * Delete a flow
     */
    deleteFlow: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_flows')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
