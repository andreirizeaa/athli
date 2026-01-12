import type {
  CircuitExerciseGroupPayload,
  CircuitExercisePayload,
  ExerciseGroupPayload,
  ExerciseType,
  RegularExercisePayload,
  RoundExercisePayload,
  SetPayload,
  WorkoutProgramPayload,
  WorkoutSectionPayload,
  WorkoutItem,
} from '@/components/training/workout-schema';
import { DEFAULT_EXECUTION_FIELDS } from '@/components/training/workout-schema';
import type { SetData } from '@/components/training/builder/exercise-card';
import type {
  ExerciseWithSuperset,
  WorkoutSchema,
  WorkoutSchemaItem,
  WorkoutSection,
  WorkoutMeta,
} from '@/components/training/shared/types/workout-builder.types';

/**
 * Groups consecutive exercises that share a superset ID
 * Used only for payload building
 *
 * @param exercises - Array of exercises with superset information
 * @returns Array of exercise groups (supersets and individual exercises)
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



/**
 * Parse helper functions for payload building
 */
type ParserType = 'null' | 'undefined';

const parseNumber = (value?: string, returnType: ParserType = 'null'): number | null | undefined => {
  if (!value) return returnType === 'null' ? null : undefined;
  const n = Number(value);
  return Number.isNaN(n) ? (returnType === 'null' ? null : undefined) : n;
};

const parseStages = (value?: string): number[] => {
  if (!value) return [];
  return value
    .split('-')
    .map((part) => Number(part.trim()))
    .filter((n) => !Number.isNaN(n));
};

/**
 * Maps set data from the builder UI format to the payload format using TrackableField pattern
 *
 * @param exerciseType - The type of exercise
 * @param set - The set data from the builder
 * @param column1Label - Label for trackableField1 (e.g., 'Reps', 'km')
 * @param column2Label - Label for trackableField2 (e.g., 'kg', 'lbs')
 * @param parserType - Whether to use 'null' or 'undefined' for empty values (standard uses null, AI uses both)
 * @returns The set payload
 */
