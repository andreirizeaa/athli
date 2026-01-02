import { Request, Response } from 'express';
import { success, unauthorized, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

/**
 * Helper to normalize workout data structure:
 * - Converts legacy `meta` field to `completedSummary`
 * - Ensures workout_data uses completedSummary instead of meta
 */
const normalizeWorkoutData = (workout: any): any => {
    if (!workout) return workout;

    const normalized = { ...workout };

    // Handle top-level meta -> completedSummary conversion
    if (normalized.meta && !normalized.completedSummary) {
        normalized.completedSummary = normalized.meta;
        delete normalized.meta;
    }

    // Handle workout_data.meta -> workout_data.completedSummary conversion
    if (normalized.workout_data) {
        const workoutData = { ...normalized.workout_data };
        if (workoutData.meta && !workoutData.completedSummary) {
            workoutData.completedSummary = workoutData.meta;
            delete workoutData.meta;
        }
        normalized.workout_data = workoutData;
    }

    return normalized;
};

const ensureObjectData = (data: any): Record<string, any> => {
    if (!data) return {};
    if (Array.isArray(data)) {
        const obj: Record<string, any> = {};
        data.forEach((w, i) => {
            obj[`workout_${i + 1}`] = w;
        });
        return obj;
    }
    return data;
};

const getNextWorkoutKey = (data: Record<string, any>): string => {
    const keys = Object.keys(data).filter(k => /^workout_\d+$/.test(k));
    if (keys.length === 0) return 'workout_1';
    const indices = keys.map(k => parseInt(k.replace('workout_', ''), 10)).filter(n => !isNaN(n));
    if (indices.length === 0) return 'workout_1';
    const max = Math.max(...indices);
    return `workout_${max + 1}`;
};

/**
 * Extract exercise payloads from a workout.
 * Handles all section types: regular, auxiliary, amrap, timed, circuits.
 * Returns array of { exerciseId, exerciseData } objects.
 */
const extractExercisesFromWorkout = (workout: any): Array<{ exerciseId: string; exerciseData: any }> => {
    const exercises: Array<{ exerciseId: string; exerciseData: any }> = [];

    if (!workout?.items || !Array.isArray(workout.items)) {
        return exercises;
    }

    for (const item of workout.items) {
        if (item.itemType === 'section' && item.data) {
            const section = item.data;

            switch (section.type) {
                case 'regular':
                case 'auxiliary':
                    // ExerciseGroupPayload[] -> each group has exercises: RegularExercisePayload[]
                    if (Array.isArray(section.exercises)) {
                        for (const group of section.exercises) {
                            if (Array.isArray(group.exercises)) {
                                for (const exercise of group.exercises) {
                                    if (exercise.prescribedExerciseId) {
                                        exercises.push({
                                            exerciseId: exercise.performedExerciseId || exercise.prescribedExerciseId,
                                            exerciseData: exercise,
                                        });
                                    }
                                }
                            }
                        }
                    }
                    break;

                case 'amrap':
                case 'timed':
                    // RoundExercisePayload[] directly
                    if (Array.isArray(section.exercises)) {
                        for (const exercise of section.exercises) {
                            if (exercise.prescribedExerciseId) {
                                exercises.push({
                                    exerciseId: exercise.performedExerciseId || exercise.prescribedExerciseId,
                                    exerciseData: exercise,
                                });
                            }
                        }
                    }
                    break;

                case 'circuits':
                    // CircuitExerciseGroupPayload[] -> each group has exercises: CircuitExercisePayload[]
                    if (Array.isArray(section.exercises)) {
                        for (const group of section.exercises) {
                            if (Array.isArray(group.exercises)) {
                                for (const exercise of group.exercises) {
                                    if (exercise.prescribedExerciseId) {
                                        exercises.push({
                                            exerciseId: exercise.performedExerciseId || exercise.prescribedExerciseId,
                                            exerciseData: exercise,
                                        });
                                    }
                                }
                            }
                        }
                    }
                    break;
            }
        }
    }

    return exercises;
};

/**
 * Insert exercise history records for a completed workout.
 * Also upserts the training history record first (required for FK constraint).
 */
const insertExerciseHistory = async (
    supabase: any,
    clientId: string,
    coachId: string,
    date: string,
    workoutId: string,
    workout: any,
    status: 'not_started' | 'in_progress' | 'completed'
): Promise<void> => {
    // 1. Upsert training history record (required for FK constraint)
    const { error: historyError } = await supabase
        .from('client_training_history')
        .upsert({
            client_id: clientId,
            coach_id: coachId,
            date: date,
            workout_id: workoutId,
            status: status,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id, coach_id, date, workout_id' });

    if (historyError) {
        console.error('Error upserting training history:', historyError);
        throw historyError;
    }

    // 2. Only insert exercise history if workout is completed
    if (status !== 'completed') {
        return;
    }

    const exercises = extractExercisesFromWorkout(workout);

    if (exercises.length === 0) {
        return;
    }

    const workoutName = workout.name || workout.title || workout.program || 'Untitled Workout';

    // 3. Delete existing exercise history for this workout (to handle re-completion)
    await supabase
        .from('client_training_exercise_history')
        .delete()
        .eq('client_id', clientId)
        .eq('coach_id', coachId)
        .eq('date', date)
        .eq('workout_id', workoutId);

    // 4. Insert new exercise history records
    const exerciseRecords = exercises.map(({ exerciseId, exerciseData }) => ({
        client_id: clientId,
        coach_id: coachId,
        date: date,
        workout_id: workoutId,
        workout_name: workoutName,
        exercise_id: exerciseId,
        exercise_data: exerciseData,
    }));

    const { error: insertError } = await supabase
        .from('client_training_exercise_history')
        .insert(exerciseRecords);

    if (insertError) {
        console.error('Error inserting exercise history:', insertError);
        throw insertError;
    }
};

export const clientTrainingsController = {
    /**
     * Get all trainings assigned to a client
     */
    getTrainings: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        const supabase = getSupabaseClient();
        const { data: assignments, error } = await supabase
            .from('client_workout_assignments')
            .select('*, workout:coach_workouts(*)')
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client trainings retrieved successfully',
            data: { assignments },
        });
    },

    /**
     * Get training calendar for a client within a date range
     * Request body: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
     */
    getTrainingCalendar: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { startDate, endDate } = req.body;

        // Validate date parameters
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required in request body (format: YYYY-MM-DD)'
            });
        }

        // Validate date format (basic check)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        const supabase = getSupabaseClient();

        // Query the partitioned client_training table
        // This will benefit from partition pruning for optimal performance
        const { data: trainingData, error } = await supabase
            .from('client_training')
            .select('date, training_data')
            .eq('client_id', targetClientId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Transform data to match frontend format
        // Frontend expects: { [date: string]: Array<Workout> }
        // Backend returns: Array<{ date: string, training_data: Workout[] }>
        const calendar: { [date: string]: any } = {};

        if (trainingData) {
            trainingData.forEach((entry) => {
                // Format date as dd-mm-yyyy for frontend compatibility
                const [year, month, day] = entry.date.split('-');
                const formattedDate = `${day}-${month}-${year}`;

                // Ensure data is Object
                const workoutsMap = ensureObjectData(entry.training_data);

                // OPTIMIZATION: Return only metadata, mapped object
                const metadataMap: Record<string, any> = {};

                Object.entries(workoutsMap).forEach(([key, workoutVal]) => {
                    const workout = workoutVal as any;
                    metadataMap[key] = {
                        id: key, // Use Key as ID for frontend list
                        templateId: workout.id, // Preserve original ID
                        workout: workout.program || workout.title || workout.name || workout.workoutName || 'Untitled Workout',
                        description: workout.description,
                        totalExercises: workout.totalExercises || workout.total_exercises || workout.exercises?.length || 0,
                        type: workout.type,
                        difficulty: workout.difficulty,
                        equipment: workout.equipment,
                        isFavourite: workout.isFavourite || workout.is_favourite,
                        completedSummary: workout.completedSummary || workout.workout_data?.completedSummary || workout.meta || workout.workout_data?.meta || null,
                    };
                });

                calendar[formattedDate] = metadataMap;
            });
        }

        success(res, {
            message: 'Training calendar retrieved successfully',
            data: { calendar },
        });
    },

    /**
     * Get a specific workout instance from the calendar
     * Request body: { clientId, date, workoutId }
     */
    getWorkoutInstance: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { clientId, date, workoutId } = req.body;

        if (!clientId || !date || !workoutId) {
            return res.status(400).json({ success: false, message: 'clientId, date, and workoutId are required' });
        }

        const supabase = getSupabaseClient();

        const { data: entry, error } = await supabase
            .from('client_training')
            .select('training_data')
            .eq('client_id', clientId)
            .eq('date', date)
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!entry || !entry.training_data) {
            return res.status(404).json({ success: false, message: 'Training entry not found' });
        }

        const trainingData = ensureObjectData(entry.training_data);

        // Lookup by Key or ID
        let workout = trainingData[workoutId];

        if (!workout) {
            // Fallback: scan values for template ID
            workout = Object.values(trainingData).find((w: any) => w.id === workoutId);
        }

        if (!workout) {
            return res.status(404).json({ success: false, message: 'Workout instance not found' });
        }

        // Return FULL workout data
        success(res, {
            message: 'Workout instance retrieved successfully',
            data: { workout },
        });
    },


    /**
     * Assign a workout to a client's calendar
     * Request body: { clientId, date, workoutId, workoutPayload, isNew, coachId }
     */
    assignWorkout: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { clientId, date, workoutId, workoutPayload, isNew, coachId } = req.body;

        if (!clientId || !date) {
            return res.status(400).json({ success: false, message: 'clientId and date are required' });
        }

        const supabase = getSupabaseClient();

        // 1. Fetch existing day entry
        const { data: existingEntry, error: fetchError } = await supabase
            .from('client_training')
            .select('*')
            .eq('client_id', clientId)
            .eq('date', date)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
            return res.status(500).json({ success: false, message: fetchError.message });
        }

        let trainingData: Record<string, any> = ensureObjectData(existingEntry?.training_data);

        // Prepare workout object
        let workoutToSave: any;

        // Determine Key
        let instanceKey: string;
        // If workoutId passed and looks like Key, use it. Else generate.
        if (workoutId && /^workout_\d+$/.test(workoutId)) {
            instanceKey = workoutId;
        } else {
            // Try to find if UUID exists in values?
            // If we are strictly creating NEW, generate key.
            // If assigning EXISTING by UUID (drag drop from library), we create NEW instance -> Generate Key.
            instanceKey = getNextWorkoutKey(trainingData);
        }

        const existingInstance = trainingData[instanceKey];

        if (isNew && workoutPayload) {
            // New workout created in-place
            workoutToSave = normalizeWorkoutData({
                ...workoutPayload,
                id: workoutPayload.id || `workout-${Date.now()}`, // Template ID
                assigned_by: userId,
                assigned_at: new Date().toISOString()
            });
        } else if (workoutId) {
            if (!workoutPayload) {
                // Fetching from coach DB using workoutId (which might be Key or UUID)
                // If Key, we can't fetch from coach DB.
                // Assumes if no Payload, workoutId IS UUID.
                const { data: coachWorkout, error: workoutError } = await supabase
                    .from('coach_workouts')
                    .select('*')
                    .eq('id', workoutId)
                    .single();

                if (workoutError || !coachWorkout) {
                    // It might be we passed a Key but no payload? Error.
                    return res.status(404).json({ success: false, message: 'Workout not found' });
                }
                workoutToSave = normalizeWorkoutData(coachWorkout);
            } else {
                workoutToSave = normalizeWorkoutData(workoutPayload);
            }

            // ID Logic:
            // If updating existing instance (Key matched): preserve its Template ID.
            // If payload has ID, use it?
            const originalTemplateId = existingInstance?.id;
            // If payload has an ID that is NOT the Key, use it.
            // If payload ID is the Key (bad frontend behavior), fallback to original or workoutId (if UUID).
            let finalTemplateId = workoutToSave.id;
            if (finalTemplateId === instanceKey && originalTemplateId) {
                finalTemplateId = originalTemplateId;
            }
            if (!finalTemplateId && !/^workout_\d+$/.test(workoutId)) {
                finalTemplateId = workoutId; // Use workoutId if it's UUID
            }

            workoutToSave = {
                ...workoutToSave,
                id: finalTemplateId,
                assigned_by: userId,
                assigned_at: new Date().toISOString()
            };
        } else {
            return res.status(400).json({ success: false, message: 'workoutId or workoutPayload required' });
        }

        // Save to Map
        trainingData[instanceKey] = workoutToSave;

        // 2. Upsert
        const { error: upsertError } = await supabase
            .from('client_training')
            .upsert({
                client_id: clientId,
                date: date,
                coach_id: coachId || userId, // Fallback to current user (coach)
                training_data: trainingData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'client_id, date, coach_id' });

        if (upsertError) {
            console.error('Upsert error:', upsertError);
            return res.status(500).json({ success: false, message: upsertError.message });
        }

        // 3. Track training history and exercise history for completed workouts
        const workoutStatus = workoutToSave.completedSummary?.status;
        if (workoutStatus && (workoutStatus === 'completed' || workoutStatus === 'in_progress')) {
            try {
                await insertExerciseHistory(
                    supabase,
                    clientId,
                    coachId || userId,
                    date,
                    instanceKey,
                    workoutToSave,
                    workoutStatus
                );
            } catch (historyError) {
                // Log but don't fail the request - history is secondary to the main save
                console.error('Failed to insert exercise history:', historyError);
            }
        }

        success(res, { message: 'Workout assigned successfully' });
    },

    /**
     * Delete a workout from specific date
     */
    deleteWorkout: async (req: Request, res: Response) => {
        const { clientId, workoutId } = req.params;
        const { date } = req.query; // Date is usually query param here

        if (!clientId || !workoutId || !date) {
            return res.status(400).json({ success: false, message: 'clientId, workoutId and date are required' });
        }

        const supabase = getSupabaseClient();

        // 1. Fetch existing
        const { data: existingEntry, error: fetchError } = await supabase
            .from('client_training')
            .select('*')
            .eq('client_id', clientId)
            .eq('date', date)
            .single();

        if (fetchError) {
            return res.status(404).json({ success: false, message: 'Calendar entry not found' });
        }

        let trainingData: Record<string, any> = ensureObjectData(existingEntry.training_data);
        const initialCount = Object.keys(trainingData).length;

        // Delete by Key
        if (trainingData[workoutId]) {
            delete trainingData[workoutId];
        }

        if (Object.keys(trainingData).length === initialCount) {
            // If not found by key, try scan? No, deletion should be precise.
            return res.status(404).json({ success: false, message: 'Workout instance not found in this date' });
        }

        const remainingCount = Object.keys(trainingData).length;

        // 2. Update or Delete Row
        if (remainingCount === 0) {
            // Delete row if empty
            const { error: deleteError } = await supabase
                .from('client_training')
                .delete()
                .eq('client_id', clientId)
                .eq('date', date);

            if (deleteError) return res.status(500).json({ success: false, message: deleteError.message });
        } else {
            // Update with filtered list
            const { error: updateError } = await supabase
                .from('client_training')
                .update({
                    training_data: trainingData,
                    updated_at: new Date().toISOString()
                })
                .eq('client_id', clientId)
                .eq('date', date);

            if (updateError) return res.status(500).json({ success: false, message: updateError.message });
        }

        success(res, { message: 'Workout deleted successfully' });
    },

    /**
     * Update training status
     */
    updateTrainingStatus: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { status } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('client_workout_assignments')
            .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
            .eq('id', id)
            .eq('client_id', targetClientId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!data) {
            return notFound(res, { message: 'Training assignment not found' });
        }

        success(res, {
            message: 'Training status updated successfully',
            data: { assignment: data },
        });
    },

    /**
     * Duplicate a workout from one date to another
     * Request body: { clientId, sourceDate, sourceWorkoutId, targetDate }
     */
    duplicateWorkout: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { clientId, sourceDate, sourceWorkoutId, targetDate } = req.body;

        if (!clientId || !sourceDate || !sourceWorkoutId || !targetDate) {
            return res.status(400).json({
                success: false,
                message: 'clientId, sourceDate, sourceWorkoutId, and targetDate are required'
            });
        }

        const supabase = getSupabaseClient();

        // 1. Fetch source workout from source date
        const { data: sourceEntry, error: sourceError } = await supabase
            .from('client_training')
            .select('training_data, coach_id')
            .eq('client_id', clientId)
            .eq('date', sourceDate)
            .single();

        if (sourceError || !sourceEntry) {
            return res.status(404).json({ success: false, message: 'Source training entry not found' });
        }

        const sourceWorkouts = ensureObjectData(sourceEntry.training_data);
        const workoutToDuplicate = sourceWorkouts[sourceWorkoutId];

        if (!workoutToDuplicate) {
            return res.status(404).json({ success: false, message: 'Workout not found in source date' });
        }

        // 2. Create new workout 
        // We use the same Template ID (workoutToDuplicate.id), but generate new Key in target list.
        const duplicatedWorkout = normalizeWorkoutData({
            ...workoutToDuplicate,
            // id: ... preserve? Yes.
            duplicated_from: sourceWorkoutId,
            duplicated_at: new Date().toISOString(),
            assigned_by: userId,
            assigned_at: new Date().toISOString()
        });

        // 3. Fetch or create target date entry
        const { data: targetEntry, error: targetFetchError } = await supabase
            .from('client_training')
            .select('*')
            .eq('client_id', clientId)
            .eq('date', targetDate)
            .single();

        if (targetFetchError && targetFetchError.code !== 'PGRST116') {
            return res.status(500).json({ success: false, message: targetFetchError.message });
        }

        let targetTrainingData: Record<string, any> = ensureObjectData(targetEntry?.training_data);
        const newKey = getNextWorkoutKey(targetTrainingData);
        targetTrainingData[newKey] = duplicatedWorkout;

        // 4. Upsert target date
        const { error: upsertError } = await supabase
            .from('client_training')
            .upsert({
                client_id: clientId,
                date: targetDate,
                coach_id: sourceEntry.coach_id || userId,
                training_data: targetTrainingData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'client_id, date, coach_id' });

        if (upsertError) {
            return res.status(500).json({ success: false, message: upsertError.message });
        }

        success(res, {
            message: 'Workout duplicated successfully',
            data: { newWorkoutId: newKey, workout: duplicatedWorkout }
        });
    },

    /**
     * Delete a workout using sourceDate and workoutId as the key
     * Request body: { clientId, sourceDate, workoutId }
     */
    deleteWorkoutByKey: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { clientId, sourceDate, workoutId } = req.body;

        if (!clientId || !sourceDate || !workoutId) {
            return res.status(400).json({
                success: false,
                message: 'clientId, sourceDate, and workoutId are required'
            });
        }

        const supabase = getSupabaseClient();

        // 1. Fetch existing entry
        const { data: existingEntry, error: fetchError } = await supabase
            .from('client_training')
            .select('*')
            .eq('client_id', clientId)
            .eq('date', sourceDate)
            .single();

        if (fetchError) {
            return res.status(404).json({ success: false, message: 'Calendar entry not found' });
        }

        let trainingData: Record<string, any> = ensureObjectData(existingEntry.training_data);
        const initialCount = Object.keys(trainingData).length;

        // Delete by Key
        if (trainingData[workoutId]) {
            delete trainingData[workoutId];
        }

        if (Object.keys(trainingData).length === initialCount) {
            return res.status(404).json({ success: false, message: 'Workout not found in this date' });
        }

        const remainingCount = Object.keys(trainingData).length;

        // 2. Update or delete row
        if (remainingCount === 0) {
            const { error: deleteError } = await supabase
                .from('client_training')
                .delete()
                .eq('client_id', clientId)
                .eq('date', sourceDate);

            if (deleteError) return res.status(500).json({ success: false, message: deleteError.message });
        } else {
            const { error: updateError } = await supabase
                .from('client_training')
                .update({
                    training_data: trainingData,
                    updated_at: new Date().toISOString()
                })
                .eq('client_id', clientId)
                .eq('date', sourceDate);

            if (updateError) return res.status(500).json({ success: false, message: updateError.message });
        }

        success(res, { message: 'Workout deleted successfully' });
    },
};
