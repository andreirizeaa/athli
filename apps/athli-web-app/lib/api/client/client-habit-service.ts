export interface AssignHabitData {
  habitIds: string[];
  clientIds: string[];
}

export interface DeleteClientHabitsData {
  habitIds: string[];
  clientId: string;
}

/**
 * Service method to assign habits to clients
 * This will be connected to the backend in the future
 */
export const assignHabit = async (data: AssignHabitData): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Assigning habits to clients:', {
    habitIds: data.habitIds,
    clientIds: data.clientIds,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

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
};
