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
 * Service method to add a habit to coach's library
 * This will be connected to the backend in the future
 */
export const addHabit = async (data: AddHabitData): Promise<Habit> => {
  // TODO: Connect to backend API
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

  const newHabit: Habit = {
    id: `habit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    ...data,
    createdAt: Date.now(),
  };

  return newHabit;
};

/**
 * Service method to edit a habit in coach's library
 * This will be connected to the backend in the future
 */
export const editHabit = async (data: EditHabitData): Promise<void> => {
  // TODO: Connect to backend API
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
};

/**
 * Service method to delete a habit from coach's library
 * This will be connected to the backend in the future
 */
export const deleteHabit = async (data: DeleteHabitData): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Deleting habit:', {
    id: data.id,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Duplicate a habit in coach's library
 * @param habitId - ID of the habit to duplicate
 * @param originalHabit - Original habit object to duplicate
 */
export const duplicateHabit = async (habitId: string, originalHabit: Habit): Promise<Habit> => {
  // TODO: Connect to backend API
  console.log('Duplicating habit:', { habitId, originalHabit });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const duplicatedHabit: Habit = {
    ...originalHabit,
    id: `habit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalHabit.name} (Copy)`,
    createdAt: Date.now(),
  };

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
