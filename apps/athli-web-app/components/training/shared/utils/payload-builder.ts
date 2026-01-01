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
 * Maps set data from the builder UI format to the payload format
 *
 * @param exerciseType - The type of exercise
 * @param set - The set data from the builder
 * @param parserType - Whether to use 'null' or 'undefined' for empty values (standard uses null, AI uses both)
 * @returns The set payload
 */
export const mapSetDataToPayload = (
  exerciseType: ExerciseType,
  set: SetData,
  parserType: ParserType = 'null'
): SetPayload => {
  const base = {
    setNumber: set.setNumber,
    type: set.type || 'normal',
    restSec: set.rest ? (parseNumber(set.rest, 'null') ?? null) : null,
    completed: false,
  };

  // distance_duration is always non-dropset, with either distance or durationSec
  if (exerciseType === 'distance_duration') {
    return {
      ...base,
      exerciseType: 'distance_duration',
      distance: set.distance ? parseNumber(set.distance, parserType) ?? undefined : undefined,
      durationSec: set.duration ? parseNumber(set.duration, parserType) ?? undefined : undefined,
    };
  }

  // Dropset handling – presence of dropset implies dropset semantics
  if (set.type === 'dropset') {
    const repStages = parseStages(set.reps);
    const weightStages = exerciseType === 'weight_reps' ? parseStages(set.weight) : [];

    const stages = Array.from(
      { length: Math.max(repStages.length, weightStages.length) },
      (_v, index) => {
        const stage: { weight?: number; reps?: number; completed: boolean } = { completed: false };
        if (repStages[index] != null) stage.reps = repStages[index];
        if (weightStages[index] != null) stage.weight = weightStages[index];
        return stage;
      }
    ).filter((s) => s.reps != null || s.weight != null);

    if (exerciseType === 'weight_reps') {
      return {
        ...base,
        exerciseType: 'weight_reps',
        weight: parseNumber(set.weight, 'null') ?? 0,
        reps: parseNumber(set.reps, 'null') ?? 0,
        dropset: { stages },
      };
    }

    // reps-only dropset
    return {
      ...base,
      exerciseType: 'reps',
      reps: parseNumber(set.reps, 'null') ?? 0,
      dropset: {
        stages: stages.map((s) => ({ reps: s.reps, completed: false })),
      },
    };
  }

  // Non-dropset sets
  if (exerciseType === 'weight_reps') {
    return {
      ...base,
      exerciseType: 'weight_reps',
      weight: parseNumber(set.weight, 'null') ?? 0,
      reps: parseNumber(set.reps, 'null') ?? 0,
    };
  }

  // reps-only non-dropset
  return {
    ...base,
    exerciseType: 'reps',
    reps: parseNumber(set.reps, 'null') ?? 0,
  };
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
        const exerciseId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
          ? exercise.exerciseId
          : (exercise as any).instanceId || `unknown_${Date.now()}`;

        if (!exercise.exerciseId || exercise.exerciseId.startsWith('empty_')) {
          console.warn('Exercise missing exerciseId, using fallback:', exerciseId);
        }

        return {
          id: exerciseId,
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) =>
            mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, parserType)
          ),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || undefined,
          notes: exercise.notes || '',
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
      notes: section.notes || '',
    };
  }

  if (section.type === 'amrap') {
    const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => {
      const firstSet = exercise.sets?.[0];
      // Builder uses 'rest' (string) in sets, payload uses 'restSec' (number)
      // Builder uses 'duration' (string) in sets, payload uses 'durationSec' (number)

      // Use exerciseId if available and not empty_, otherwise fall back to instanceId
      const exerciseId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
        ? exercise.exerciseId
        : (exercise.instanceId || exercise.id || `unknown_${Date.now()}`);

      return {
        id: exerciseId,
        exerciseType: exercise.exerciseType,
        type: firstSet?.type || 'normal',
        weight: parseNumber(firstSet?.weight, 'null') ?? exercise.weight ?? null,
        reps: parseNumber(firstSet?.reps, 'null') ?? exercise.reps ?? null,
        distance: parseNumber(firstSet?.distance, 'null') ?? exercise.distance ?? null,
        durationSec: parseNumber(firstSet?.duration, 'null') ?? exercise.durationSec ?? null,
        restSec: parseNumber(firstSet?.rest, 'null') ?? exercise.restSec ?? null,
        completed: false,
        notes: exercise.notes || '',
      };
    });

    return {
      id: section.id,
      name: section.name || '',
      type: 'amrap',
      durationSec: section.roundDurationSec || 0,
      exercises,
      notes: section.notes || '',
    };
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
        const exerciseId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
          ? exercise.exerciseId
          : (exercise as any).instanceId || `unknown_${Date.now()}`;

        return {
          id: exerciseId,
          exerciseType: exercise.exerciseType as ExerciseType,
          set: mapSetDataToPayload(exercise.exerciseType as ExerciseType, firstSet, parserType),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || undefined,
          notes: exercise.notes || '',
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
      exercises,
      notes: section.notes || '',
    };
  }

  if (section.type === 'auxiliary') {
    const groups = groupExercisesBySupersetForPayload(section.exercises || []);

    const exercises: ExerciseGroupPayload[] = groups.map((group) => {
      const mapped = group.map<RegularExercisePayload>((exercise) => {
        // Use exerciseId if available, otherwise fall back to instanceId
        const exerciseId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
          ? exercise.exerciseId
          : (exercise as any).instanceId || `unknown_${Date.now()}`;

        return {
          id: exerciseId,
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) =>
            mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, parserType)
          ),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || undefined,
          notes: exercise.notes || '',
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
      notes: section.notes || '',
    };
  }

  // Timed section
  const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => {
    const firstSet = exercise.sets?.[0];

    // Use exerciseId if available and not empty_, otherwise fall back to instanceId
    const exerciseId = exercise.exerciseId && !exercise.exerciseId.startsWith('empty_')
      ? exercise.exerciseId
      : (exercise.instanceId || exercise.id || `unknown_${Date.now()}`);

    return {
      id: exerciseId,
      exerciseType: exercise.exerciseType,
      type: firstSet?.type || 'normal',
      weight: parseNumber(firstSet?.weight, 'null') ?? exercise.weight ?? null,
      reps: parseNumber(firstSet?.reps, 'null') ?? exercise.reps ?? null,
      distance: parseNumber(firstSet?.distance, 'null') ?? exercise.distance ?? null,
      durationSec: parseNumber(firstSet?.duration, 'null') ?? exercise.durationSec ?? null,
      restSec: parseNumber(firstSet?.rest, 'null') ?? exercise.restSec ?? null,
      completed: false,
      notes: exercise.notes || '',
    };
  });

  return {
    id: section.id,
    name: section.name || '',
    type: 'timed',
    targetRounds: section.targetRounds || 0,
    exercises,
    notes: section.notes || '',
  };
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
      const exerciseId = item.exercise.exerciseId && !item.exercise.exerciseId.startsWith('empty_')
        ? item.exercise.exerciseId
        : item.exercise.instanceId || `unknown_${Date.now()}`;

      return {
        itemType: 'exercise' as const,
        data: {
          id: exerciseId,
          exerciseType: item.exercise.exerciseType as ExerciseType,
          sets: (item.exercise.sets || []).map((set) =>
            mapSetDataToPayload(item.exercise.exerciseType as ExerciseType, set, parserType)
          ),
          alternatives: item.exercise.alternatives || [],
          supersetId: item.exercise.supersetGroupId || undefined,
        },
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
    title: meta.title,
    description: meta.description,
    type: meta.type,
    difficulty: meta.difficulty,
    equipment,
    totalExercises,
    items,
    ...DEFAULT_EXECUTION_FIELDS,
  };

  return payload;
};
