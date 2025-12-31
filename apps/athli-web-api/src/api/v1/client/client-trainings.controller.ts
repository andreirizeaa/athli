import { Request, Response } from 'express';
import { success, unauthorized, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

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
            .select('date, training_data, day_status, started_at, completed_at')
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
        const calendar: { [date: string]: any[] } = {};

        if (trainingData) {
            trainingData.forEach((entry) => {
                // Format date as dd-mm-yyyy for frontend compatibility
                const [year, month, day] = entry.date.split('-');
                const formattedDate = `${day}-${month}-${year}`;

                // training_data is a JSONB array of workouts
                const workouts = Array.isArray(entry.training_data) ? entry.training_data : [];

                // OPTIMIZATION: Return only metadata
                calendar[formattedDate] = workouts.map((workout: any) => ({
                    id: workout.id,
                    workout: workout.program || workout.title || workout.name || workout.workoutName || 'Untitled Workout', // Map title/name to workout
                    description: workout.description,
                    totalExercises: workout.totalExercises || workout.total_exercises || workout.exercises?.length || 0, // Handle snake_case total_exercises
                    type: workout.type,
                    difficulty: workout.difficulty,
                    equipment: workout.equipment,
                    isFavourite: workout.isFavourite || workout.is_favourite, // Handle snake_case is_favourite
                    // Strip heavy fields: items, sections, workout_data
                }));
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

        const workout = (entry.training_data as any[]).find((w: any) => w.id === workoutId);

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

        let trainingData: any[] = existingEntry?.training_data || [];

        // Prepare workout object
        let workoutToSave: any;

        if (isNew && workoutPayload) {
            // New workout created in-place
            workoutToSave = {
                ...workoutPayload,
                id: workoutPayload.id || `workout-${Date.now()}`,
                assigned_by: userId,
                assigned_at: new Date().toISOString()
            };
        } else if (workoutId) {
            // Assigning existing workout (fetch from coach_workouts if needed, or just partial data)
            // Ideally we should fetch full workout content if not provided.
            // For now assuming the frontend sends enough or we fetch.
            // If just ID is sent, we need to fetch it.
            if (!workoutPayload) {
                const { data: coachWorkout, error: workoutError } = await supabase
                    .from('coach_workouts')
                    .select('*')
                    .eq('id', workoutId)
                    .single();

                if (workoutError || !coachWorkout) {
                    return res.status(404).json({ success: false, message: 'Workout not found' });
                }
                workoutToSave = coachWorkout;
            } else {
                workoutToSave = workoutPayload;
            }

            // Ensure ID is preserved or made unique for this instance?
            // Usually valid to have same workout ID multiple times, 
            // but for tracking completion, unique instance IDs are better.
            // The frontend logic seems to generate unique IDs with timestamp suffix.
            // We'll trust the payload's ID or fallback.
            workoutToSave = {
                ...workoutToSave,
                id: workoutToSave.id || workoutId,
                assigned_by: userId,
                assigned_at: new Date().toISOString()
            };
        } else {
            return res.status(400).json({ success: false, message: 'workoutId or workoutPayload required' });
        }

        // Add or Update in array
        // If ID exists, update. Else push.
        const existingIndex = trainingData.findIndex((w: any) => w.id === workoutToSave.id);
        if (existingIndex >= 0) {
            trainingData[existingIndex] = workoutToSave;
        } else {
            trainingData.push(workoutToSave);
        }

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

        let trainingData: any[] = existingEntry.training_data || [];
        const initialLength = trainingData.length;

        // Filter out
        trainingData = trainingData.filter((w: any) => w.id !== workoutId);

        if (trainingData.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Workout instance not found in this date' });
        }

        // 2. Update or Delete Row
        if (trainingData.length === 0) {
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

        const sourceWorkouts = Array.isArray(sourceEntry.training_data) ? sourceEntry.training_data : [];
        const workoutToDuplicate = sourceWorkouts.find((w: any) => w.id === sourceWorkoutId);

        if (!workoutToDuplicate) {
            return res.status(404).json({ success: false, message: 'Workout not found in source date' });
        }

        // 2. Create new workout with unique ID
        const newWorkoutId = `${sourceWorkoutId.split('-')[0]}-${targetDate}-${Date.now()}`;
        const duplicatedWorkout = {
            ...workoutToDuplicate,
            id: newWorkoutId,
            duplicated_from: sourceWorkoutId,
            duplicated_at: new Date().toISOString(),
            assigned_by: userId,
            assigned_at: new Date().toISOString()
        };

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

        let targetTrainingData: any[] = targetEntry?.training_data || [];
        targetTrainingData.push(duplicatedWorkout);

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
            data: { newWorkoutId, workout: duplicatedWorkout }
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

        let trainingData: any[] = existingEntry.training_data || [];
        const initialLength = trainingData.length;

        // Filter out the workout
        trainingData = trainingData.filter((w: any) => w.id !== workoutId);

        if (trainingData.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Workout not found in this date' });
        }

        // 2. Update or delete row
        if (trainingData.length === 0) {
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
