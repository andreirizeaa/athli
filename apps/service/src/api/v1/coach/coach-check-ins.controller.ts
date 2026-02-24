import { Request, Response } from 'express';
import { success, unauthorized, created } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachCheckInsController = {
    /**
     * Get all check-ins for a coach
     */
    getCheckIns: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: checkIns, error } = await supabase
            .from('coach_checkins')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach check-ins retrieved successfully',
            data: { checkIns },
        });
    },

    /**
     * Get a single check-in by ID
     */
    getCheckInById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: checkIn, error } = await supabase
            .from('coach_checkins')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error || !checkIn) {
            return res.status(404).json({ success: false, message: 'Check-in not found' });
        }

        success(res, {
            message: 'Coach check-in retrieved successfully',
            data: { checkIn },
        });
    },

    /**
     * Create a new coach check-in
     */
    createCheckIn: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, questions, schedule_config, cron_expression, num_of_questions } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Check-in name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: checkIn, error } = await supabase
            .from('coach_checkins')
            .insert({
                coach_id: userId,
                name,
                description,
                questions: questions || [],
                schedule_config: schedule_config || {},
                cron_expression: cron_expression || null,
                num_of_questions: num_of_questions || 0,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach check-in created successfully',
            data: { checkIn },
        });
    },

    /**
     * Update an existing coach check-in
     */
    updateCheckIn: async (req: Request, res: Response) => {
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
            .from('coach_checkins')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { data: checkIn, error } = await supabase
            .from('coach_checkins')
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
            message: 'Coach check-in updated successfully',
            data: { checkIn },
        });
    },

    /**
     * Delete a coach check-in
     */
    deleteCheckIn: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_checkins')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach check-in deleted successfully',
        });
    },

    /**
     * Get all check-ins awaiting review for a coach
     */
    getCheckInReviews: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: rows, error } = await supabase
            .from('coach_checkins_review_view')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Map view columns to the CheckInReview interface
        const allReviews = (rows || []).map((r: any) => ({
            checkin_log_id: r.log_id,
            client_id: r.client_id,
            coach_checkin_id: r.assignment_id,
            client_name: r.client_name,
            client_avatar: r.client_avatar,
            client_email: r.client_email || '',
            checkin_name: r.checkin_name,
            checkin_description: r.checkin_description || null,
            submission_date: r.submission_date,
            created_at: r.created_at,
            status: r.review_status,
            updated_at: r.created_at,
            coach_id: r.coach_id,
        }));

        // Deduplicate: if the same client has multiple assignments for the same
        // check-in template, keep only the most recent log per (client, name, date).
        // Rows are already ordered by created_at DESC so the first seen wins.
        const seen = new Set<string>();
        const reviews = allReviews.filter((r: any) => {
            const key = `${r.client_id}_${r.checkin_name}_${r.submission_date}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        success(res, {
            message: 'Coach check-in reviews retrieved successfully',
            data: { reviews },
        });
    },

    /**
     * Duplicate an existing coach check-in
     */
    duplicateCheckIn: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // 1. Fetch original check-in
        const { data: original, error: fetchError } = await supabase
            .from('coach_checkins')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !original) {
            return res.status(404).json({ success: false, message: 'Check-in not found' });
        }

        // 2. Insert as new check-in
        const { id: _, created_at: __, updated_at: ___, ...rest } = original;
        const { data: duplicated, error: insertError } = await supabase
            .from('coach_checkins')
            .insert({
                ...rest,
                name: `${original.name} (Copy)`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ success: false, message: insertError.message });
        }

        created(res, {
            message: 'Coach check-in duplicated successfully',
            data: { checkIn: duplicated },
        });
    },
};
