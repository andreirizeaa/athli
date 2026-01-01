import { Request, Response } from 'express';
import { success, unauthorized, created, forbidden, internalError, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

const mapWorkoutResponse = (workout: any) => {
    if (!workout) return null;
    const {
        workout_data,
        // We want these in the response, but might need mapping/defaults
        // So we destruct them to control the output
        description,
        type,
        difficulty,
        equipment,
        total_exercises,
        ...rest
    } = workout;

    return {
        ...rest,
        // Top level fields (prefer DB columns, fallback to legacy workout_data)
        description: description || workout_data?.description || '',
        type: type || workout_data?.type || '',
        difficulty: difficulty || workout_data?.difficulty || 'intermediate',
        equipment: equipment || workout_data?.equipment || [],
        totalExercises: total_exercises ?? workout_data?.totalExercises ?? 0,

        // Extracted complex objects from workout_data
        items: workout_data?.items || [],
        pre: workout_data?.pre || { readiness: null },
        post: workout_data?.post || { rating: null, intensity: null, overallNotes: '', sessionComments: '' },
        completedSummary: workout_data?.completedSummary || workout_data?.meta || { status: 'not_started', startedAt: null, completedAt: null, totalDurationMin: null, totalWeightLifted: null },
    };
};

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
            data: { workouts: workouts?.map(mapWorkoutResponse) || [] },
        });
    },

    /**
     * Create a new coach workout
     */
    createWorkout: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { title, name, description, type, equipment, difficulty, workout_data, total_exercises } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const workoutName = name || title;

        if (!workoutName) {
            return res.status(400).json({ success: false, message: 'Workout name is required' });
        }

        // Extract only the workout structure (items and execution tracking) for workout_data
        // Includes complete workout information (metadata + execution)
        const cleanWorkoutData = workout_data ? {
            items: workout_data.items || [],


            // Execution tracking (grouped)
            pre: workout_data.pre || {
                readiness: workout_data.readiness ?? null,
            },
            post: workout_data.post || {
                rating: workout_data.rating ?? null,
                intensity: workout_data.intensity ?? null,
                overallNotes: workout_data.overallNotes ?? '',
                sessionComments: (Array.isArray(workout_data.sessionComments) ? workout_data.sessionComments.join('\n') : workout_data.sessionComments) ?? '',
            },
            completedSummary: workout_data.completedSummary || workout_data.meta || {
                status: workout_data.status ?? 'not_started',
                startedAt: workout_data.startedAt ?? null,
                completedAt: workout_data.completedAt ?? null,
                totalDurationMin: workout_data.totalDurationMin ?? null,
                totalWeightLifted: workout_data.totalWeightLifted ?? null,
            },
        } : {
            items: [],
            pre: { readiness: null },
            post: { rating: null, intensity: null, overallNotes: '', sessionComments: '' },
            completedSummary: { status: 'not_started', startedAt: null, completedAt: null, totalDurationMin: null, totalWeightLifted: null }
        };

        const supabase = getSupabaseClient();
        const { data: workout, error } = await supabase
            .from('coach_workouts')
            .insert({
                coach_id: userId,
                name: workoutName,
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
            data: { workout: mapWorkoutResponse(workout) },
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
        const { title, name, workout_data, ...rest } = updates;
        const workoutName = name || title;

        // Clean workout_data if provided
        const cleanWorkoutData = workout_data ? {
            items: workout_data.items || [],

            // Nested execution fields
            pre: workout_data.pre || {
                readiness: workout_data.readiness ?? null,
            },
            post: workout_data.post || {
                rating: workout_data.rating ?? null,
                intensity: workout_data.intensity ?? null,
                overallNotes: workout_data.overallNotes ?? '',
                sessionComments: (Array.isArray(workout_data.sessionComments) ? workout_data.sessionComments.join('\n') : workout_data.sessionComments) ?? '',
            },
            completedSummary: workout_data.completedSummary || workout_data.meta || {
                status: workout_data.status ?? 'not_started',
                startedAt: workout_data.startedAt ?? null,
                completedAt: workout_data.completedAt ?? null,
                totalDurationMin: workout_data.totalDurationMin ?? null,
                totalWeightLifted: workout_data.totalWeightLifted ?? null,
            },
        } : undefined;

        const mappedUpdates = {
            ...rest,
            ...(workoutName ? { name: workoutName } : {}),
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
            data: { workout: mapWorkoutResponse(workout) },
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
            data: { workout: mapWorkoutResponse(workout) },
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
            data: { workout: mapWorkoutResponse(workout) },
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
            data: { workouts: workouts?.map(mapWorkoutResponse) || [] },
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
            data: { workout: mapWorkoutResponse(workout) },
        });
    },
};
