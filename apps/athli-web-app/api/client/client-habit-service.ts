import { apiFetch } from '../api-client';

// Import shared types and re-export for backwards compatibility
export type {
  AssignHabitData,
  AssignHabitsToClientsData,
  DeleteClientHabitsData,
  LogHabitData,
  UpdateHabitData,
  UpdateHabitLogData,
  HabitStreaks,
} from '@athli/shared-types';

import type {
  AssignHabitData,
  AssignHabitsToClientsData,
  DeleteClientHabitsData,
  LogHabitData,
  UpdateHabitData,
  UpdateHabitLogData,
  HabitStreaks,
} from '@athli/shared-types';

/**
 * Service method to assign habits to clients (or create new private ones)
 */
export const assignHabit = async (data: AssignHabitData): Promise<void> => {
  await apiFetch(`/client/habits`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify(data),
  });
};

export const assignHabitsToClients = async (data: AssignHabitsToClientsData): Promise<void> => {
  await apiFetch(`/client/habits`, {
    method: 'POST',
    headers: { 'x-coach-id': data.coachId },
    body: JSON.stringify({ habitIds: data.habitIds, clientIds: data.clientIds }),
  });
};

/**
 * Service method to create a private habit for a client
 */
export const addHabit = async (data: Omit<AssignHabitData, 'habitIds'> & { clientId: string; coachId: string }): Promise<void> => {
  return assignHabit(data);
};

/**
 * Service method to delete habits from a client
 */
export const deleteClientHabits = async (data: DeleteClientHabitsData): Promise<void> => {
  await apiFetch(`/client/habits`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ habitIds: data.habitIds }),
  });
};

/**
 * Service method to log a habit for a client
 */
export const logHabit = async (data: LogHabitData): Promise<void> => {
  await apiFetch(`/client/habits`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      status: data.status,
      value: data.value,
      date: data.date.toISOString().split('T')[0]
    }),
  });
};

/**
 * Service method to get habits for a client
 */
export const getClientHabits = async (clientId: string, coachId: string): Promise<any[]> => {
  const response = await apiFetch<{ data: { habits: any[] } }>(`/client/habits`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });
  return response.data.habits;
};

export const updateClientHabit = async (data: UpdateHabitData): Promise<void> => {
  await apiFetch(`/client/habits`, {
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

// Backwards compatible alias
export const updateHabit = updateClientHabit;

export const deleteHabitLog = async (logId: string, clientId: string, coachId: string): Promise<void> => {
  await apiFetch(`/client/habits/logs`, {
    method: 'DELETE',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    body: JSON.stringify({ logId }),
  });
};

export const updateHabitLog = async (data: UpdateHabitLogData): Promise<void> => {
  await apiFetch(`/client/habits/logs`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      logId: data.logId,
      status: data.status,
      value: data.value,
      date: data.date ? data.date.toISOString().split('T')[0] : undefined
    }),
  });
};

export const getHabitStreaks = async (
  assignmentId: string,
  clientId: string,
  coachId: string
): Promise<HabitStreaks> => {
  const response = await apiFetch<{ data: HabitStreaks }>(
    `/client/habits/streaks`,
    {
      method: 'POST',
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
      body: JSON.stringify({ assignmentId })
    }
  );
  return response.data;
};
