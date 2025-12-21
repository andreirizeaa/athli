/**
 * Client-specific workout service for training calendar operations
 * This will be connected to the backend in the future
 */

export interface AssignWorkoutData {
  workoutId: string;
  clientId: string;
  date: string;
}

/**
 * Service method to assign a workout to a client's training calendar
 * This will be connected to the backend in the future
 */
export const assignWorkout = async (data: AssignWorkoutData): Promise<void> => {
  console.log('Assigning workout to client calendar:', data);
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Service method to get client's workouts from training calendar
 * This will be connected to the backend in the future
 */
export const getClientWorkouts = async (clientId: string): Promise<any[]> => {
  console.log('Getting client workouts:', clientId);
  await new Promise((resolve) => setTimeout(resolve, 100));
  return [];
};
