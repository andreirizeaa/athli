/**
 * Payload Builder - Shared between Web and Mobile Apps
 *
 * CRITICAL: This is the SINGLE source of truth for converting workout data to API payload format.
 * Both web and mobile apps MUST use these functions to ensure consistency.
 *
 * ONE BUILDER - ONE SCHEMA - NO DRIFT
 */

import type {
  SetPayload,
  WorkoutProgramPayload,
  WorkoutSectionPayload,
  WorkoutItem,
  ExerciseGroupPayload,
  RegularExercisePayload,
  RoundExercisePayload,
  CircuitExerciseGroupPayload,
  CircuitExercisePayload,
} from './workout-schema';
import { DEFAULT_EXECUTION_FIELDS, createTrackableField } from './workout-schema';
import type { ExerciseType } from './training-constants';

// ============================================================================
// Helper Types and Functions
// ============================================================================

/**
 * Parser type for handling null vs undefined returns
 */
export type ParserType = 'null' | 'undefined';

/**
 * Parse a string to number with configurable null/undefined handling
 */
export const parseNumber = (
  value?: string | null,
  returnType: ParserType = 'null'
): number | null | undefined => {
  if (!value) return returnType === 'null' ? null : undefined;
  const n = Number(value);
  return Number.isNaN(n) ? (returnType === 'null' ? null : undefined) : n;
};

/**
 * Parse dropset stages from string format (e.g., "12-10-8")
 */
export const parseStages = (value?: string): number[] => {
  if (!value) return [];
  return value
    .split('-')
    .map((part) => Number(part.trim()))
    .filter((n) => !Number.isNaN(n));
};

/**
 * Get default column labels based on exercise type
 */
export const getDefaultColumnLabels = (exerciseType: ExerciseType): { column1: string; column2: string } => {
  switch (exerciseType) {
    case 'weight_reps':
      return { column1: 'Reps', column2: 'kg' };
    case 'distance_duration':
      return { column1: 'km', column2: 'minutes' };
    case 'reps':
    default:
      return { column1: 'Reps', column2: 'None' };
  }
};

// ============================================================================
// Set Payload Building (Universal for Web & Mobile)
// ============================================================================

/**
 * Generic set data interface that both web and mobile can adapt to
 */
export interface GenericSetData {
  setNumber: number;
  type?: 'normal' | 'warmUp' | 'failure' | 'dropset' | string;
  // Values for trackable fields
  reps?: string;
  weight?: string;
  distance?: string;
  duration?: string;
  rest?: string;
  // For mobile compatibility
  column1?: string;
  column2?: string;
}

/**
 * Maps generic set data to payload format using TrackableField pattern
 *
 * This is the CORE function that both web and mobile must use
 */
