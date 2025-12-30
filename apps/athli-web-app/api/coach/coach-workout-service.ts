import { apiFetch, type ApiResponse } from '@/api/api-client';
import type { WorkoutProgramPayload } from '@/app/training/workouts/new/workout-schema';
import type { Workout } from '@/components/app/app-shell';

/**
 * Service methods for workout operations
 */

export const getWorkouts = async (): Promise<Workout[]> => {
  const response = await apiFetch<ApiResponse<{ workouts: any[] }>>('/coach/training/workouts');
  return (response.data?.workouts || []).map((w) => ({
    id: w.id,
    program: w.name,
    description: w.description || '',
    type: w.type || '',
    difficulty: w.difficulty || '',
    length: w.workout_data?.totalDurationMin ? `${w.workout_data.totalDurationMin} min` : '0 min',
    totalExercises: w.total_exercises || 0,
    equipment: Array.isArray(w.equipment) ? w.equipment.join(', ') : w.equipment || '',
    created: w.created_at ? new Date(w.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    isFavourite: w.is_favourite || false,
    workout_data: w.workout_data,
  }));
};

/**
 * Star/Unstar workouts
 */
export const starWorkouts = async (workoutIds: string | string[], starred: boolean): Promise<void> => {
  const ids = Array.isArray(workoutIds) ? workoutIds : [workoutIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch('/coach/training/workouts/toggle-favorite', {
        method: 'POST',
        body: JSON.stringify({ id, isFavourite: starred }),
      })
    )
  );
};

/**
 * Archive/Unarchive workouts
 */
export const archiveWorkouts = async (
  workoutIds: string | string[],
  archived: boolean
): Promise<void> => {
  const ids = Array.isArray(workoutIds) ? workoutIds : [workoutIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch('/coach/training/workouts/update', {
        method: 'POST',
        body: JSON.stringify({ id, archived }),
      })
    )
  );
};

/**
 * Delete workouts
 */
