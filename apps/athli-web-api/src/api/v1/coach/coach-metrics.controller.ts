import { Request, Response } from 'express';
import { success, unauthorized, created } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachMetricsController = {
    /**
     * Get all metrics for a coach
     */
    getMetrics: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: metrics, error } = await supabase
            .from('coach_metrics')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach metrics retrieved successfully',
            data: { metrics },
        });
    },

    /**
     * Create a new coach metric
     */
    createMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, unit, description, value_kind, min_value, max_value } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Metric name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: metric, error } = await supabase
            .from('coach_metrics')
            .insert({
                coach_id: userId,
                name,
                unit,
                description,
                value_kind: value_kind || 'number',
                min_value,
                max_value
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach metric created successfully',
            data: { metric },
        });
    },

    /**
     * Update an existing coach metric
     */
    updateMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing } = await supabase
            .from('coach_metrics')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { data: metric, error } = await supabase
            .from('coach_metrics')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach metric updated successfully',
            data: { metric },
        });
    },

    /**
     * Delete a coach metric
     */
    deleteMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // RLS should handle this, but explicit check for better error message
        const { error } = await supabase
            .from('coach_metrics')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach metric deleted successfully',
        });
    },

    /**
     * Duplicate a coach metric
     */
    duplicateMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch original
        const { data: original, error: fetchError } = await supabase
            .from('coach_metrics')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !original) {
            return res.status(404).json({ success: false, message: 'Metric not found' });
        }

        // Create copy
        const { data: metric, error: createError } = await supabase
            .from('coach_metrics')
            .insert({
                coach_id: userId,
                name: `${original.name} (Copy)`,
                unit: original.unit,
                description: original.description,
                value_kind: original.value_kind,
                min_value: original.min_value,
                max_value: original.max_value,
            })
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ success: false, message: createError.message });
        }

        created(res, {
            message: 'Coach metric duplicated successfully',
            data: { metric },
        });
    },
};
