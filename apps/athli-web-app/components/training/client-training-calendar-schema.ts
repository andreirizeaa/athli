import type { WorkoutPayload } from './workout-schema';

/**
 * Client Training Calendar Schema
 *
 * Date-keyed object containing workout schemas for each day
 * Date format: dd-mm-yyyy (e.g., "24-12-2025")
 *
 * When coaches assign workouts: workouts have status 'not_started' with empty completion fields
 * During execution: users fill in actual performance data
 * After completion: status becomes 'completed' with all metrics filled
 */
export type ClientTrainingCalendar = {
  [date: string]: WorkoutPayload[];
};

/**
 * Helper type for a single day's workouts
 */
export type DayWorkouts = {
  date: string; // dd-mm-yyyy format
  workouts: WorkoutPayload[];
};
