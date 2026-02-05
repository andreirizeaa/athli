/**
 * Web App Payload Builder - Adapter for Shared Package
 *
 * This file is a thin adapter that maps web-specific builder types to generic types,
 * then calls the shared payload builder functions.
 *
 * IMPORTANT: All actual payload building logic is in @athli/shared-types.
 * This file only handles web-specific type mapping.
 */

import type { SetData } from '@/components/training/builder/exercise-card';
import type {
  ExerciseWithSuperset,
  WorkoutSchema,
  WorkoutSchemaItem,
  WorkoutSection,
  WorkoutMeta,
} from '@/components/training/shared/types/workout-builder.types';
import {
  buildWorkoutPayload as sharedBuildWorkoutPayload,
  mapSetDataToPayload as sharedMapSetDataToPayload,
  type GenericWorkoutData,
  type GenericSetData,
  type GenericExerciseData,
  type GenericSectionData,
  type ExerciseType,
  type WorkoutProgramPayload,
} from '@athli/shared-types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Groups consecutive exercises that share a superset ID
 */
export const groupExercisesBySupersetForPayload = (
  exercises: ExerciseWithSuperset[]
): Array<ExerciseWithSuperset[]> => {
  const groups: Array<ExerciseWithSuperset[]> = [];
  let currentGroup: ExerciseWithSuperset[] = [];
  let currentGroupId: string | null = null;

  exercises.forEach((exercise) => {
    if (exercise.supersetGroupId) {
      if (exercise.supersetGroupId === currentGroupId) {
        currentGroup.push(exercise);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [exercise];
        currentGroupId = exercise.supersetGroupId;
      }
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentGroupId = null;
      }
      groups.push([exercise]);
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

// ============================================================================
// Type Adapters (Web → Generic)
// ============================================================================

/**
 * Helper to determine which field maps to column1/column2 based on column labels
 */
const getFieldForColumn = (set: SetData, columnLabel?: string): string | undefined => {
  if (!columnLabel || columnLabel === 'None') return undefined;

  // Map column labels to field names (must match exercise-card.tsx getFieldName logic)
  if (columnLabel === 'Reps') return set.reps;
  if (columnLabel === 'kg' || columnLabel === 'lbs') return set.weight;
  if (columnLabel === 'km' || columnLabel === 'm' || columnLabel === 'yards' || columnLabel === 'miles' || columnLabel === 'feet') return set.distance;
  if (columnLabel === 'minutes' || columnLabel === 'seconds') return set.duration;

  // For optional columns (Heart Rate Zone, Tempo, RIR, RPE, etc.)
  // These are stored in set.optional?.prescribed
  return set.optional?.prescribed;
};

/**
 * Convert web SetData to generic format
 * Uses column1/column2 approach to handle custom column labels properly
 */
const adaptSetData = (set: SetData, column1Label?: string, column2Label?: string): GenericSetData => ({
  setNumber: set.setNumber,
  type: set.type,
  // Use column1/column2 for proper label-to-field mapping
  column1: getFieldForColumn(set, column1Label),
  column2: getFieldForColumn(set, column2Label),
  // Keep original fields as fallback
  reps: set.reps,
  weight: set.weight,
  distance: set.distance,
  duration: set.duration,
  rest: set.rest,
});

/**
 * Convert web exercise to generic format
 */
const adaptExercise = (exercise: ExerciseWithSuperset): GenericExerciseData => ({
  id: exercise.instanceId, // Instance ID - unique for this specific exercise instance
  exerciseId: exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
    ? exercise.exerciseId
    : (exercise as any).instanceId || `unknown_${Date.now()}`,
  exerciseType: exercise.exerciseType as ExerciseType,
  sets: (exercise.sets || []).map(set => adaptSetData(set, exercise.column1Label, exercise.column2Label)),
  notes: exercise.notes || null,
  alternatives: exercise.alternatives || [],
  supersetGroupId: exercise.supersetGroupId || null,
  eachSide: exercise.eachSide || false,
  tempo: exercise.tempo || undefined,
  column1Label: exercise.column1Label,
  column2Label: exercise.column2Label,
});

/**
 * Convert web section to generic format
 */
export const adaptSection = (section: WorkoutSection): GenericSectionData => {
  const groupedExercises = groupExercisesBySupersetForPayload(section.exercises || []);

  return {
    id: section.id,
    name: section.name || '',
    type: section.type,
    exercises: groupedExercises.map(group => group.map(adaptExercise)),
    notes: section.notes || null,
    durationSec: section.roundDurationSec,
    category: section.category,
    // Tabata/HIIT/Circuits config
    workSec: section.workSec,
    restSec: section.restSec,
    rounds: section.rounds,
    // EMOM config
    intervalSec: section.intervalSec,
    durationMin: section.durationMin,
  };
};

// ============================================================================
// Public API (Maintains backwards compatibility)
// ============================================================================

/**
 * Map set data to payload (uses shared function)
 */
export const mapSetDataToPayload = (
  exerciseType: ExerciseType,
  set: SetData,
  column1Label?: string,
  column2Label?: string
) => {
  const genericSet = adaptSetData(set);
  return sharedMapSetDataToPayload(exerciseType, genericSet, column1Label, column2Label);
};

/**
 * Build complete workout payload (uses shared function)
 */
export const buildWorkoutPayload = (
  workoutSchema: WorkoutSchema,
  meta: WorkoutMeta | null
): WorkoutProgramPayload | null => {
  if (!meta) {
    return null;
  }

  // Convert web types to generic types
  const genericData: GenericWorkoutData = {
    meta: {
      id: (meta as any).id ?? null,
      name: meta.name,
      description: meta.description || '',
      type: meta.type || '',
      difficulty: meta.difficulty || '',
    },
    items: workoutSchema.items.map((item) => {
      if (item.itemType === 'section') {
        return {
          itemType: 'section',
          section: adaptSection(item.section),
        };
      } else {
        return {
          itemType: 'exercise',
          exercise: adaptExercise(item.exercise),
        };
      }
    }),
  };

  // Extract unique equipment
  const equipmentSet = new Set<string>();
  workoutSchema.items.forEach((item) => {
    if (item.itemType === 'exercise') {
      item.exercise.equipments?.forEach((equipment) => {
        if (equipment && equipment.trim() !== '') {
          equipmentSet.add(equipment);
        }
      });
    } else if (item.itemType === 'section') {
      item.section.exercises?.forEach((exercise) => {
        exercise.equipments?.forEach((equipment) => {
          if (equipment && equipment.trim() !== '') {
            equipmentSet.add(equipment);
          }
        });
      });
    }
  });

  // Call shared builder
  return sharedBuildWorkoutPayload(genericData, {
    equipment: Array.from(equipmentSet).sort(),
  });
};