export const mapSetDataToPayload = (
  exerciseType: ExerciseType,
  set: GenericSetData,
  column1Label?: string,
  column2Label?: string,
  _parserType: ParserType = 'null'  // Reserved for future use
): SetPayload => {
  // Get default labels if not provided
  const defaults = getDefaultColumnLabels(exerciseType);
  const col1Label = column1Label || defaults.column1;
  const col2Label = column2Label || defaults.column2;

  // Determine field values based on exercise type and available data
  let field1Value: string | null = null;
  let field2Value: string | null = null;

  // Try to get values from column1/column2 first (mobile format)
  if (set.column1 !== undefined) {
    field1Value = set.column1 || null;
  } else if (exerciseType === 'distance_duration') {
    field1Value = set.distance || null;
  } else {
    field1Value = set.reps || null;
  }

  if (set.column2 !== undefined) {
    field2Value = set.column2 || null;
  } else if (exerciseType === 'distance_duration') {
    field2Value = set.duration || null;
  } else if (exerciseType === 'weight_reps') {
    field2Value = set.weight || null;
  }

  // Map set type to standard format
  let setType: 'normal' | 'warmUp' | 'failure' | 'dropset' = 'normal';
  if (set.type) {
    if (set.type === 'warmUp' || set.type === 'W') setType = 'warmUp';
    else if (set.type === 'failure' || set.type === 'F') setType = 'failure';
    else if (set.type === 'dropset' || set.type === 'D') setType = 'dropset';
  }

  const base: SetPayload = {
    setNumber: set.setNumber,
    type: setType,
    restSec: set.rest ? (parseNumber(set.rest, 'null') ?? null) : null,
    completed: false,
    skipped: false,
    trackableField1: createTrackableField(col1Label, field1Value),
    trackableField2: createTrackableField(col2Label, field2Value),
    dropset: null,
  };

  // Handle dropsets
  if (setType === 'dropset') {
    const field1Stages = parseStages(field1Value || undefined);
    const field2Stages = exerciseType === 'weight_reps' ? parseStages(field2Value || undefined) : [];

    const stages = Array.from(
      { length: Math.max(field1Stages.length, field2Stages.length) },
      (_v, index) => {
        const field1Prescribed = field1Stages[index]?.toString() ?? null;
        const field2Prescribed = field2Stages[index]?.toString() ?? null;
        return {
          trackableField1: createTrackableField(col1Label, field1Prescribed),
          trackableField2: createTrackableField(col2Label, field2Prescribed),
          completed: false,
        };
      }
    ).filter((s) => s.trackableField1.prescribed != null || s.trackableField2.prescribed != null);

    return {
      ...base,
      type: 'dropset' as const,
      dropset: { stages },
    };
  }

  return base;
};

// ============================================================================
// Exercise Payload Building
// ============================================================================

/**
 * Generic exercise data interface that both web and mobile can adapt to
 */
export interface GenericExerciseData {
  id: string; // Instance ID - unique for this specific exercise instance in the workout/section
  exerciseId: string; // Exercise library reference ID
  exerciseType: ExerciseType;
  sets?: GenericSetData[];
  notes?: string | null;
  alternatives?: string[];
  supersetGroupId?: string | null; // References the instance ID of another exercise in the superset
  eachSide?: boolean;
  tempo?: string | null;
  column1Label?: string;
  column2Label?: string;
  // For mobile
  column1Type?: string;
  column2Type?: string;
  // For mobile sections (AMRAP/Timed)
  column1?: string;
  column2?: string;
  restSec?: number | null;
}

/**
 * Build a regular exercise payload (with sets)
 */
export const buildRegularExercisePayload = (
  exercise: GenericExerciseData,
  parserType: ParserType = 'null'
): RegularExercisePayload => {
  const col1Label = exercise.column1Label || exercise.column1Type || 'Reps';
  const col2Label = exercise.column2Label || exercise.column2Type || 'kg';

  return {
    id: exercise.id, // Instance ID
    prescribedExerciseId: exercise.exerciseId,
    performedExerciseId: null,
    sets: (exercise.sets || []).map((set) =>
      mapSetDataToPayload(exercise.exerciseType, set, col1Label, col2Label, parserType)
    ),
    alternatives: exercise.alternatives || [],
    supersetId: exercise.supersetGroupId || null,
    notes: exercise.notes || null,
    eachSide: exercise.eachSide || false,
    tempo: exercise.tempo || null,
    column1Label: col1Label,
    column2Label: col2Label,
  };
};

/**
 * Build a round exercise payload (for AMRAP/Timed sections)
 */
export const buildRoundExercisePayload = (
  exercise: GenericExerciseData,
  _parserType: ParserType = 'null'  // Reserved for future use
): RoundExercisePayload => {
  const col1Label = exercise.column1Label || exercise.column1Type || 'Reps';
  const col2Label = exercise.column2Label || exercise.column2Type || 'kg';

  // Get prescribed values from first set or direct values
  const firstSet = exercise.sets?.[0];
  const field1Value = firstSet?.reps || firstSet?.column1 || exercise.column1 || null;
  const field2Value = firstSet?.weight || firstSet?.column2 || exercise.column2 || null;

  return {
    id: exercise.id, // Instance ID
    prescribedExerciseId: exercise.exerciseId,
    performedExerciseId: null,
    notes: exercise.notes || null,
    completed: false,
    eachSide: exercise.eachSide || false,
    tempo: exercise.tempo || null,
    trackableField1: createTrackableField(col1Label, field1Value),
    trackableField2: createTrackableField(col2Label, field2Value),
    restSec: exercise.restSec ?? (firstSet?.rest ? (parseNumber(firstSet.rest, 'null') ?? null) : null),
    alternatives: exercise.alternatives || [],
    supersetId: exercise.supersetGroupId || null,
    column1Label: col1Label,
    column2Label: col2Label,
  };
};

