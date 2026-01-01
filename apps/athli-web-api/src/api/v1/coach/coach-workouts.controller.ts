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

        // Extract only the workout structure (items and execution tracking) for workout_data
        // Includes complete workout information (metadata + execution)
        const cleanWorkoutData = workout_data ? {
            // Metadata fields
            title: title || '',
            description: description || '',
            type: type || '',
            difficulty: difficulty || 'intermediate',
            equipment: equipment || [],
            totalExercises: total_exercises || 0,
            items: workout_data.items || [],
            status: workout_data.status ?? 'not_started',
            startedAt: workout_data.startedAt ?? null,
            completedAt: workout_data.completedAt ?? null,
            totalDurationMin: workout_data.totalDurationMin ?? null,
            sessionComments: workout_data.sessionComments ?? [],
            totalWeightLifted: workout_data.totalWeightLifted ?? null,
            intensity: workout_data.intensity ?? null,
            readiness: workout_data.readiness ?? null,
            overallNotes: workout_data.overallNotes ?? '',
            rating: workout_data.rating ?? null,
        } : { items: [], status: 'not_started' };

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
                workout_data: cleanWorkoutData,
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
        const { id, ...updates } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Workout ID is required' });
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
        const { title, workout_data, ...rest } = updates;

        // Clean workout_data if provided
        const cleanWorkoutData = workout_data ? {
            // Metadata fields
            title: title || updates.title || '',
            description: updates.description || '',
            type: updates.type || '',
            difficulty: updates.difficulty || 'intermediate',
            equipment: updates.equipment || [],
            totalExercises: updates.total_exercises || 0, // Assuming total_exercises is passed in updates
            items: workout_data.items || [],
            status: workout_data.status ?? 'not_started',
            startedAt: workout_data.startedAt ?? null,
            completedAt: workout_data.completedAt ?? null,
            totalDurationMin: workout_data.totalDurationMin ?? null,
            sessionComments: workout_data.sessionComments ?? [],
            totalWeightLifted: workout_data.totalWeightLifted ?? null,
            intensity: workout_data.intensity ?? null,
            readiness: workout_data.readiness ?? null,
            overallNotes: workout_data.overallNotes ?? '',
            rating: workout_data.rating ?? null,
        } : undefined;

        const mappedUpdates = {
            ...rest,
            ...(title ? { name: title } : {}),
            ...(cleanWorkoutData ? { workout_data: cleanWorkoutData } : {}),
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
        const id = req.params.id || req.body.id;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Workout ID is required' });
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
        const id = req.params.id || req.body.id;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Workout ID is required' });
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
                is_favourite: false, // Reset favourite on duplicate
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

    /**
     * Get a single workout by ID
     */
    getWorkoutById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const id = req.params.id || req.body.id;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Workout ID is required' });
        }

        const supabase = getSupabaseClient();
        const { data: workout, error } = await supabase
            .from('coach_workouts')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error || !workout) {
            return notFound(res, { message: 'Workout not found' });
        }

        success(res, {
            message: 'Workout retrieved successfully',
            data: { workout },
        });
    },

    /**
     * Get multiple workouts by IDs
     */
    getWorkoutsByIds: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { ids } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'ids array is required' });
        }

        if (ids.length === 0) {
            success(res, {
                message: 'Workouts retrieved successfully',
                data: { workouts: [] },
            });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: workouts, error } = await supabase
            .from('coach_workouts')
            .select('*')
            .in('id', ids)
            .eq('coach_id', userId);

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Workouts retrieved successfully',
            data: { workouts },
        });
    },

    /**
     * Toggle favorite status
     */
    toggleFavorite: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id, isFavourite } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Workout ID is required' });
        }

        if (typeof isFavourite !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isFavourite boolean is required' });
        }

        const supabase = getSupabaseClient();

        const { data: workout, error } = await supabase
            .from('coach_workouts')
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

        if (!workout) {
            return notFound(res, { message: 'Workout not found' });
        }

        success(res, {
            message: `Workout ${isFavourite ? 'starred' : 'unstarred'} successfully`,
            data: { workout },
        });
    },
};
