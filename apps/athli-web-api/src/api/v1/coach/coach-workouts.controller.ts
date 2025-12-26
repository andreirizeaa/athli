import { Request, Response } from 'express';
import { success, unauthorized, created, forbidden, internalError, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachWorkoutsController = {
    /**
     * Get all workouts for a coach
     */
    getWorkouts: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: workouts, error } = await supabase
            .from('coach_workouts')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach workouts retrieved successfully',
            data: { workouts },
        });
    },

    /**
     * Create a new coach workout
     */
    createWorkout: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { title, description, type, equipment, difficulty, workout_data, total_exercises } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!title) {
            return res.status(400).json({ success: false, message: 'Workout title is required' });
        }

        const supabase = getSupabaseClient();
        const { data: workout, error } = await supabase
            .from('coach_workouts')
            .insert({
                coach_id: userId,
                name: title,
                description,
                type,
                equipment,
                difficulty,
                workout_data: workout_data || {},
                total_exercises: total_exercises || 0,
            })
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        created(res, {
            message: 'Coach workout created successfully',
            data: { workout },
        });
    },

    /**
     * Update an existing coach workout
     */
    updateWorkout: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership
        const { data: existing, error: fetchError } = await supabase
            .from('coach_workouts')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Workout not found' });
        }

        if (existing.coach_id !== userId) {
            return forbidden(res, { message: 'Forbidden' });
        }

        // Map frontend fields to backend fields if necessary
        const { title, ...rest } = updates;
        const mappedUpdates = {
            ...rest,
            ...(title ? { name: title } : {}),
            updated_at: new Date().toISOString(),
        };

        const { data: workout, error } = await supabase
            .from('coach_workouts')
            .update(mappedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach workout updated successfully',
            data: { workout },
        });
    },

    /**
     * Delete a coach workout
     */
    deleteWorkout: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_workouts')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach workout deleted successfully',
        });
    },

    /**
     * Duplicate a workout
     */
    duplicateWorkout: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch original
        const { data: original, error: fetchError } = await supabase
            .from('coach_workouts')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !original) {
            return notFound(res, { message: 'Workout not found' });
        }

        // Create copy
        const { data: workout, error: createError } = await supabase
            .from('coach_workouts')
            .insert({
                coach_id: userId,
                name: `${original.name} (Copy)`,
                description: original.description,
                type: original.type,
                equipment: original.equipment,
                difficulty: original.difficulty,
                workout_data: original.workout_data,
                total_exercises: original.total_exercises,
            })
            .select()
            .single();

        if (createError) {
            return internalError(res, { message: createError.message });
        }

        created(res, {
            message: 'Coach workout duplicated successfully',
            data: { workout },
        });
    },
};
