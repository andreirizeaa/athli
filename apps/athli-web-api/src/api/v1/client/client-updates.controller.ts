import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientUpdatesController = {
    /**
     * Get all updates for a specific client
     * Can be called by the client themselves or by their coach
     */
    getUpdates: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_updates')
            .select('*')
            .eq('client_id', targetClientId)
            .order('update_timestamp', { ascending: false });

        if (isCoachView) {
            query = query.eq('coach_id', userId);
        }

        const { data: updates, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client updates retrieved successfully',
            data: { updates },
        });
    },

    /**
     * Create a new update for a client
     * Only coaches can create updates
     */
    createUpdate: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');
        const { update, update_timestamp } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!update) {
            return res.status(400).json({ success: false, message: 'Update text is required' });
        }

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Only coaches can create client updates' });
        }

        const supabase = getSupabaseClient();

        const insertData: any = {
            client_id: targetClientId,
            coach_id: userId,
            update,
            update_timestamp: update_timestamp || new Date().toISOString(),
        };

        const { data: newUpdate, error } = await supabase
            .from('client_updates')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Update created successfully',
            data: { update: newUpdate },
        });
    },

    /**
     * Update an existing update
     * Only coaches can update
     */
    updateUpdate: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');
        const { id } = req.params;
        const { update, update_timestamp } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Only coaches can update client updates' });
        }

        const supabase = getSupabaseClient();
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (update !== undefined) updateData.update = update;
        if (update_timestamp !== undefined) updateData.update_timestamp = update_timestamp;

        const { data: updatedUpdate, error } = await supabase
            .from('client_updates')
            .update(updateData)
            .eq('id', id)
            .eq('coach_id', userId)
            .eq('client_id', targetClientId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!updatedUpdate) {
            return notFound(res, { message: 'Update not found' });
        }

        success(res, {
            message: 'Update updated successfully',
            data: { update: updatedUpdate },
        });
    },

    /**
     * Delete an update
     * Only coaches can delete
     */
    deleteUpdate: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Only coaches can delete client updates' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_updates')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId)
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },

    /**
     * Bulk delete updates
     * Only coaches can bulk delete
     */
    bulkDeleteUpdates: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');
        const { updateIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Only coaches can delete client updates' });
        }

        if (!Array.isArray(updateIds) || updateIds.length === 0) {
            return res.status(400).json({ success: false, message: 'updateIds must be a non-empty array' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_updates')
            .delete()
            .in('id', updateIds)
            .eq('coach_id', userId)
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
