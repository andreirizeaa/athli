import { apiFetch } from '@/lib/api-client';

/**
 * Client habit service for habit tracking
 * Mirrors apps/athli-web-app/api/client/client-habit-service.ts
 */

export interface AssignHabitData {
  habitIds?: string[];
  name?: string;
  amount?: number;
  unit?: string;
  period?: 'daily' | 'weekly';
  description?: string;
  custom_schedule?: any;
  clientId: string;
  coachId: string;
}

export interface AssignHabitsToClientsData {
  habitIds: string[];
  clientIds: string[];
  coachId: string;
}

export interface DeleteClientHabitsData {
  habitIds: string[];
  clientId: string;
  coachId: string;
}

export interface LogHabitData {
  assignmentId: string;
  status: 'completed' | 'skipped' | 'partial';
  value?: number;
  date: Date;
  clientId: string;
  coachId: string;
}

export interface UpdateHabitData {
  assignmentId: string;
  name?: string;
  description?: string;
  period?: 'daily' | 'weekly';
  custom_schedule?: any;
  clientId: string;
  coachId: string;
}

export interface UpdateHabitLogData {
  logId: string;
  status: 'completed' | 'skipped' | 'partial';
  value?: number;
  date?: Date;
  clientId: string;
  coachId: string;
}

export interface HabitStreaks {
  longest_streak: number;
  current_streak: number;
}

export interface ClientHabit {
  id: string;
  assignment_id: string;
  name: string;
  description?: string;
  amount?: number;
  unit?: string;
  period: 'daily' | 'weekly';
  custom_schedule?: any;
  schedule_config?: {
    amount?: number;
    unit?: string;
    duration?: number;
    reminder_message?: string;
  };
  schedule_type?: 'daily' | 'weekly' | 'custom';
  times_of_day?: string[];
  days_of_week?: number[] | null;
  timezone?: string;
  start_date?: string | null;
  end_date?: string | null;
  logs?: HabitLog[];
}

export interface HabitLog {
  id: string;
  status: 'completed' | 'skipped' | 'partial';
  value?: number;
  date: string;
  created_at: string;
}

/**
 * Assign habits to a client (or create new private ones)
 */
export const assignHabit = async (data: AssignHabitData): Promise<void> => {
  await apiFetch('/client/habits', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify(data),
  });
};

/**
 * Assign habits to multiple clients
 */
export const assignHabitsToClients = async (data: AssignHabitsToClientsData): Promise<void> => {
  await apiFetch('/client/habits', {
    method: 'POST',
    headers: { 'x-coach-id': data.coachId },
    body: JSON.stringify({ habitIds: data.habitIds, clientIds: data.clientIds }),
  });
};

/**
 * Create a private habit for a client
 */
export const addHabit = async (
  data: Omit<AssignHabitData, 'habitIds'>
): Promise<void> => {
  return assignHabit(data);
};

/**
 * Delete habits from a client
 */
export const deleteClientHabits = async (data: DeleteClientHabitsData): Promise<void> => {
  await apiFetch('/client/habits', {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ habitIds: data.habitIds }),
  });
};

/**
 * Log a habit for a client
 */
export const logHabit = async (data: LogHabitData): Promise<void> => {
  await apiFetch('/client/habits', {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      status: data.status,
      value: data.value,
      date: data.date.toISOString().split('T')[0],
    }),
  });
};

/**
 * Get habits for a client
 */
export const getClientHabits = async (clientId: string, coachId: string): Promise<ClientHabit[]> => {
  const response = await apiFetch<{ success: boolean; data: { habits: ClientHabit[] } }>(
    '/client/habits',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );
  return response.data.habits;
};

/**
 * Update a habit assignment
 */
export const updateHabit = async (data: UpdateHabitData): Promise<void> => {
  await apiFetch('/client/habits', {
    method: 'PUT',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      name: data.name,
      description: data.description,
      period: data.period,
      custom_schedule: data.custom_schedule,
    }),
  });
};

/**
 * Delete a habit log
 */
export const deleteHabitLog = async (
  logId: string,
  clientId: string,
  coachId: string
): Promise<void> => {
  await apiFetch('/client/habits/logs', {
    method: 'DELETE',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    body: JSON.stringify({ logId }),
  });
};

/**
 * Update a habit log
 */
export const updateHabitLog = async (data: UpdateHabitLogData): Promise<void> => {
  await apiFetch('/client/habits/logs', {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      logId: data.logId,
      status: data.status,
      value: data.value,
      date: data.date ? data.date.toISOString().split('T')[0] : undefined,
    }),
  });
};

/**
 * Get habit streaks for a specific assignment
 */
export const getHabitStreaks = async (
  assignmentId: string,
  clientId: string,
  coachId: string
): Promise<HabitStreaks> => {
  const response = await apiFetch<{ success: boolean; data: HabitStreaks }>(
    '/client/habits/streaks',
    {
      method: 'POST',
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
      body: JSON.stringify({ assignmentId }),
    }
  );
  return response.data;
};
