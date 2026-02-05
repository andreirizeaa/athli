/**
 * Library item types (workouts, programs, habits, metrics, forms, files)
 * Centralized from services files and constants
 */

// Workout types
export type CreateWorkoutData = {
  name: string;
  description?: string;
};

// Program types
export type CreateProgramData = {
  name: string;
  description?: string;
  weeks: number;
};

// File types
export interface File {
  id: string;
  name: string;
  uri: string;
  type: 'photo' | 'video' | 'pdf';
  size?: number;
  createdAt: Date;
}

export interface AddFileData {
  name: string;
  uri: string;
  type: 'photo' | 'video' | 'pdf';
  size?: number;
}

// Personal details types
export type PersonalDetailsFieldType = 'name' | 'age' | 'gender' | 'height' | 'weight';
