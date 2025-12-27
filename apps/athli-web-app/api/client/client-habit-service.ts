import { apiFetch } from '../api-client';

export interface AssignHabitData {
  habitIds?: string[];
  name?: string;
  amount?: number;
  unit?: string;
  period?: 'daily' | 'weekly';
  description?: string;
  custom_schedule?: any;
}

export interface DeleteClientHabitsData {
  habitIds: string[];
  clientId: string;
}

/**
 * Service method to assign habits to clients (or create new private ones)
 */
export const assignHabit = async (data: AssignHabitData & { clientId: string; coachId: string }): Promise<void> => {
  await apiFetch(`/client/habits`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify(data),
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
export const deleteClientHabits = async (data: DeleteClientHabitsData & { coachId: string }): Promise<void> => {
  await apiFetch(`/client/habits`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ habitIds: data.habitIds }),
  });
};

export interface LogHabitData {
  assignmentId: string;
  status: 'completed' | 'skipped' | 'partial';
  value?: number;
  date: Date;
  note?: string;
  // Context needed for headers
  clientId: string;
  coachId: string;
}

/**
 * Service method to log a habit for a client
 */
export const logHabit = async (data: LogHabitData): Promise<void> => {
  await apiFetch(`/client/habits/${data.assignmentId}`, { // Changed to PATCH /:id
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      status: data.status,
      // value: data.value, // Controller only takes status and date? Let's check controller. 
      // Controller updateHabitStatus extracts { status, date }. It ignores value? 
      // If value is needed, controller should be updated. But keeping it safe.
      date: data.date.toISOString().split('T')[0],
      // note: data.note // Controller doesn't seem to take note?
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
