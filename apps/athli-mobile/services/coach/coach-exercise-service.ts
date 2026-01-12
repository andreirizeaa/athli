import { apiFetch, type ApiResponse } from '@/lib/api-client';

/**
 * Service methods for exercise operations
 */

export type Exercise = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  muscle_group?: string[];
  equipment?: string;
  modality?: string;
  video_link?: string;
  starred: boolean;
  isFavourite: boolean;
  archived: boolean;
  created_at: string;
  updated_at?: string;
};

/**
 * Interface for frontend-to-backend mapping if needed
 */
export type ExercisePayload = {
  name: string;
  description?: string;
  category?: string;
  muscle_group?: string[];
  equipment?: string;
  modality?: string;
  video_link?: string;
  // Field aliases from UI
  instructions?: string;
  videoLink?: string;
  muscleGroups?: string[];
};

const mapToBackend = (payload: ExercisePayload) => {
  return {
    name: payload.name,
    description: payload.description || payload.instructions,
    category: payload.category,
    muscle_group: payload.muscle_group || payload.muscleGroups,
    equipment: payload.equipment,
    modality: payload.modality,
    video_link: payload.video_link || payload.videoLink,
  };
};

/**
 * Get all exercises
 */
export const getExercises = async (): Promise<Exercise[]> => {
  const response = await apiFetch<ApiResponse<{ exercises: any[] }>>('/coach/training/exercises');
  const exercises = (response.data?.exercises || []).map((e) => ({
    ...e,
    isFavourite: e.is_favourite || false,
  }));
  console.log('[coach-exercise-service] getExercises returned:', exercises.length, 'exercises');
  return exercises;
};

/**
 * Star/Unstar exercises
 */
export const starExercises = async (exerciseIds: string | string[], starred: boolean): Promise<void> => {
  const ids = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/exercises/${id}/toggle-favorite`, {
        method: 'PATCH',
        body: JSON.stringify({ isFavourite: starred }),
      })
    )
  );
};

/**
 * Archive/Unarchive exercises
 */
export const archiveExercises = async (
  exerciseIds: string | string[],
  archived: boolean
): Promise<void> => {
  const ids = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/exercises/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived }),
      })
    )
  );
};

/**
 * Delete exercises
 */
export const deleteExercises = async (exerciseIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/exercises/${id}`, {
        method: 'DELETE',
      })
    )
  );
};

/**
 * Duplicate exercises
 */
export const duplicateExercises = async (exerciseIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/exercises/${id}/duplicate`, {
        method: 'POST',
      })
    )
  );
};

/**
 * Create a new exercise
 */
export const createExercise = async (exerciseData: ExercisePayload): Promise<Exercise> => {
  const body = mapToBackend(exerciseData);
  const response = await apiFetch<ApiResponse<{ exercise: Exercise }>>('/coach/training/exercises', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.data) throw new Error('No exercise returned');
  return response.data.exercise;
};

/**
 * Update an existing exercise
 */
export const editExercise = async (
  exerciseId: string,
  exerciseData: Partial<ExercisePayload>
): Promise<Exercise> => {
  const body = mapToBackend(exerciseData as ExercisePayload);
  const response = await apiFetch<ApiResponse<{ exercise: Exercise }>>(`/coach/training/exercises/${exerciseId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!response.data) throw new Error('No exercise returned');
  return response.data.exercise;
};
/**
 * Get exercise by ID
 */
export const getExerciseById = async (exerciseId: string): Promise<Exercise> => {
  const response = await apiFetch<ApiResponse<{ exercise: Exercise }>>(`/coach/training/exercises/${exerciseId}`);
  if (!response.data) throw new Error('No exercise returned');
  return response.data.exercise;
};
