/**
 * Payload Converter - Shared between Web and Mobile Apps
 *
 * CRITICAL: This is the SINGLE source of truth for converting API payloads back to builder format.
 * Both web and mobile apps MUST use these functions to ensure consistency.
 *
 * ONE CONVERTER - ONE SCHEMA - NO DRIFT
 */

import type {
  SetPayload,
  WorkoutProgramPayload,
  WorkoutSectionPayload,
  WorkoutItem,
  RegularExercisePayload,
  RoundExercisePayload,
  CircuitExercisePayload,
  ExerciseGroupPayload,
  TrackableField,
} from './workout-schema';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get value from MetricNumber pattern or handle legacy plain numbers
 */
const getMetricValue = (metric: any): string => {
  if (metric === null || metric === undefined) return '';
  if (typeof metric === 'object' && 'prescribed' in metric) {
    return metric.prescribed?.toString() || '';
  }
  return metric.toString();
};

/**
 * Map column label to field name
 */
const getFieldNameForLabel = (
  columnLabel: string
): 'reps' | 'weight' | 'distance' | 'duration' | null => {
  if (!columnLabel) return null;
  const label = columnLabel.toLowerCase();
  if (label === 'reps' || label === 'rep') return 'reps';
  if (label === 'kg' || label === 'lbs' || label === 'lb') return 'weight';
  if (label === 'km' || label === 'm' || label === 'yards' || label === 'miles' || label === 'feet')
    return 'distance';
  if (label === 'minutes' || label === 'seconds' || label === 'mins' || label === 'secs') return 'duration';
  if (label === 'none') return null;
  return null;
};

/**
 * Reconstruct dropset string from stages
 */
const getDropsetString = (stages: any[], field: 'trackableField1' | 'trackableField2'): string => {
  if (!stages || stages.length === 0) return '';
  return stages
    .map((s) => {
      const val = s[field]?.prescribed;
      return val?.toString() || '';
    })
    .filter((v) => v !== '')
    .join('-');
};

/**
 * Normalize Heart Rate Zone values to mobile format
 * Web format: "Z1: 50-60% of max HR" -> Mobile format: "Zone 1"
 * This ensures cross-platform compatibility
 */
const normalizeHeartRateZone = (value: string): string => {
  if (!value) return value;

  // Check if it's web format (e.g., "Z1: 50-60% of max HR", "Z4: 80-90% of max HR")
  const webFormatMatch = value.match(/^Z(\d):/);
  if (webFormatMatch) {
    const zoneNumber = webFormatMatch[1];
    return `Zone ${zoneNumber}`;
  }

  // Already in mobile format or unrecognized format - return as is
  return value;
};

// ============================================================================
// Generic Set Data (for builder UI)
// ============================================================================

/**
 * Generic set data returned to builder (web/mobile agnostic)
 */
export interface GenericSetDataForBuilder {
  setNumber: number;
  type: 'normal' | 'warmUp' | 'failure' | 'dropset';
  reps: string;
  weight: string;
  distance: string;
  duration: string;
  rest: string;
  leftReps?: string;
  rightReps?: string;
  leftWeight?: string;
  rightWeight?: string;
  optional?: {
    prescribed: string;
    completed: string;
  };
}

/**
 * Convert set payload to generic builder format
 */
