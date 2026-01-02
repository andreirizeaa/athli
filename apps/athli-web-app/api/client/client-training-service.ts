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
  sourceDate: string;
  sourceWorkoutId: string;
  targetDate: string;
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
  sourceDate: string;
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

export interface CoachClientHistoryItem {
  client_id: string;
  coach_id: string;
  date: string;
  workout_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'missed';
  workout_data?: any; // JSONB snapshot of workout data at assignment time
  created_at: string;
  updated_at: string;
}

/**
 * Service method to get coach's client history (completed, missed, in_progress)
 * Uses backend API endpoint with POST request
 */
export const getCoachClientHistory = async (
  date: string,
  status?: 'completed' | 'in_progress' | 'missed'
): Promise<CoachClientHistoryItem[]> => {
  const response = await apiFetch<ApiResponse<{ history: CoachClientHistoryItem[] }>>(
    '/clients/training-history',
    {
      method: 'POST',
      body: JSON.stringify({ date, status }),
    }
  );

  return response.data?.history || [];
};

