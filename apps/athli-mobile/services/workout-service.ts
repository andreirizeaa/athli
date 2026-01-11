import type { CreateWorkoutData } from '@/types';

// Re-export for backward compatibility
export type { CreateWorkoutData };

export const createNewWorkout = async (data: CreateWorkoutData): Promise<void> => {
  // Dummy implementation
  console.log('Creating new workout:', data);
  // TODO: Implement actual API call
  return Promise.resolve();
};