export const convertSetToBuilderFormat = (
  set: SetPayload,
  exerciseType: string,
  column1Label?: string,
  column2Label?: string
): GenericSetDataForBuilder => {
  const isDropset = set.type === 'dropset';

  // Initialize all values
  let reps = '';
  let weight = '';
  let distance = '';
  let duration = '';
  let optionalValue = '';

  // Get raw values from trackable fields
  let column1Value = set.trackableField1?.prescribed?.toString() || '';
  let column2Value = set.trackableField2?.prescribed?.toString() || '';

  // Normalize Heart Rate Zone values for cross-platform compatibility
  if (column1Label === 'Heart Rate Zone' && column1Value) {
    column1Value = normalizeHeartRateZone(column1Value);
  }
  if (column2Label === 'Heart Rate Zone' && column2Value) {
    column2Value = normalizeHeartRateZone(column2Value);
  }

  // Determine field mapping based on column labels
  const field1 = column1Label ? getFieldNameForLabel(column1Label) : null;
  const field2 = column2Label ? getFieldNameForLabel(column2Label) : null;

  // Map values to correct fields based on labels
  if (column1Label && column1Value) {
    if (field1 === 'reps') reps = column1Value;
    else if (field1 === 'weight') weight = column1Value;
    else if (field1 === 'distance') distance = column1Value;
    else if (field1 === 'duration') duration = column1Value;
    else if (field1 === null) {
      // Treat as optional column (e.g., Heart Rate Zone, Tempo, RIR, RPE, etc.)
      optionalValue = column1Value;
    } else {
      reps = column1Value; // Default to reps
    }
  }

  if (column2Label && column2Value) {
    if (field2 === 'reps') reps = column2Value;
    else if (field2 === 'weight') weight = column2Value;
    else if (field2 === 'distance') distance = column2Value;
    else if (field2 === 'duration') duration = column2Value;
    else if (field2 === null) {
      // Treat as optional column (e.g., Heart Rate Zone, Tempo, RIR, RPE, etc.)
      optionalValue = column2Value;
    } else {
      weight = column2Value; // Default to weight
    }
  }

  // Fallback to exercise type-based logic if no column labels
  if (!column1Label && !column2Label) {
    if (exerciseType !== 'distance_duration') {
      reps = column1Value;
    }
    if (exerciseType === 'weight_reps') {
      weight = column2Value;
    }
    if (exerciseType === 'distance_duration') {
      distance = column1Value;
      duration = column2Value;
    }
  }

  // Handle dropset overrides
  if (isDropset && set.dropset?.stages) {
    const dropsetReps = getDropsetString(set.dropset.stages, 'trackableField1');
    if (dropsetReps) reps = dropsetReps;

    if (exerciseType === 'weight_reps') {
      const dropsetWeight = getDropsetString(set.dropset.stages, 'trackableField2');
      if (dropsetWeight && dropsetWeight.includes('-')) weight = dropsetWeight;
    }
  }

  return {
    setNumber: set.setNumber,
    type: set.type,
    reps,
    weight,
    rest: set.restSec?.toString() || '',
    distance,
    duration,
    optional: optionalValue
      ? {
          prescribed: optionalValue,
          completed: '',
        }
      : undefined,
  };
};

// ============================================================================
// Generic Exercise Data (for builder UI)
// ============================================================================

/**
 * Generic exercise data returned to builder
 */
export interface GenericExerciseDataForBuilder {
  exerciseId: string;
  performedExerciseId?: string | null;
  exerciseType: string;
  sets: GenericSetDataForBuilder[];
  notes: string;
  alternatives: string[];
  supersetGroupId: string | null;
  eachSide: boolean;
  tempo?: string;
  column1Label?: string;
  column2Label?: string;
}

/**
 * Convert regular exercise payload to builder format
 */
export const convertRegularExerciseToBuilderFormat = (
  exercise: RegularExercisePayload
): GenericExerciseDataForBuilder => {
  const exerciseType = 'weight_reps';
  const column1Label = exercise.column1Label;
  const column2Label = exercise.column2Label;

  return {
    exerciseId: exercise.prescribedExerciseId,
    performedExerciseId: exercise.performedExerciseId,
    exerciseType,
    sets: exercise.sets.map((set) =>
      convertSetToBuilderFormat(set, exerciseType, column1Label, column2Label)
    ),
    notes: exercise.notes || '',
    alternatives: exercise.alternatives || [],
    supersetGroupId: exercise.supersetId,
    eachSide: exercise.eachSide || false,
    tempo: exercise.tempo || undefined,
    column1Label,
    column2Label,
  };
};

/**
 * Convert round exercise payload to builder format (AMRAP/Timed)
 */
export const convertRoundExerciseToBuilderFormat = (
  exercise: RoundExercisePayload
): GenericExerciseDataForBuilder => {
  const exerciseType = 'weight_reps';

  // Create a single set from trackable fields
  const set: GenericSetDataForBuilder = {
    setNumber: 1,
    type: 'normal',
    reps: exercise.trackableField1?.prescribed?.toString() || '',
    weight: exercise.trackableField2?.prescribed?.toString() || '',
    distance: '',
    duration: '',
    rest: exercise.restSec?.toString() || '',
  };

  return {
    exerciseId: exercise.prescribedExerciseId,
    performedExerciseId: exercise.performedExerciseId,
    exerciseType,
    sets: [set],
    notes: exercise.notes || '',
    alternatives: [],
    supersetGroupId: null,
    eachSide: exercise.eachSide || false,
    tempo: exercise.tempo || undefined,
    column1Label: exercise.trackableField1?.label,
    column2Label: exercise.trackableField2?.label,
  };
};

