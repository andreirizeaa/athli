import { Request, Response } from 'express';
import { success, unauthorized, created, forbidden, internalError, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachExercisesController = {
    /**
     * Get all exercises for a coach
     */
    getExercises: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: exercises, error } = await supabase
            .from('coach_exercises')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach exercises retrieved successfully',
            data: { exercises },
        });
    },

    /**
     * Create a new coach exercise
     */
    createExercise: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, category, muscle_group, equipment, modality, video_link } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Exercise name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .insert({
                coach_id: userId,
                name,
                description,
                category,
                muscle_group,
                equipment,
                modality,
                video_link,
            })
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        created(res, {
            message: 'Coach exercise created successfully',
            data: { exercise },
        });
    },

    /**
     * Update an existing coach exercise
     */
    updateExercise: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing, error: fetchError } = await supabase
            .from('coach_exercises')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Exercise not found' });
        }

        if (existing.coach_id !== userId) {
            return forbidden(res, { message: 'Forbidden' });
        }

        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach exercise updated successfully',
            data: { exercise },
        });
    },

    /**
     * Delete a coach exercise
     */
    deleteExercise: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_exercises')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach exercise deleted successfully',
        });
    },

    /**
     * Toggle favorite status
     */
    toggleFavorite: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { isFavourite } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (typeof isFavourite !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isFavourite boolean is required' });
        }

        const supabase = getSupabaseClient();

        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .update({
                is_favourite: isFavourite,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        if (!exercise) {
            return notFound(res, { message: 'Exercise not found' });
        }

        success(res, {
            message: `Exercise ${isFavourite ? 'starred' : 'unstarred'} successfully`,
            data: { exercise },
        });
    },
};
