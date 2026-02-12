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
        const { name, unit, description, value_kind, min_value, max_value, schedule_config, cron_expression } = req.body;

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
                max_value,
                schedule_config,
                cron_expression,
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
                schedule_config: original.schedule_config,
                cron_expression: original.cron_expression,
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

    // =============================================================================
    // Folder Operations
    // =============================================================================

    /**
     * Get all metric folders for a coach
     */
    getFolders: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: folders, error } = await supabase
            .from('coach_metric_folders')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Metric folders retrieved successfully',
            data: { folders },
        });
    },

    /**
     * Create a new metric folder
     */
    createFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Folder name is required' });
        }

        const supabase = getSupabaseClient();

        // Check for existing folders with same name and generate unique name
        let finalName = name;
        const { data: existingFolders } = await supabase
            .from('coach_metric_folders')
            .select('name')
            .eq('coach_id', userId)
            .ilike('name', `${name}%`);

        if (existingFolders && existingFolders.length > 0) {
            const existingNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
            if (existingNames.has(name.toLowerCase())) {
                let copyNum = 1;
                let newName = `${name} (Copy)`;
                while (existingNames.has(newName.toLowerCase())) {
                    copyNum++;
                    newName = `${name} (Copy ${copyNum})`;
                }
                finalName = newName;
            }
        }

        const { data: folder, error } = await supabase
            .from('coach_metric_folders')
            .insert({
                coach_id: userId,
                name: finalName,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Metric folder created successfully',
            data: { folder },
        });
    },

    /**
     * Update a metric folder
     */
    updateFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { name } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing } = await supabase
            .from('coach_metric_folders')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Check for existing folders with same name (excluding current folder) and generate unique name
        let finalName = name;
        const { data: existingFolders } = await supabase
            .from('coach_metric_folders')
            .select('name')
            .eq('coach_id', userId)
            .neq('id', id)
            .ilike('name', `${name}%`);

        if (existingFolders && existingFolders.length > 0) {
            const existingNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
            if (existingNames.has(name.toLowerCase())) {
                let copyNum = 1;
                let newName = `${name} (Copy)`;
                while (existingNames.has(newName.toLowerCase())) {
                    copyNum++;
                    newName = `${name} (Copy ${copyNum})`;
                }
                finalName = newName;
            }
        }

        const { data: folder, error } = await supabase
            .from('coach_metric_folders')
            .update({
                name: finalName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Metric folder updated successfully',
            data: { folder },
        });
    },

    /**
     * Delete a metric folder (items inside become unfiled)
     */
    deleteFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // First, unfile all metrics in this folder
        await supabase
            .from('coach_metrics')
            .update({ folder_id: null })
            .eq('folder_id', id)
            .eq('coach_id', userId);

        // Then delete the folder
        const { error } = await supabase
            .from('coach_metric_folders')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Metric folder deleted successfully',
        });
    },

    /**
     * Move a metric to a folder (or out of folder if folder_id is null)
     */
    moveMetric: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { folder_id } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure metric ownership
        const { data: existing } = await supabase
            .from('coach_metrics')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // If folder_id is provided, verify ownership
        if (folder_id) {
            const { data: folder } = await supabase
                .from('coach_metric_folders')
                .select('coach_id')
                .eq('id', folder_id)
                .single();

            if (!folder || folder.coach_id !== userId) {
                return res.status(403).json({ success: false, message: 'Folder not found' });
            }
        }

        const { data: metric, error } = await supabase
            .from('coach_metrics')
            .update({
                folder_id: folder_id || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Metric moved successfully',
            data: { metric },
        });
    },

    /**
     * Get metrics in a specific folder
     */
    getMetricsInFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: metrics, error } = await supabase
            .from('coach_metrics')
            .select('*')
            .eq('coach_id', userId)
            .eq('folder_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Metrics in folder retrieved successfully',
            data: { metrics },
        });
    },
};
