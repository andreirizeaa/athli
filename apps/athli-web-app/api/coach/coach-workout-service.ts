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
  }));
};

/**
 * Star/Unstar workouts
 */
export const starWorkouts = async (workoutIds: string | string[], starred: boolean): Promise<void> => {
  const ids = Array.isArray(workoutIds) ? workoutIds : [workoutIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/workouts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ starred }),
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
      apiFetch(`/coach/training/workouts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived }),
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
  // Calculate total exercises from sections
  const totalExercises = workoutData.sections.reduce((total, section) => {
    if (section.type === 'regular') {
      return total + section.exercises.reduce((sum, group) => sum + group.exercises.length, 0);
    }
    return total + section.exercises.length;
  }, 0);

  const response = await apiFetch<ApiResponse<{ workout: Workout }>>('/coach/training/workouts', {
    method: 'POST',
    body: JSON.stringify({
      title: workoutData.title,
      description: workoutData.description,
      type: workoutData.type,
      equipment: workoutData.equipment,
      difficulty: workoutData.difficulty,
      workout_data: workoutData,
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
  // Calculate total exercises from sections
  const totalExercises = workoutData.sections.reduce((total, section) => {
    if (section.type === 'regular') {
      return total + section.exercises.reduce((sum, group) => sum + group.exercises.length, 0);
    }
    return total + section.exercises.length;
  }, 0);

  const response = await apiFetch<ApiResponse<{ workout: Workout }>>(`/coach/training/workouts/${workoutId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: workoutData.title,
      description: workoutData.description,
      type: workoutData.type,
      equipment: workoutData.equipment,
      difficulty: workoutData.difficulty,
      workout_data: workoutData,
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
  const response = await apiFetch<ApiResponse<{ workout: Workout }>>(`/coach/training/workouts/${workoutId}`, {
    method: 'PATCH',
    body: JSON.stringify(details),
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