/**
 * Build a circuit exercise payload (single set per exercise)
 */
export const buildCircuitExercisePayload = (
  exercise: GenericExerciseData,
  parserType: ParserType = 'null'
): CircuitExercisePayload => {
  const col1Label = exercise.column1Label || exercise.column1Type || 'Reps';
  const col2Label = exercise.column2Label || exercise.column2Type || 'kg';

  const firstSet = exercise.sets?.[0] || {
    setNumber: 1,
    type: 'normal',
    reps: '0',
    weight: '0',
    rest: '0',
  };

  return {
    id: exercise.id, // Instance ID
    prescribedExerciseId: exercise.exerciseId,
    performedExerciseId: null,
    set: mapSetDataToPayload(exercise.exerciseType, firstSet, col1Label, col2Label, parserType),
    alternatives: exercise.alternatives || [],
    supersetId: exercise.supersetGroupId || null,
    notes: exercise.notes || null,
    eachSide: exercise.eachSide || false,
    tempo: exercise.tempo || null,
    column1Label: col1Label,
    column2Label: col2Label,
  };
};

// ============================================================================
// Section Payload Building
// ============================================================================

/**
 * Generic section data interface
 */
export interface GenericSectionData {
  id: string;
  name: string;
  type: 'regular' | 'amrap' | 'tabata' | 'hiit' | 'emom' | 'circuits' | 'auxiliary';
  exercises: GenericExerciseData[][];  // Already grouped by superset
  notes?: string | null;
  // For AMRAP
  durationSec?: number;
  // For Tabata/HIIT/Circuits
  workSec?: number;
  restSec?: number;
  rounds?: number;
  // For EMOM
  intervalSec?: number;
  durationMin?: number;
  // For Auxiliary
  category?: 'warmup' | 'cooldown' | 'mobility';
}

/**
 * Build a section payload
 */
