/**
 * AI Payload Transformer
 * Transforms simplified AI payloads to full API format for saving
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Simplified AI Workout Payload (what the AI generates)
 */
export interface AIWorkoutPayload {
  name: string;
  description?: string;
  type?: 'strength' | 'hypertrophy' | 'conditioning' | 'cardio' | 'mobility';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  totalExercises?: number;
  sections: AISection[];
}

export interface AISection {
  name: string;
  type?: 'regular' | 'superset' | 'circuit' | 'amrap';
  exercises: AIExercise[];
}

export interface AIExercise {
  name: string;
  sets?: number;
  reps?: string;
  weight?: string | null;
  rest?: number | null;
  notes?: string | null;
}

/**
 * Full API Workout Payload (what the backend expects)
 */
export interface APIWorkoutPayload {
  name: string;
  description: string;
  type: string;
  difficulty: string;
  total_exercises: number;
  workout_data: {
    items: APISection[];
    pre: Record<string, null>;
    post: Record<string, null | string>;
    completedSummary: Record<string, null | string>;
  };
}

export interface APISection {
  id: string;
  type: 'section';
  name: string;
  sectionType: string;
  exercises: APIExercise[];
}

export interface APIExercise {
  id: string;
  instanceId: string;
  name: string;
  exerciseId: null;
  sets: APISet[];
  rest: number | null;
  notes: string | null;
}

export interface APISet {
  id: string;
  reps: string;
  weight: string | null;
  completed: boolean;
}

/**
 * Transform AI workout payload to full API format
 */
export function transformWorkoutPayload(aiPayload: AIWorkoutPayload): APIWorkoutPayload {
  const sections: APISection[] = aiPayload.sections.map((section) => ({
    id: uuidv4(),
    type: 'section',
    name: section.name,
    sectionType: section.type || 'regular',
    exercises: section.exercises.map((exercise) => {
      const numSets = exercise.sets || 3;
      const sets: APISet[] = Array.from({ length: numSets }, () => ({
        id: uuidv4(),
        reps: exercise.reps || '10',
        weight: exercise.weight || null,
        completed: false,
      }));

      return {
        id: uuidv4(),
        instanceId: uuidv4(),
        name: exercise.name,
        exerciseId: null, // Exercise name stored as string for v1
        sets,
        rest: exercise.rest ?? 90,
        notes: exercise.notes || null,
      };
    }),
  }));

  // Count total exercises
  const totalExercises = sections.reduce(
    (sum, section) => sum + section.exercises.length,
    0
  );

  return {
    name: aiPayload.name,
    description: aiPayload.description || '',
    type: aiPayload.type || 'strength',
    difficulty: aiPayload.difficulty || 'intermediate',
    total_exercises: totalExercises,
    workout_data: {
      items: sections,
      pre: {
        sleep: null,
        mood: null,
        energy: null,
        stress: null,
        soreness: null,
      },
      post: {
        rating: null,
        intensity: null,
        sessionComments: '',
      },
      completedSummary: {
        status: 'not_started',
        startedAt: null,
        completedAt: null,
        totalDurationMin: null,
        totalWeightLifted: null,
      },
    },
  };
}

/**
 * Transform AI section payload to API format
 */
export interface AISectionPayload {
  name: string;
  description?: string;
  type?: 'regular' | 'superset' | 'circuit' | 'amrap';
  exercises: AIExercise[];
}

export interface APISectionPayload {
  name: string;
  description: string;
  type: string;
  section_data: {
    exercises: APIExercise[];
  };
}

export function transformSectionPayload(aiPayload: AISectionPayload): APISectionPayload {
  const exercises: APIExercise[] = aiPayload.exercises.map((exercise) => {
    const numSets = exercise.sets || 3;
    const sets: APISet[] = Array.from({ length: numSets }, () => ({
      id: uuidv4(),
      reps: exercise.reps || '10',
      weight: exercise.weight || null,
      completed: false,
    }));

    return {
      id: uuidv4(),
      instanceId: uuidv4(),
      name: exercise.name,
      exerciseId: null,
      sets,
      rest: exercise.rest ?? 90,
      notes: exercise.notes || null,
    };
  });

  return {
    name: aiPayload.name,
    description: aiPayload.description || '',
    type: aiPayload.type || 'regular',
    section_data: {
      exercises,
    },
  };
}

/**
 * Get workout summary from AI payload (for display)
 */
export function getWorkoutSummary(payload: AIWorkoutPayload): {
  exerciseCount: number;
  sectionCount: number;
  type: string;
  difficulty: string;
} {
  const exerciseCount = payload.sections.reduce(
    (sum, section) => sum + section.exercises.length,
    0
  );

  return {
    exerciseCount,
    sectionCount: payload.sections.length,
    type: payload.type || 'strength',
    difficulty: payload.difficulty || 'intermediate',
  };
}
