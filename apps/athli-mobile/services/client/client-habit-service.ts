import { apiFetch } from '@/lib/api-client';
import type {
  AssignHabitData,
  AssignHabitsToClientsData,
  DeleteClientHabitsData,
  LogHabitData,
  UpdateHabitData,
  UpdateHabitLogData,
  HabitStreaks,
  ClientHabit,
  HabitLog,
} from '@athli/shared-types';

/**
 * Client habit service for habit tracking
 * Mirrors apps/athli-web-app/api/client/client-habit-service.ts
 */

// Re-export types from shared-types for backwards compatibility
export type {
  AssignHabitData,
  AssignHabitsToClientsData,
  DeleteClientHabitsData,
  LogHabitData,
  UpdateHabitData,
  UpdateHabitLogData,
  HabitStreaks,
  ClientHabit,
  HabitLog,
};

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
 * Get habits for a client (coach view)
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
 * Get habits for the authenticated athlete (self-access)
 */
export const getMyHabits = async (clientId: string, coachId: string): Promise<ClientHabit[]> => {
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

/**
 * Get habit streaks for the authenticated athlete (self-access)
 */
export const getMyHabitStreaks = async (
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
