import { apiFetch } from '@/lib/api-client';

/**
 * Client training service for workout and program management
 * Mirrors apps/athli-web-app/api/client/client-training-service.ts
 */

export interface AssignWorkoutData {
  workoutId?: string;
  clientId: string;
  date: string;
  coachId?: string;
  workoutPayload?: any;
  isNew?: boolean;
  skipInvalidation?: boolean;
}

export interface AssignProgramData {
  programId: string;
  clientId: string;
  startDate: string;
  coachId?: string;
  daysToMap?: number[];
}

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

export interface DeleteWorkoutByKeyData {
  clientId: string;
  coachId: string;
  sourceDate: string;
  workoutId: string;
}

export interface GetExerciseHistoryData {
  clientId: string;
  coachId: string;
  exerciseId: string;
  exerciseName?: string;
}

export interface AddExerciseHistoryData {
  clientId: string;
  coachId: string;
  date: string;
  workoutId: string;
  workoutName: string;
  exerciseId: string;
  exerciseData: any;
  sectionType?: 'amrap' | 'tabata' | 'hiit' | 'emom' | 'circuits' | null;
  sectionCompletedRounds?: number | null;
}

export interface UniqueExercise {
  id: string;
  name: string;
  rawThumbnailUrl?: string;
}

export interface GetUniqueExercisesData {
  clientId: string;
  coachId: string;
}

export interface HistoryEntry {
  date: string;
  workout_id: string;
  workout_name: string;
  exercise_id: string;
  exercise_data: {
    sets?: Array<{
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

export interface CoachClientHistoryItem {
  client_id: string;
  coach_id: string;
  date: string;
  workout_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'missed';
  workout_data?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Assign a workout to a client's training calendar
 */
export const assignWorkout = async (data: AssignWorkoutData): Promise<void> => {
  const headers: Record<string, string> = {
    'x-client-id': data.clientId,
  };
  if (data.coachId) {
    headers['x-coach-id'] = data.coachId;
  }

  const { clientId, ...payload } = data;  // Keep coachId in payload

  await apiFetch('/client/trainings/assign-workout', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
};

/**
 * Assign a program to a client's training calendar
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
 * Get client's workouts from training calendar
 */
export const getClientWorkouts = async (
  clientId: string,
  startDate: string,
  endDate: string
): Promise<any[]> => {
  const response = await apiFetch<{ success: boolean; data: { training: any[] } }>(
    `/client/trainings/${clientId}?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data?.training || [];
};

/**
 * Get client's programs from training calendar
 */
export const getClientPrograms = async (clientId: string): Promise<any[]> => {
  const response = await apiFetch<{ success: boolean; data: { programs: any[] } }>(
    `/client/trainings/${clientId}/programs`
  );
  return response.data?.programs || [];
};

/**
 * Delete a workout from client's training calendar
 */
export const deleteClientWorkout = async (
  clientId: string,
  coachId: string,
  workoutId: string,
  date: string
): Promise<void> => {
  await apiFetch(`/client/trainings/${clientId}/workout/${workoutId}?date=${date}`, {
    method: 'DELETE',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
};

/**
 * Get a specific workout instance for a client
 */
export const getClientWorkoutInstance = async (
  clientId: string,
  coachId: string,
  date: string,
  workoutId: string
): Promise<any> => {
  const response = await apiFetch<{ success: boolean; data: { workout: any } }>(
    '/client/trainings/workout-instance',
    {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-coach-id': coachId,
      },
      body: JSON.stringify({ date, workoutId }),
    }
  );
  return response.data?.workout;
};

/**
 * Duplicate a workout from one date to another
 */
export const duplicateWorkout = async (data: DuplicateWorkoutData): Promise<DuplicateWorkoutResponse> => {
  const response = await apiFetch<{ success: boolean; data: DuplicateWorkoutResponse }>(
    '/client/trainings/calendar/duplicate',
    {
      method: 'POST',
      headers: {
        'x-client-id': data.clientId,
        'x-coach-id': data.coachId,
      },
      body: JSON.stringify(data),
    }
  );
  return response.data!;
};

/**
 * Delete a workout using sourceDate and workoutId
 */
export const deleteWorkoutByKey = async (data: DeleteWorkoutByKeyData): Promise<void> => {
  await apiFetch('/client/trainings/calendar/delete', {
    method: 'POST',
    headers: {
      'x-client-id': data.clientId,
      'x-coach-id': data.coachId,
    },
    body: JSON.stringify({
      sourceDate: data.sourceDate,
      workoutId: data.workoutId,
    }),
  });
};

/**
 * Get exercise history for a client
 */
export const getExerciseHistory = async (data: GetExerciseHistoryData): Promise<HistoryEntry[]> => {
  const response = await apiFetch<{ success: boolean; data: { history: HistoryEntry[] } }>(
    '/client/trainings/exercise-history',
    {
      method: 'POST',
      headers: {
        'x-client-id': data.clientId,
        'x-coach-id': data.coachId,
      },
      body: JSON.stringify({
        exercise_id: data.exerciseId,
        exerciseName: data.exerciseName,
      }),
    }
  );
  return response.data?.history || [];
};

/**
 * Get coach's client training history (completed, missed, in_progress)
 */
export const getCoachClientHistory = async (
  date: string,
  status?: 'completed' | 'in_progress' | 'missed'
): Promise<CoachClientHistoryItem[]> => {
  const response = await apiFetch<{ success: boolean; data: { history: CoachClientHistoryItem[] } }>(
    '/clients/training-history',
    {
      method: 'POST',
      body: JSON.stringify({ date, status }),
    }
  );
  return response.data?.history || [];
};

/**
 * Add a single exercise history entry (incremental write during workout)
 * Uses exercise instance ID for idempotency - updates if exists, inserts if not
 */
export const addExerciseHistory = async (data: AddExerciseHistoryData): Promise<void> => {
  await apiFetch('/client/trainings/exercise-history/add', {
    method: 'POST',
    headers: {
      'x-client-id': data.clientId,
      'x-coach-id': data.coachId,
    },
    body: JSON.stringify({
      date: data.date,
      workout_id: data.workoutId,
      workout_name: data.workoutName,
      exercise_id: data.exerciseId,
      exercise_data: data.exerciseData,
      section_type: data.sectionType ?? null,
      section_completed_rounds: data.sectionCompletedRounds ?? null,
    }),
  });
};

/**
 * Get unique exercises that have history for a client
 */
export const getClientUniqueExercises = async (data: GetUniqueExercisesData): Promise<UniqueExercise[]> => {
  const response = await apiFetch<{ success: boolean; data: { exercises: UniqueExercise[] } }>(
    '/client/trainings/unique-exercises',
    {
      method: 'POST',
      headers: {
        'x-client-id': data.clientId,
        'x-coach-id': data.coachId,
      },
    }
  );
  return response.data?.exercises || [];
};