export const deleteWorkouts = async (workoutIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(workoutIds) ? workoutIds : [workoutIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/workouts/${id}`, {
        method: 'DELETE',
      })
    )
  );
};

/**
 * Create a new workout
 */
export const createWorkout = async (workoutData: WorkoutProgramPayload): Promise<Workout> => {
  // Calculate total exercises from items
  const totalExercises = (workoutData.items || []).reduce((total, item) => {
    if (item.itemType === 'exercise') {
      // Top-level exercises count as 1
      return total + 1;
    } else if (item.itemType === 'section') {
      const section = item.data;
      if (section.type === 'regular' || section.type === 'auxiliary') {
        // Handle potentially undefined exercises array
        const exercises = section.exercises || [];
        return total + exercises.reduce((sum, group) => sum + (group.exercises?.length || 0), 0);
      } else if (section.type === 'circuits') {
        const exercises = section.exercises || [];
        return total + exercises.reduce((sum, group) => sum + (group.exercises?.length || 0), 0);
      } else if (section.type === 'amrap' || section.type === 'timed') {
        return total + (section.exercises?.length || 0);
      }
    }
    return total;
  }, 0);

  // Separate metadata from workout data
  const cleanWorkoutData = {
    items: workoutData.items,
    ...(workoutData.status && { status: workoutData.status }),
    ...(workoutData.startedAt && { startedAt: workoutData.startedAt }),
    ...(workoutData.completedAt && { completedAt: workoutData.completedAt }),
    ...(workoutData.totalDurationMin && { totalDurationMin: workoutData.totalDurationMin }),
    ...(workoutData.sessionComments && { sessionComments: workoutData.sessionComments }),
    ...(workoutData.totalWeightLifted && { totalWeightLifted: workoutData.totalWeightLifted }),
    ...(workoutData.intensity && { intensity: workoutData.intensity }),
    ...(workoutData.readiness && { readiness: workoutData.readiness }),
    ...(workoutData.overallNotes && { overallNotes: workoutData.overallNotes }),
    ...(workoutData.rating && { rating: workoutData.rating }),
  };

  const response = await apiFetch<ApiResponse<{ workout: Workout }>>('/coach/training/workouts', {
    method: 'POST',
    body: JSON.stringify({
      title: workoutData.title,
      description: workoutData.description,
      type: workoutData.type,
      equipment: workoutData.equipment,
      difficulty: workoutData.difficulty,
      workout_data: cleanWorkoutData,
      total_exercises: totalExercises,
    }),
  });
  if (!response.data) throw new Error('No workout returned');
  return response.data.workout;
};

/**
 * Update an existing workout
 */
export const editWorkout = async (
  workoutId: string,
  workoutData: WorkoutProgramPayload
): Promise<Workout> => {
  // Calculate total exercises from items
  const totalExercises = (workoutData.items || []).reduce((total, item) => {
    if (item.itemType === 'exercise') {
      // Top-level exercises count as 1
      return total + 1;
    } else if (item.itemType === 'section') {
      const section = item.data;
      if (section.type === 'regular' || section.type === 'auxiliary') {
        // Handle potentially undefined exercises array
        const exercises = section.exercises || [];
        return total + exercises.reduce((sum, group) => sum + (group.exercises?.length || 0), 0);
      } else if (section.type === 'circuits') {
        const exercises = section.exercises || [];
        return total + exercises.reduce((sum, group) => sum + (group.exercises?.length || 0), 0);
      } else if (section.type === 'amrap' || section.type === 'timed') {
        return total + (section.exercises?.length || 0);
      }
    }
    return total;
  }, 0);

  // Separate metadata from workout data
  const cleanWorkoutData = {
    items: workoutData.items,
    ...(workoutData.status && { status: workoutData.status }),
    ...(workoutData.startedAt && { startedAt: workoutData.startedAt }),
    ...(workoutData.completedAt && { completedAt: workoutData.completedAt }),
    ...(workoutData.totalDurationMin && { totalDurationMin: workoutData.totalDurationMin }),
    ...(workoutData.sessionComments && { sessionComments: workoutData.sessionComments }),
    ...(workoutData.totalWeightLifted && { totalWeightLifted: workoutData.totalWeightLifted }),
    ...(workoutData.intensity && { intensity: workoutData.intensity }),
    ...(workoutData.readiness && { readiness: workoutData.readiness }),
    ...(workoutData.overallNotes && { overallNotes: workoutData.overallNotes }),
    ...(workoutData.rating && { rating: workoutData.rating }),
  };

  const response = await apiFetch<ApiResponse<{ workout: Workout }>>('/coach/training/workouts/update', {
    method: 'POST',
    body: JSON.stringify({
      id: workoutId,
      title: workoutData.title,
      description: workoutData.description,
      type: workoutData.type,
      equipment: workoutData.equipment,
      difficulty: workoutData.difficulty,
      workout_data: cleanWorkoutData,
      total_exercises: totalExercises,
    }),
  });
  if (!response.data) throw new Error('No workout returned');
  return response.data.workout;
};

/**
 * Update workout details (metadata only)
 */
export const updateWorkoutDetails = async (
  workoutId: string,
  details: { title: string; type: string; difficulty: string; description: string }
): Promise<Workout> => {
  const response = await apiFetch<ApiResponse<{ workout: Workout }>>('/coach/training/workouts/update', {
    method: 'POST',
    body: JSON.stringify({ id: workoutId, ...details }),
  });
  if (!response.data) throw new Error('No workout returned');
  return response.data.workout;
};

/**
 * Duplicate a workout
 */
export const duplicateWorkout = async (workoutId: string): Promise<Workout> => {
  const response = await apiFetch<ApiResponse<{ workout: Workout }>>(`/coach/training/workouts/${workoutId}/duplicate`, {
    method: 'POST',
  });
  if (!response.data) throw new Error('No workout returned');
  return response.data.workout;
};

/**
 * Get workout by ID
 */
export const getWorkoutById = async (workoutId: string): Promise<Workout & { workout_data: WorkoutProgramPayload }> => {
  const response = await apiFetch<ApiResponse<{ workout: Workout & { workout_data: WorkoutProgramPayload } }>>(`/coach/training/workouts/${workoutId}`);
  if (!response.data) throw new Error('No workout returned');
  return response.data.workout;
};

/**
 * Get multiple workouts by IDs
 */
export const getWorkoutsByIds = async (ids: string[]): Promise<Workout[]> => {
  if (!ids || ids.length === 0) return [];
  const response = await apiFetch<ApiResponse<{ workouts: Workout[] }>>('/coach/training/workouts/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  return response.data?.workouts || [];
};
