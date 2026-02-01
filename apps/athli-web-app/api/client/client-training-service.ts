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
  const headers: Record<string, string> = {
    'x-client-id': data.clientId,
  };
  if (data.coachId) {
    headers['x-coach-id'] = data.coachId;
  }

  // Create payload without clientId and coachId (they're in headers)
  const { clientId, coachId, ...payload } = data;

  await apiFetch('/client/trainings/assign-workout', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
};

/**
 * Service method to assign a program to a client's training calendar
 */
export const assignProgram = async (data: AssignProgramData): Promise<void> => {
  const headers: Record<string, string> = {};
  if (data.coachId) {
    headers['x-coach-id'] = data.coachId;
  }

  await apiFetch('/client/trainings/assign-program', {
    method: 'POST',
    headers,
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
export const deleteClientWorkout = async (clientId: string, coachId: string, workoutId: string, date: string): Promise<void> => {
  await apiFetch(`/client/trainings/${clientId}/workout/${workoutId}?date=${date}`, {
    method: 'DELETE',
    headers: {
      'x-client-id': clientId, // Redundant if in URL, but good for consistency
      'x-coach-id': coachId
    },
  });
};

/**
 * Service method to get a specific workout instance for a client
 */
export const getClientWorkoutInstance = async (clientId: string, coachId: string, date: string, workoutId: string): Promise<any> => {
  const response = await apiFetch<ApiResponse<{ workout: any }>>('/client/trainings/workout-instance', {
    method: 'POST',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId
    },
    body: JSON.stringify({ date, workoutId }),
  });
  return response.data?.workout;
};

export interface DuplicateWorkoutData {
  clientId: string;
  coachId: string;
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
    headers: {
      'x-client-id': data.clientId,
      'x-coach-id': data.coachId
    },
    body: JSON.stringify(data),
  });
  return response.data!;
};

export interface DeleteWorkoutByKeyData {
  clientId: string;
  coachId: string;
  sourceDate: string;
  workoutId: string;
}

/**
 * Service method to delete a workout using sourceDate and workoutId
 */
export const deleteWorkoutByKey = async (data: DeleteWorkoutByKeyData): Promise<void> => {
  await apiFetch('/client/trainings/calendar/delete', {
    method: 'POST',
    headers: {
      'x-client-id': data.clientId,
      'x-coach-id': data.coachId
    },
    body: JSON.stringify({
      sourceDate: data.sourceDate,
      workoutId: data.workoutId,
    }),
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

export interface GetExerciseHistoryData {
  clientId: string;
  coachId: string;
  exerciseId: string;
  exerciseName?: string;
}

export interface HistoryEntry {
  date: string;
  workout_id: string;
  workout_name: string;
  exercise_id: string;
  exercise_data: {
    sets?: Array<{
      trackableField1?: { label?: string; prescribed?: number; completed?: number };
      trackableField2?: { label?: string; prescribed?: number; completed?: number };
      // Legacy fields for backwards compatibility
      weight?: number | { completed?: number; prescribed?: number };
      reps?: number | { completed?: number; prescribed?: number };
      distance?: number | { completed?: number; prescribed?: number };
      duration?: number | { completed?: number; prescribed?: number };
      completed?: boolean;
      type?: string;
    }>;
    name?: string;
    notes?: string;
    exerciseType?: string;
    performedExerciseId?: string;
    prescribedExerciseId?: string;
    supersetId?: string | null;
    alternatives?: any[];
  };
}

/**
 * Service method to get exercise history for a client
 */
export const getExerciseHistory = async (data: GetExerciseHistoryData): Promise<HistoryEntry[]> => {
  const response = await apiFetch<ApiResponse<{ history: HistoryEntry[] }>>('/client/trainings/exercise-history', {
    method: 'POST',
    headers: {
      'x-client-id': data.clientId,
      'x-coach-id': data.coachId
    },
    body: JSON.stringify({
      exercise_id: data.exerciseId,
      exerciseName: data.exerciseName
    }),
  });
  return response.data?.history || [];
};
