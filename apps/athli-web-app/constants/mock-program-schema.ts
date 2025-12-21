/**
 * Shared mock program schema used across all programs
 * This ensures consistency in mock data
 */

import { mockWorkouts } from '@/components/app/app-shell';

export type ProgramSchema = Array<{ day: number; workouts: string[] }>;

/**
 * Default mock program schema that assigns workouts to days
 * Uses the first 3 workouts from mockWorkouts and distributes them across the first week
 */
export const MOCK_PROGRAM_SCHEMA: ProgramSchema = [
  { day: 1, workouts: ['1'] }, // Day 1: Strength Builder
  { day: 2, workouts: ['2'] }, // Day 2: Cardio Blast
  { day: 3, workouts: ['3'] }, // Day 3: Flexibility Flow
  { day: 4, workouts: ['1'] }, // Day 4: Strength Builder
  { day: 5, workouts: ['2'] }, // Day 5: Cardio Blast
  { day: 6, workouts: ['3'] }, // Day 6: Flexibility Flow
  { day: 7, workouts: [] }, // Day 7: Rest day
];

