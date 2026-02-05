import { apiFetch } from '@/lib/api-client';
import type {
  AthleteDetails,
  AthleteGoal,
  AthleteInjury,
  TrainingCalendarCompletionLogs,
  ClientWorkoutCompletionLog,
  ClientSetCompletionLog,
  ClientSectionCompletionLog,
} from '@athli/shared-types';

/**
 * Client service for coach to view/manage client data
 * Mirrors apps/web/api/client/client-service.ts
 */

// Re-export types from shared-types for backwards compatibility
export type {
  AthleteDetails,
  AthleteGoal,
  AthleteInjury,
  TrainingCalendarCompletionLogs,
};

// Local aliases for completion status types
export type WorkoutCompletionStatus = ClientWorkoutCompletionLog;
export type SetCompletionStatus = ClientSetCompletionLog;
export type SectionCompletionStatus = ClientSectionCompletionLog;

// Training calendar types are app-specific and stay local
export interface TrainingCalendarItem {
  id: string;
  templateId?: string; // Original template ID from coach's library
  workout: string;
  description: string;
  type: string;
  difficulty: string;
  length: string;
  totalExercises: number;
  equipment: string | string[];
  created: string;
  workout_data?: unknown;
  day_status?: 'not_started' | 'in_progress' | 'completed';
  completedSummary?: {
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: number;
    startedAt?: number;
  };
  supersetFlags?: boolean[]; // true at index i means exercise i is supersetted with exercise i+1
}

// API returns dates as keys with values being objects keyed by workout instance IDs
// e.g., { "23-01-2026": { "workout_1": {...}, "workout_2": {...} } }
export interface TrainingCalendarSchema {
  [date: string]: { [workoutKey: string]: TrainingCalendarItem } | TrainingCalendarItem[];
}

const calculateAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Get client details by ID (for coach viewing client)
 * Uses /clients/detail endpoint which returns data from coach_clients_view with correct avatar_url
 */
export const getClientDetails = async (clientId: string, coachId: string): Promise<AthleteDetails> => {
  const response = await apiFetch<{ success: boolean; data: { client: any } }>('/clients/detail', {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
  });

  const client = response.data.client;

  if (!client) {
    throw new Error('Client not found');
  }

  const names = client.full_name?.split(' ') || ['', ''];
  const createdAt = new Date(client.created_at || Date.now());
  const clientForDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: client.client_id || clientId,
    name: client.full_name || '',
    firstName: names[0] || '',
    lastName: names.slice(1).join(' ') || '',
    email: client.email || '',
    birthDate: client.date_of_birth || null,
    category: client.category || 'online',
    gender: client.gender || null,
    phone: client.phone || '',
    country: client.country || '',
    height: client.height_cm || null,
    avatarUrl: client.avatar_url || null,
    status: client.status || 'invited',
    createdAt: createdAt.getTime(),
    clientFor: clientForDays.toString(),
  };
};

/**
 * Get athlete bio
 */
export const getAthleteBio = async (clientId: string, coachId: string): Promise<string> => {
  const response = await apiFetch<{ success: boolean; data: { bio: string } }>('/clients/bio', {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
  return response.data.bio || '';
};

/**
 * Save athlete bio
 */
export const saveAthleteBio = async (clientId: string, coachId: string, bio: string): Promise<void> => {
  await apiFetch('/clients/bio', {
    method: 'PATCH',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
    body: JSON.stringify({ bio }),
  });
};

/**
 * Get athlete goals
 */
export const getAthleteGoals = async (clientId: string, coachId: string): Promise<AthleteGoal[]> => {
  const response = await apiFetch<{ success: boolean; data: { goals: AthleteGoal[] } }>('/clients/goals', {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
  return response.data.goals || [];
};

/**
 * Save athlete goals
 */
export const saveAthleteGoals = async (
  clientId: string,
  coachId: string,
  goals: Partial<AthleteGoal>[]
): Promise<void> => {
  await apiFetch('/clients/goals', {
    method: 'PATCH',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
    body: JSON.stringify({ goals }),
  });
};

/**
 * Get athlete injuries
 */
export const getAthleteInjuries = async (clientId: string, coachId: string): Promise<AthleteInjury[]> => {
  const response = await apiFetch<{ success: boolean; data: { injuries: AthleteInjury[] } }>('/clients/injuries', {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
  return response.data.injuries || [];
};

/**
 * Save athlete injuries
 */
export const saveAthleteInjuries = async (
  clientId: string,
  coachId: string,
  injuries: Partial<AthleteInjury>[]
): Promise<void> => {
  await apiFetch('/clients/injuries', {
    method: 'PATCH',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
    body: JSON.stringify({ injuries }),
  });
};

/**
 * Save athlete details
 */
export const saveAthleteDetails = async (
  clientId: string,
  coachId: string,
  details: Partial<AthleteDetails>
): Promise<void> => {
  const updatePayload: any = {
    id: clientId,
    name: details.name,
    phone: details.phone,
    gender: details.gender,
    country: details.country,
    birth_date: details.birthDate,
    height_cm: details.height ? parseInt(details.height, 10) : null,
  };

  if (details.avatarUrl) {
    updatePayload.profile_picture_url = details.avatarUrl;
  }

  await apiFetch('/client', {
    method: 'PATCH',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    body: JSON.stringify(updatePayload),
  });
};

/**
 * Get training calendar for a client within a date range
 */
export const getTrainingCalendarRange = async (
  clientId: string,
  coachId: string,
  startDate: string,
  endDate: string
): Promise<TrainingCalendarSchema> => {
  const response = await apiFetch<{ success: boolean; data: { calendar: TrainingCalendarSchema } }>(
    '/client/trainings/calendar',
    {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-coach-id': coachId,
      },
      body: JSON.stringify({ startDate, endDate }),
    }
  );
  return response.data.calendar || {};
};

/**
 * Get training calendar completion logs for a client
 */
export const getTrainingCalendarCompletionLogs = async (
  clientId: string,
  coachId: string
): Promise<TrainingCalendarCompletionLogs> => {
  const response = await apiFetch<{ success: boolean; data: TrainingCalendarCompletionLogs }>(
    '/client/trainings/completion-logs',
    {
      headers: {
        'x-client-id': clientId,
        'x-coach-id': coachId,
      },
    }
  );
  return response.data || { workouts: [], sets: [], sections: [] };
};
