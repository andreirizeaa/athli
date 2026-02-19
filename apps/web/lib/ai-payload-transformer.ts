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
  prescribedExerciseId?: string;
  name: string;
  category?: string;
  sets?: number;
  column1Label?: string;
  column1Value?: string;
  column2Label?: string;
  column2Value?: string | null;
  rest?: number | null;
  notes?: string | null;
  // Legacy fields (for backwards compatibility)
  reps?: string;
  weight?: string | null;
}

/**
 * Full API Workout Payload (what the backend expects)
 * Note: items, pre, post, completedSummary are at TOP LEVEL, not wrapped in workout_data.
 * The createWorkout function in coach-workout-service.ts extracts these and wraps them.
 */
export interface APIWorkoutPayload {
  name: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  items: APIWorkoutItem[];
  pre: Record<string, null>;
  post: Record<string, null | string>;
  completedSummary: Record<string, null | string | number>;
}

export interface APIWorkoutItem {
  itemType: 'section';
  data: APISectionData;
}

export interface APISectionData {
  id: string;
  name: string;
  type: string;
  exercises: APIExerciseGroup[];
  notes: string | null;
  completed: 'not_started' | 'in_progress' | 'completed';
}

export interface APIExerciseGroup {
  isSuperset: boolean;
  exercises: APIExercise[];
}

export interface APIExercise {
  prescribedExerciseId: string | null;
  performedExerciseId: string | null;
  id: string;
  sets: APISet[];
  alternatives: string[];
  notes: string | null;
  supersetId: string | null;
  eachSide: boolean;
  tempo: string | null;
  column1Label: string;
  column2Label: string;
  completed: 'not_started' | 'in_progress' | 'completed';
}

export interface APISet {
  setNumber: number;
  type: 'warmUp' | 'normal' | 'failure' | 'dropset';
  restSec: number | null;
  completed: 'not_started' | 'completed';
  skipped: boolean;
  trackableField1: {
    label: string;
    prescribed: string | null;
    completed: string | null;
  };
  trackableField2: {
    label: string;
    prescribed: string | null;
    completed: string | null;
  };
  dropset: null;
}

/**
 * Transform AI workout payload to full API format
 */
export function transformWorkoutPayload(aiPayload: AIWorkoutPayload): APIWorkoutPayload {
  const items: APIWorkoutItem[] = aiPayload.sections.map((section) => {
    const exerciseGroups: APIExerciseGroup[] = section.exercises.map((exercise) => {
      const numSets = exercise.sets || 3;
      const restSeconds = exercise.rest ?? 90;

      // Use new column fields if provided, fall back to legacy reps/weight fields
      const col1Label = exercise.column1Label || 'Reps';
      const col1Value = exercise.column1Value || exercise.reps || '10';
      const col2Label = exercise.column2Label || 'kg';
      const col2Value = exercise.column2Value !== undefined ? exercise.column2Value : (exercise.weight || null);

      const sets: APISet[] = Array.from({ length: numSets }, (_, index) => ({
        setNumber: index + 1,
        type: 'normal' as const,
        restSec: restSeconds,
        completed: 'not_started' as const,
        skipped: false,
        trackableField1: {
          label: col1Label,
          prescribed: col1Value,
          completed: null,
        },
        trackableField2: {
          label: col2Label,
          prescribed: col2Value,
          completed: null,
        },
        dropset: null,
      }));

      const apiExercise: APIExercise = {
        prescribedExerciseId: exercise.prescribedExerciseId || null,
        performedExerciseId: null,
        id: uuidv4(),
        sets,
        alternatives: [],
        notes: exercise.notes || null,
        supersetId: null,
        eachSide: false,
        tempo: null,
        column1Label: col1Label,
        column2Label: col2Label,
        completed: 'not_started',
      };

      return {
        isSuperset: false,
        exercises: [apiExercise],
      };
    });

    return {
      itemType: 'section' as const,
      data: {
        id: uuidv4(),
        name: section.name,
        type: section.type || 'regular',
        exercises: exerciseGroups,
        notes: null,
        completed: 'not_started' as const,
      },
    };
  });

  return {
    name: aiPayload.name,
    description: aiPayload.description || '',
    type: aiPayload.type || 'strength',
    difficulty: aiPayload.difficulty || 'intermediate',
    equipment: [],
    items,
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
      pausedAt: null,
      totalPausedMs: 0,
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
    exercises: APIExerciseGroup[];
  };
}

export function transformSectionPayload(aiPayload: AISectionPayload): APISectionPayload {
  const exerciseGroups: APIExerciseGroup[] = aiPayload.exercises.map((exercise) => {
    const numSets = exercise.sets || 3;
    const restSeconds = exercise.rest ?? 90;

    // Use new column fields if provided, fall back to legacy reps/weight fields
    const col1Label = exercise.column1Label || 'Reps';
    const col1Value = exercise.column1Value || exercise.reps || '10';
    const col2Label = exercise.column2Label || 'kg';
    const col2Value = exercise.column2Value !== undefined ? exercise.column2Value : (exercise.weight || null);

    const sets: APISet[] = Array.from({ length: numSets }, (_, index) => ({
      setNumber: index + 1,
      type: 'normal' as const,
      restSec: restSeconds,
      completed: 'not_started' as const,
      skipped: false,
      trackableField1: {
        label: col1Label,
        prescribed: col1Value,
        completed: null,
      },
      trackableField2: {
        label: col2Label,
        prescribed: col2Value,
        completed: null,
      },
      dropset: null,
    }));

    const apiExercise: APIExercise = {
      prescribedExerciseId: exercise.prescribedExerciseId || null,
      performedExerciseId: null,
      id: uuidv4(),
      sets,
      alternatives: [],
      notes: exercise.notes || null,
      supersetId: null,
      eachSide: false,
      tempo: null,
      column1Label: col1Label,
      column2Label: col2Label,
      completed: 'not_started',
    };

    return {
      isSuperset: false,
      exercises: [apiExercise],
    };
  });

  return {
    name: aiPayload.name,
    description: aiPayload.description || '',
    type: aiPayload.type || 'regular',
    section_data: {
      exercises: exerciseGroups,
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