export const mapSetDataToPayload = (
  exerciseType: ExerciseType,
  set: SetData,
  column1Label: string = 'Reps',
  column2Label: string = 'kg',
  parserType: ParserType = 'null'
): SetPayload => {
  // Helper to create a TrackableField
  const createField = (label: string, value: string | undefined): { label: string; prescribed: string | null; completed: string | null } => ({
    label,
    prescribed: value || null,
    completed: value || null,  // Pre-filled with prescribed
  });

  // Determine which UI field maps to which trackable field based on exercise type
  let field1Value: string | undefined;
  let field2Value: string | undefined;

  if (exerciseType === 'distance_duration') {
    field1Value = set.distance;
    field2Value = set.duration;
  } else if (exerciseType === 'weight_reps') {
    field1Value = set.reps;
    field2Value = set.weight;
  } else {
    // reps-only
    field1Value = set.reps;
    field2Value = undefined;
  }

  const base: SetPayload = {
    setNumber: set.setNumber,
    type: set.type || 'normal',
    restSec: set.rest ? (parseNumber(set.rest, 'null') ?? null) : null,
    completed: false,
    skipped: false,
    trackableField1: createField(column1Label, field1Value),
    trackableField2: createField(column2Label, field2Value),
    dropset: null,
  };

  // Handle dropsets
  if (set.type === 'dropset') {
    const field1Stages = parseStages(field1Value);
    const field2Stages = exerciseType === 'weight_reps' ? parseStages(field2Value) : [];

    const stages = Array.from(
      { length: Math.max(field1Stages.length, field2Stages.length) },
      (_v, index) => {
        const field1Prescribed = field1Stages[index]?.toString() ?? null;
        const field2Prescribed = field2Stages[index]?.toString() ?? null;
        return {
          trackableField1: {
            label: column1Label,
            prescribed: field1Prescribed,
            completed: field1Prescribed,
          },
          trackableField2: {
            label: column2Label,
            prescribed: field2Prescribed,
            completed: field2Prescribed,
          },
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

/**
 * Builds a section payload from a WorkoutSection
 */
const buildSectionPayload = (
  section: WorkoutSection,
  parserType: ParserType
): WorkoutSectionPayload => {
  if (section.type === 'regular') {
    const groups = groupExercisesBySupersetForPayload(section.exercises || []);

    const exercises: ExerciseGroupPayload[] = groups.map((group) => {
      const mapped = group.map<RegularExercisePayload>((exercise) => {
        // Use exerciseId if available, otherwise fall back to instanceId
        // This ensures we never have an undefined id in the payload
        const prescribedId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
          ? exercise.exerciseId
          : (exercise as any).instanceId || `unknown_${Date.now()}`;

        if (!exercise.exerciseId || exercise.exerciseId.startsWith('empty_')) {
          console.warn('Exercise missing exerciseId, using fallback:', prescribedId);
        }

        const col1Label = exercise.column1Label || 'Reps';
        const col2Label = exercise.column2Label || 'kg';

        return {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) =>
            mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, col1Label, col2Label, parserType)
          ),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || null,  // Use null, not undefined
          notes: exercise.notes || null,  // Use null, not empty string
          eachSide: exercise.eachSide || false,
          tempo: exercise.tempo || null,
          column1Label: col1Label,
          column2Label: col2Label,
          optionalColumnType: exercise.optionalColumnType || null,
        };
      });

      const isSuperset = mapped.length > 1;

      return {
        isSuperset,
        exercises: mapped,
      };
    });

    return {
      id: section.id,
      name: section.name || '',
      type: 'regular',
      exercises,
      notes: section.notes || null,
    };
  }

  if (section.type === 'amrap') {
    const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => {
      const firstSet = exercise.sets?.[0];

      // Use exerciseId if available and not empty_, otherwise fall back to instanceId
      const prescribedId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
        ? exercise.exerciseId
        : (exercise.instanceId || exercise.id || `unknown_${Date.now()}`);

      // Get column labels (for trackable fields)
      const column1Label = exercise.column1Label || 'Reps';
      const column2Label = exercise.column2Label || 'kg';

      // Get prescribed values from first set
      const field1Value = firstSet?.reps || firstSet?.duration || firstSet?.distance || null;
      const field2Value = firstSet?.weight || null;

      return {
        prescribedExerciseId: prescribedId,
        performedExerciseId: null,  // null => same as prescribed
        exerciseType: exercise.exerciseType,
        trackableField1: {
          label: column1Label,
          prescribed: field1Value,
          completed: null,
        },
        trackableField2: {
          label: column2Label,
          prescribed: field2Value,
          completed: null,
        },
        restSec: parseNumber(firstSet?.rest, 'null') ?? exercise.restSec ?? null,
        completed: false,
        notes: exercise.notes || null,
        eachSide: exercise.eachSide || false,
        tempo: exercise.tempo || null,
      } as RoundExercisePayload;
    });

    return {
      id: section.id,
      name: section.name || '',
      type: 'amrap',
      durationSec: section.roundDurationSec || 0,
      actualDurationSec: null,  // Client fills this when completing
      roundsCompleted: null,    // Client fills this when completing
      exercises,
      notes: section.notes || null,
    } as WorkoutSectionPayload;
  }

  if (section.type === 'circuits') {
    const groups = groupExercisesBySupersetForPayload(section.exercises || []);

    const exercises: CircuitExerciseGroupPayload[] = groups.map((group) => {
      const mapped = group.map<CircuitExercisePayload>((exercise) => {
        const firstSet =
          (exercise.sets && exercise.sets[0]) || {
            setNumber: 1,
            type: 'normal' as const,
            reps: '0',
            weight: '0',
            rest: '0',
          };

        // Use exerciseId if available, otherwise fall back to instanceId
        const prescribedId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
          ? exercise.exerciseId
          : (exercise as any).instanceId || `unknown_${Date.now()}`;

        const col1Label = exercise.column1Label || 'Reps';
        const col2Label = exercise.column2Label || 'kg';

        return {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: exercise.exerciseType as ExerciseType,
          set: mapSetDataToPayload(exercise.exerciseType as ExerciseType, firstSet, col1Label, col2Label, parserType),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || null,  // Use null, not undefined
          notes: exercise.notes || null,
          eachSide: exercise.eachSide || false,
          tempo: exercise.tempo || null,
          column1Label: col1Label,
          column2Label: col2Label,
          optionalColumnType: exercise.optionalColumnType || null,
        };
      });

      const isSuperset = mapped.length > 1;

      return {
        isSuperset,
        exercises: mapped,
      };
    });

    return {
      id: section.id,
      name: section.name || '',
      type: 'circuits',
      targetRounds: section.targetRounds || 0,
      actualRounds: null,       // Client fills this when completing
      totalDurationSec: null,   // Client fills this when completing
      exercises,
      notes: section.notes || null,
    } as WorkoutSectionPayload;
  }

  if (section.type === 'auxiliary') {
    const groups = groupExercisesBySupersetForPayload(section.exercises || []);

    const exercises: ExerciseGroupPayload[] = groups.map((group) => {
      const mapped = group.map<RegularExercisePayload>((exercise) => {
        // Use exerciseId if available, otherwise fall back to instanceId
        const prescribedId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
          ? exercise.exerciseId
          : (exercise as any).instanceId || `unknown_${Date.now()}`;

        const col1Label = exercise.column1Label || 'Reps';
        const col2Label = exercise.column2Label || 'kg';

        return {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) =>
            mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, col1Label, col2Label, parserType)
          ),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || null,  // Use null, not undefined
          notes: exercise.notes || null,
          eachSide: exercise.eachSide || false,
          tempo: exercise.tempo || null,
          column1Label: col1Label,
          column2Label: col2Label,
          optionalColumnType: exercise.optionalColumnType || null,
        };
      });

      const isSuperset = mapped.length > 1;

      return {
        isSuperset,
        exercises: mapped,
      };
    });

    return {
      id: section.id,
      name: section.name || '',
      type: 'auxiliary',
      category: section.category || 'warmup',
      exercises,
      notes: section.notes || null,
    };
  }

  // Timed section
  const timedExercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => {
    const firstSet = exercise.sets?.[0];

    // Use exerciseId if available and not empty_, otherwise fall back to instanceId
    const prescribedId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
      ? exercise.exerciseId
      : (exercise.instanceId || exercise.id || `unknown_${Date.now()}`);

    // Get column labels (for trackable fields)
    const column1Label = exercise.column1Label || 'Reps';
    const column2Label = exercise.column2Label || 'kg';

    // Get prescribed values from first set
    const field1Value = firstSet?.reps || firstSet?.duration || firstSet?.distance || null;
    const field2Value = firstSet?.weight || null;

    return {
      prescribedExerciseId: prescribedId,
      performedExerciseId: null,  // null => same as prescribed
      exerciseType: exercise.exerciseType,
      trackableField1: {
        label: column1Label,
        prescribed: field1Value,
        completed: null,
      },
      trackableField2: {
        label: column2Label,
        prescribed: field2Value,
        completed: null,
      },
      restSec: parseNumber(firstSet?.rest, 'null') ?? exercise.restSec ?? null,
      completed: false,
      notes: exercise.notes || null,
      eachSide: exercise.eachSide || false,
      tempo: exercise.tempo || null,
    } as RoundExercisePayload;
  });

  return {
    id: section.id,
    name: section.name || '',
    type: 'timed',
    targetRounds: section.targetRounds || 0,
    actualRounds: null,       // Client fills this when completing
    totalDurationSec: null,   // Client fills this when completing
    exercises: timedExercises,
    notes: section.notes || null,
  } as WorkoutSectionPayload;
};