/**
 * Convert circuit exercise payload to builder format
 */
export const convertCircuitExerciseToBuilderFormat = (
  exercise: CircuitExercisePayload
): GenericExerciseDataForBuilder => {
  const exerciseType = 'weight_reps';
  const column1Label = exercise.column1Label;
  const column2Label = exercise.column2Label;

  return {
    exerciseId: exercise.prescribedExerciseId,
    performedExerciseId: exercise.performedExerciseId,
    exerciseType,
    sets: [convertSetToBuilderFormat(exercise.set, exerciseType, column1Label, column2Label)],
    notes: exercise.notes || '',
    alternatives: exercise.alternatives || [],
    supersetGroupId: exercise.supersetId,
    eachSide: exercise.eachSide || false,
    tempo: exercise.tempo || undefined,
    column1Label,
    column2Label,
  };
};

// ============================================================================
// Generic Section Data (for builder UI)
// ============================================================================

/**
 * Generic section data returned to builder
 */
export interface GenericSectionDataForBuilder {
  id: string;
  name: string;
  type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';
  exercises: GenericExerciseDataForBuilder[][];  // Grouped by superset
  notes: string;
  // For AMRAP
  durationSec?: number;
  // For Timed/Circuits
  targetRounds?: number;
  // For Auxiliary
  category?: 'warmup' | 'cooldown' | 'mobility';
}

/**
 * Convert section payload to builder format
 */
export const convertSectionToBuilderFormat = (
  section: WorkoutSectionPayload
): GenericSectionDataForBuilder => {
  if (section.type === 'regular') {
    const exercises = section.exercises.map((group) =>
      group.exercises.map((ex) => convertRegularExerciseToBuilderFormat(ex))
    );

    return {
      id: section.id,
      name: section.name,
      type: 'regular',
      exercises,
      notes: section.notes || '',
    };
  }

  if (section.type === 'amrap') {
    // Flatten AMRAP exercises (no supersets in round-based sections)
    const exercises = section.exercises.map((ex) => [convertRoundExerciseToBuilderFormat(ex)]);

    return {
      id: section.id,
      name: section.name,
      type: 'amrap',
      exercises,
      notes: section.notes || '',
      durationSec: section.durationSec,
    };
  }

  if (section.type === 'timed') {
    const exercises = section.exercises.map((ex) => [convertRoundExerciseToBuilderFormat(ex)]);

    return {
      id: section.id,
      name: section.name,
      type: 'timed',
      exercises,
      notes: section.notes || '',
      targetRounds: section.targetRounds,
    };
  }

  if (section.type === 'circuits') {
    const exercises = section.exercises.map((group) =>
      group.exercises.map((ex) => convertCircuitExerciseToBuilderFormat(ex))
    );

    return {
      id: section.id,
      name: section.name,
      type: 'circuits',
      exercises,
      notes: section.notes || '',
      targetRounds: section.targetRounds,
    };
  }

  // Auxiliary
  const exercises = section.exercises.map((group) =>
    group.exercises.map((ex) => convertRegularExerciseToBuilderFormat(ex))
  );

  return {
    id: section.id,
    name: section.name,
    type: 'auxiliary',
    exercises,
    notes: section.notes || '',
    category: section.category,
  };
};

// ============================================================================
// Complete Workout Conversion
// ============================================================================

/**
 * Generic workout data returned to builder
 */
export interface GenericWorkoutDataForBuilder {
  id: string | null;
  name: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  items: Array<
    | { itemType: 'exercise'; exercise: GenericExerciseDataForBuilder }
    | { itemType: 'section'; section: GenericSectionDataForBuilder }
  >;
}

/**
 * Convert complete workout payload to builder format
 *
 * This is the universal function both web and mobile should use
 */
export const convertWorkoutPayloadToBuilderFormat = (
  payload: WorkoutProgramPayload
): GenericWorkoutDataForBuilder => {
  console.log('[PAYLOAD CONVERTER] Converting payload to builder format');

  const items = payload.items.map((item) => {
    if (item.itemType === 'section') {
      return {
        itemType: 'section' as const,
        section: convertSectionToBuilderFormat(item.data),
      };
    } else {
      return {
        itemType: 'exercise' as const,
        exercise: convertRegularExerciseToBuilderFormat(item.data as RegularExercisePayload),
      };
    }
  });

  return {
    id: payload.id,
    name: payload.name,
    description: payload.description,
    type: payload.type,
    difficulty: payload.difficulty,
    equipment: payload.equipment,
    items,
  };
};
