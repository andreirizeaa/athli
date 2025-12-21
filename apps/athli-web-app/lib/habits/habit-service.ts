export interface AddHabitData {
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: 'daily' | 'weekly';
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
}

export interface EditHabitData extends AddHabitData {
  id: string;
}

export interface DeleteHabitData {
  id: string;
}

export interface AssignHabitData {
  habitIds: string[];
  clientIds: string[];
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
}

/**
 * Service method to add a habit
 * This will be connected to the backend in the future
 */
export const addHabit = async (data: AddHabitData): Promise<Habit> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Adding habit:', {
    name: data.name,
    description: data.description,
    amount: data.amount,
    unit: data.unit,
    period: data.period,
    duration: data.duration,
    reminderTime: data.reminderTime,
    reminderMessage: data.reminderMessage,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock habit
  const newHabit: Habit = {
    id: `habit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    ...data,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/habits', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to add habit')
  // return await response.json()

  return newHabit;
};

/**
 * Service method to edit a habit
 * This will be connected to the backend in the future
 */
export const editHabit = async (data: EditHabitData): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Editing habit:', {
    id: data.id,
    name: data.name,
    description: data.description,
    amount: data.amount,
    unit: data.unit,
    period: data.period,
    duration: data.duration,
    reminderTime: data.reminderTime,
    reminderMessage: data.reminderMessage,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/habits/${data.id}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to edit habit')
  // return await response.json()
};

/**
 * Service method to delete a habit
 * This will be connected to the backend in the future
 */
export const deleteHabit = async (data: DeleteHabitData): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Deleting habit:', {
    id: data.id,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/habits/${data.id}`, {
  //   method: 'DELETE',
  // })
  // if (!response.ok) throw new Error('Failed to delete habit')
};

/**
 * Service method to assign habits to clients
 * This will be connected to the backend in the future
 */
export const assignHabit = async (data: AssignHabitData): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Assigning habits to clients:', {
    habitIds: data.habitIds,
    clientIds: data.clientIds,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/habits/assign', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to assign habits')
};

export interface DeleteClientHabitsData {
  habitIds: string[];
  clientId: string;
}

/**
 * Service method to delete habits from a client
 * This will be connected to the backend in the future
 */
export const deleteClientHabits = async (data: DeleteClientHabitsData): Promise<void> => {
  console.log('Deleting client habits:', {
    habitIds: data.habitIds,
    clientId: data.clientId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${data.clientId}/habits`, {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ habitIds: data.habitIds }),
  // })
  // if (!response.ok) throw new Error('Failed to delete client habits')
};

/**
 * Duplicate a habit
 * @param habitId - ID of the habit to duplicate
 * @param originalHabit - Original habit object to duplicate
 */
export const duplicateHabit = async (habitId: string, originalHabit: Habit): Promise<Habit> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Duplicating habit:', { habitId, originalHabit });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // In the future, this will:
  // 1. Fetch the full habit data from the backend
  // 2. Create a new habit with the same data but name appended with " (Copy)"
  // 3. Return the new habit

  // For now, create a duplicate with all properties copied and name appended with " (Copy)"
  const duplicatedHabit: Habit = {
    ...originalHabit,
    id: `habit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalHabit.name} (Copy)`,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/habits/${habitId}/duplicate`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to duplicate habit')
  // return await response.json()

  return duplicatedHabit;
};

/**
 * Service method to get all coach's habits (library)
 * This will be connected to the backend in the future
 */
export const getAllHabits = async (): Promise<Habit[]> => {
  // TODO: Connect to backend API
  console.log('Getting all coach habits');

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock data - in production this would come from the backend
  const mockHabits: Habit[] = [
    {
      id: 'coach-habit-1',
      name: 'Morning Meditation',
      description: 'Start your day with mindfulness',
      amount: 10,
      unit: 'min',
      period: 'daily',
      duration: 10,
      createdAt: Date.now() - 86400000 * 30,
    },
    {
      id: 'coach-habit-2',
      name: 'Evening Stretch',
      description: 'Improve flexibility and recovery',
      amount: 15,
      unit: 'min',
      period: 'daily',
      createdAt: Date.now() - 86400000 * 25,
    },
    {
      id: 'coach-habit-3',
      name: 'Weekly Meal Prep',
      description: 'Plan and prepare healthy meals',
      amount: 1,
      unit: 'session',
      period: 'weekly',
      createdAt: Date.now() - 86400000 * 20,
    },
    {
      id: 'coach-habit-4',
      name: 'Daily Protein Intake',
      description: 'Track your protein consumption',
      amount: 150,
      unit: 'g',
      period: 'daily',
      reminderTime: '20:00',
      reminderMessage: 'Log your protein intake',
      createdAt: Date.now() - 86400000 * 15,
    },
  ];

  return mockHabits;
};