/**
 * Builds the complete workout payload from the workout schema
 *
 * @param workoutSchema - The workout schema from the builder
 * @param meta - The workout metadata
 * @param options - Optional configuration for payload building
 * @returns The complete workout payload ready for submission, or null if meta is missing
 */
export const buildWorkoutPayload = (
  workoutSchema: WorkoutSchema,
  meta: WorkoutMeta | null,
  options?: {
    parserType?: ParserType;
  }
): WorkoutProgramPayload | null => {
  if (!meta) {
    return null;
  }

  const parserType = options?.parserType || 'null';

  // Build items array for payload - flattening top-level structure
  const items: WorkoutItem[] = workoutSchema.items.map((item) => {
    if (item.itemType === 'section') {
      return {
        itemType: 'section' as const,
        data: buildSectionPayload(item.section, parserType),
      };
    } else {
      // Direct mapping for top-level exercises (no grouping)
      // Use exerciseId if available, otherwise fall back to instanceId
      const prescribedId = item.exercise.exerciseId && !item.exercise.exerciseId.startsWith('empty_')
        ? item.exercise.exerciseId
        : item.exercise.instanceId || `unknown_${Date.now()}`;

      const col1Label = item.exercise.column1Label || 'Reps';
      const col2Label = item.exercise.column2Label || 'kg';

      return {
        itemType: 'exercise' as const,
        data: {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: item.exercise.exerciseType as ExerciseType,
          sets: (item.exercise.sets || []).map((set) =>
            mapSetDataToPayload(item.exercise.exerciseType as ExerciseType, set, col1Label, col2Label, parserType)
          ),
          alternatives: item.exercise.alternatives || [],
          supersetId: item.exercise.supersetGroupId || null,  // Use null, not undefined
          notes: item.exercise.notes || null,
          eachSide: item.exercise.eachSide || false,
          tempo: item.exercise.tempo || null,
          column1Label: col1Label,
          column2Label: col2Label,
          optionalColumnType: item.exercise.optionalColumnType || null,
        } as RegularExercisePayload,
      };
    }
  });

  // Extract unique equipment from all exercises
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
  const equipment = Array.from(equipmentSet).sort();

  // Calculate total exercises across all items
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
      } else if (section.type === 'circuits') {
        section.exercises.forEach((group) => {
          totalExercises += group.exercises.length;
        });
      } else if (section.type === 'amrap' || section.type === 'timed') {
        totalExercises += section.exercises.length;
      }
    }
  });

  const payload: WorkoutProgramPayload = {
    id: (meta as any).id ?? null,
    name: meta.name,
    description: meta.description || '',
    type: meta.type || '',
    difficulty: meta.difficulty || '',
    equipment,
    totalExercises,
    items,
    ...DEFAULT_EXECUTION_FIELDS,
  };

  return payload;
};
