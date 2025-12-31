import { apiFetch, type ApiResponse } from '@/api/api-client';

/**
 * Client-specific training service for training calendar operations
 */

export interface AssignWorkoutData {
  workoutId?: string; // Optional if creating new
  clientId: string;
  date: string;
  coachId?: string;
  workoutPayload?: any; // Full workout payload if creating new
  isNew?: boolean;
  skipInvalidation?: boolean; // If true, skip automatic query invalidation in hooks
}

export interface AssignProgramData {
  programId: string;
  clientId: string;
  startDate: string;
  coachId?: string;
  daysToMap?: number[]; // indices of days to map (0-6)
}

/**
 * Service method to assign a workout to a client's training calendar
 */
export const assignWorkout = async (data: AssignWorkoutData): Promise<void> => {
  await apiFetch('/client/trainings/assign-workout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Service method to assign a program to a client's training calendar
 */
export const assignProgram = async (data: AssignProgramData): Promise<void> => {
  await apiFetch('/client/trainings/assign-program', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Service method to get client's workouts from training calendar
 */
export const getClientWorkouts = async (clientId: string, startDate: string, endDate: string): Promise<any[]> => {
  const response = await apiFetch<ApiResponse<{ training: any[] }>>(`/client/trainings/${clientId}?startDate=${startDate}&endDate=${endDate}`);
  return response.data?.training || [];
};

/**
 * Service method to get client's programs from training calendar
 */
export const getClientPrograms = async (clientId: string): Promise<any[]> => {
  // This might be a different endpoint or part of getClientWorkouts depending on backend implementation
  // For now keeping it similar to structure but potentially unused if calendar drives everything
  const response = await apiFetch<ApiResponse<{ programs: any[] }>>(`/client/trainings/${clientId}/programs`);
  return response.data?.programs || [];
};

/**
 * Service method to delete a workout from client's training calendar
 */
export const deleteClientWorkout = async (clientId: string, workoutId: string, date: string): Promise<void> => {
  await apiFetch(`/client/trainings/${clientId}/workout/${workoutId}?date=${date}`, {
    method: 'DELETE',
  });
};

/**
 * Service method to get a specific workout instance for a client
 */
export const getClientWorkoutInstance = async (clientId: string, date: string, workoutId: string): Promise<any> => {
  const response = await apiFetch<ApiResponse<{ workout: any }>>('/client/trainings/workout-instance', {
    method: 'POST',
    body: JSON.stringify({ clientId, date, workoutId }),
  });
  return response.data?.workout;
};

export interface DuplicateWorkoutData {
  clientId: string;
  sourceDate: string;      // YYYY-MM-DD format
  sourceWorkoutId: string; // The specific workout ID to duplicate
  targetDate: string;      // YYYY-MM-DD format
}

export interface DuplicateWorkoutResponse {
  newWorkoutId: string;
  workout: any;
}

/**
 * Service method to duplicate a workout from one date to another
 */
export const duplicateWorkout = async (data: DuplicateWorkoutData): Promise<DuplicateWorkoutResponse> => {
  const response = await apiFetch<ApiResponse<DuplicateWorkoutResponse>>('/client/trainings/calendar/duplicate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data!;
};

export interface DeleteWorkoutByKeyData {
  clientId: string;
  sourceDate: string;  // YYYY-MM-DD format
  workoutId: string;
}

/**
 * Service method to delete a workout using sourceDate and workoutId
 */
export const deleteWorkoutByKey = async (data: DeleteWorkoutByKeyData): Promise<void> => {
  await apiFetch('/client/trainings/calendar/delete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
