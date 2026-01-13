import { apiFetch } from '@/lib/api-client';

export interface AddHabitData {
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: 'daily' | 'weekly';
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
  clientId?: string;
}

export interface EditHabitData extends AddHabitData {
  id: string;
}

export interface DeleteHabitData {
  id: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: 'daily' | 'weekly';
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
  createdAt: number;
  clientId?: string;
}

// Database response type
interface DBHabit {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  schedule_type: 'daily' | 'weekly' | 'custom';
  days_of_week: number[] | null;
  times_of_day: string[] | null;
  timezone: string;
  start_date: string | null;
  end_date: string | null;
  schedule_config: {
    amount?: number;
    unit?: string;
    duration?: number;
    reminder_message?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  client_id: string | null;
}

const mapDBHabitToHabit = (dbHabit: DBHabit): Habit => {
  return {
    id: dbHabit.id,
    name: dbHabit.name,
    description: dbHabit.description ?? undefined,
    amount: dbHabit.schedule_config?.amount ?? 0,
    unit: dbHabit.schedule_config?.unit ?? '',
    period: dbHabit.schedule_type === 'weekly' ? 'weekly' : 'daily',
    duration: dbHabit.schedule_config?.duration,
    reminderTime: dbHabit.times_of_day?.[0]?.substring(0, 5), // HH:mm
    reminderMessage: dbHabit.schedule_config?.reminder_message,
    createdAt: new Date(dbHabit.created_at).getTime(),
    clientId: dbHabit.client_id ?? undefined,
  };
};

const mapHabitDataToDB = (data: AddHabitData) => {
  return {
    name: data.name,
    description: data.description,
    schedule_type: data.period,
    times_of_day: data.reminderTime ? [data.reminderTime] : null,
    schedule_config: {
      amount: data.amount,
      unit: data.unit,
      duration: data.duration,
      reminder_message: data.reminderMessage,
    },
    client_id: data.clientId,
  };
};

/**
 * Service method to add a habit to coach's library
 * This will be connected to the backend in the future
 */
export const addHabit = async (data: AddHabitData): Promise<Habit> => {
  const { clientId, ...rest } = data;

  if (clientId) {
    const response = await apiFetch<{ data: { habit: DBHabit } }>(`/clients/${clientId}/habits`, {
      method: 'POST',
      body: JSON.stringify(mapHabitDataToDB(rest as AddHabitData)) as any,
    });
    return mapDBHabitToHabit(response.data.habit);
  }

  const response = await apiFetch<{ data: { habit: DBHabit } }>('/coach/habits', {
    method: 'POST',
    body: JSON.stringify(mapHabitDataToDB(data)) as any,
  });

  return mapDBHabitToHabit(response.data.habit);
};

/**
 * Service method to edit a habit in coach's library
 * This will be connected to the backend in the future
 */
export const editHabit = async (data: EditHabitData): Promise<Habit> => {
  const { id, ...rest } = data;
  const response = await apiFetch<{ data: { habit: DBHabit } }>(`/coach/habits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapHabitDataToDB(rest)) as any,
  });
  return mapDBHabitToHabit(response.data.habit);
};

/**
 * Service method to delete a habit from coach's library
 * This will be connected to the backend in the future
 */
export const deleteHabit = async (data: DeleteHabitData): Promise<void> => {
  await apiFetch(`/coach/habits/${data.id}`, {
    method: 'DELETE',
  });
};

/**
 * Duplicate a habit in coach's library
 * @param habitId - ID of the habit to duplicate
 * @param originalHabit - Original habit object to duplicate
 */
export const duplicateHabit = async (habitId: string): Promise<Habit> => {
  const response = await apiFetch<{ data: { habit: DBHabit } }>(`/coach/habits/${habitId}/duplicate`, {
    method: 'POST',
  });

  return mapDBHabitToHabit(response.data.habit);
};

/**
 * Service method to get all coach's habits (library)
 * This will be connected to the backend in the future
 */
export const getAllHabits = async (): Promise<Habit[]> => {
  const response = await apiFetch<{ data: { habits: DBHabit[] } }>('/coach/habits');
  return response.data.habits.map(mapDBHabitToHabit);
};
