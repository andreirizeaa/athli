import { Request, Response } from 'express';
import { success, unauthorized, created } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachHabitsController = {
    /**
     * Get all habits for a coach
     */
    getHabits: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: habits, error } = await supabase
            .from('coach_habits')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach habits retrieved successfully',
            data: { habits },
        });
    },

    /**
     * Create a new coach habit
     */
    createHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const {
            name,
            description,
            schedule_type,
            days_of_week,
            times_of_day,
            timezone,
            start_date,
            end_date,
            schedule_config
        } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Habit name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: habit, error } = await supabase
            .from('coach_habits')
            .insert({
                coach_id: userId,
                name,
                description,
                schedule_type: schedule_type || 'daily',
                days_of_week,
                times_of_day,
                timezone: timezone || 'UTC',
                start_date,
                end_date,
                schedule_config: schedule_config || {}
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach habit created successfully',
            data: { habit },
        });
    },

    /**
     * Update an existing coach habit
     */
    updateHabit: async (req: Request, res: Response) => {
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
            .from('coach_habits')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { data: habit, error } = await supabase
            .from('coach_habits')
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
            message: 'Coach habit updated successfully',
            data: { habit },
        });
    },

    /**
     * Delete a coach habit
     */
    deleteHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_habits')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach habit deleted successfully',
        });
    },

    /**
     * Duplicate a coach habit
     */
    duplicateHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch original
        const { data: original, error: fetchError } = await supabase
            .from('coach_habits')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !original) {
            return res.status(404).json({ success: false, message: 'Habit not found' });
        }

        // Create copy
        const { data: habit, error: createError } = await supabase
            .from('coach_habits')
            .insert({
                coach_id: userId,
                name: `${original.name} (Copy)`,
                description: original.description,
                schedule_type: original.schedule_type,
                days_of_week: original.days_of_week,
                times_of_day: original.times_of_day,
                timezone: original.timezone,
                start_date: original.start_date,
                end_date: original.end_date,
                schedule_config: original.schedule_config,
            })
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ success: false, message: createError.message });
        }

        created(res, {
            message: 'Coach habit duplicated successfully',
            data: { habit },
        });
    },
};
