export type CreateWorkoutData = {
  name: string;
  description?: string;
};

export const createNewWorkout = async (data: CreateWorkoutData): Promise<void> => {
  // Dummy implementation
  console.log('Creating new workout:', data);
  // TODO: Implement actual API call
  return Promise.resolve();
};