export const buildSectionPayload = (
  section: GenericSectionData,
  parserType: ParserType = 'null'
): WorkoutSectionPayload => {
  if (section.type === 'regular') {
    const exercises: ExerciseGroupPayload[] = section.exercises.map((group) => ({
      isSuperset: group.length > 1,
      exercises: group.map((ex) => buildRegularExercisePayload(ex, parserType)),
    }));

    return {
      id: section.id,
      name: section.name,
      type: 'regular',
      exercises,
      notes: section.notes || null,
      completed: false,
    };
  }

  if (section.type === 'amrap') {
    // Flatten exercises for AMRAP (no supersets in round-based sections)
    const flatExercises = section.exercises.flat();
    const exercises: RoundExercisePayload[] = flatExercises.map((ex) =>
      buildRoundExercisePayload(ex, parserType)
    );

    return {
      id: section.id,
      name: section.name,
      type: 'amrap',
      durationSec: section.durationSec || 0,
      roundsCompleted: null,
      exercises,
      notes: section.notes || null,
      completed: false,
    };
  }

  if (section.type === 'tabata') {
    const exercises: CircuitExerciseGroupPayload[] = section.exercises.map((group) => ({
      isSuperset: group.length > 1,
      exercises: group.map((ex) => buildCircuitExercisePayload(ex, parserType)),
    }));

    return {
      id: section.id,
      name: section.name,
      type: 'tabata',
      workSec: section.workSec || 20,
      restSec: section.restSec || 10,
      rounds: section.rounds || 8,
      exercises,
      notes: section.notes || null,
      completed: false,
    };
  }

  if (section.type === 'hiit') {
    const exercises: CircuitExerciseGroupPayload[] = section.exercises.map((group) => ({
      isSuperset: group.length > 1,
      exercises: group.map((ex) => buildCircuitExercisePayload(ex, parserType)),
    }));

    return {
      id: section.id,
      name: section.name,
      type: 'hiit',
      workSec: section.workSec || 40,
      restSec: section.restSec || 20,
      rounds: section.rounds || 10,
      exercises,
      notes: section.notes || null,
      completed: false,
    };
  }

  if (section.type === 'emom') {
    const exercises: CircuitExerciseGroupPayload[] = section.exercises.map((group) => ({
      isSuperset: group.length > 1,
      exercises: group.map((ex) => buildCircuitExercisePayload(ex, parserType)),
    }));

    return {
      id: section.id,
      name: section.name,
      type: 'emom',
      intervalSec: section.intervalSec || 60,
      durationMin: section.durationMin || 10,
      exercises,
      notes: section.notes || null,
      completed: false,
    };
  }

  if (section.type === 'circuits') {
    const exercises: CircuitExerciseGroupPayload[] = section.exercises.map((group) => ({
      isSuperset: group.length > 1,
      exercises: group.map((ex) => buildCircuitExercisePayload(ex, parserType)),
    }));

    return {
      id: section.id,
      name: section.name,
      type: 'circuits',
      rounds: section.rounds || 3,
      exercises,
      notes: section.notes || null,
      completed: false,
    };
  }

  // Auxiliary
  const exercises: ExerciseGroupPayload[] = section.exercises.map((group) => ({
    isSuperset: group.length > 1,
    exercises: group.map((ex) => buildRegularExercisePayload(ex, parserType)),
  }));

  return {
    id: section.id,
    name: section.name,
    type: 'auxiliary',
    category: section.category || 'warmup',
    exercises,
    notes: section.notes || null,
    completed: false,
  };
};

// ============================================================================
// Complete Workout Payload Building
// ============================================================================

/**
 * Generic workout metadata
 */
export interface GenericWorkoutMeta {
  id?: string | null;
  name: string;
  description?: string;
  type?: string;
  difficulty?: string;
}

/**
 * Generic workout data structure
 */
export interface GenericWorkoutData {
  meta: GenericWorkoutMeta;
  items: Array<
    | { itemType: 'exercise'; exercise: GenericExerciseData }
    | { itemType: 'section'; section: GenericSectionData }
  >;
}

/**
 * Build complete workout payload from generic data
 *
 * This is the universal function both web and mobile should use
 */
export const buildWorkoutPayload = (
  data: GenericWorkoutData,
  options?: {
    parserType?: ParserType;
    equipment?: string[];
  }
): WorkoutProgramPayload => {
  const parserType = options?.parserType || 'null';

  // Build items array
  const items: WorkoutItem[] = data.items.map((item) => {
    if (item.itemType === 'section') {
      return {
        itemType: 'section' as const,
        data: buildSectionPayload(item.section, parserType),
      };
    } else {
      return {
        itemType: 'exercise' as const,
        data: buildRegularExercisePayload(item.exercise, parserType),
      };
    }
  });

  // Calculate total exercises
  let totalExercises = 0;
  items.forEach((item) => {
    if (item.itemType === 'exercise') {
      totalExercises += 1;
    } else if (item.itemType === 'section') {
      const section = item.data;
      if (section.type === 'regular' || section.type === 'auxiliary') {
        section.exercises.forEach((group) => {
          totalExercises += group.exercises.length;
        });
      } else if (section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom' || section.type === 'circuits') {
        section.exercises.forEach((group) => {
          totalExercises += group.exercises.length;
        });
      } else if (section.type === 'amrap') {
        totalExercises += section.exercises.length;
      }
    }
  });

  return {
    id: data.meta.id || null,
    name: data.meta.name,
    description: data.meta.description || '',
    type: data.meta.type || '',
    difficulty: data.meta.difficulty || '',
    equipment: options?.equipment || [],
    totalExercises,
    items,
    ...DEFAULT_EXECUTION_FIELDS,
  };
};
