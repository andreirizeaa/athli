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
  // Parse values once for reuse in prescribed/completed pairs
  const weightValue = parseNumber(set.weight, 'null') ?? 0;
  const repsValue = parseNumber(set.reps, 'null') ?? 0;
  const distanceValue = parseNumber(set.distance, 'null');
  const durationValue = parseNumber(set.duration, 'null');

  const base = {
    setNumber: set.setNumber,
    type: set.type || 'normal',
    restSec: set.rest ? (parseNumber(set.rest, 'null') ?? null) : null,
    completed: false,
    skipped: false,
    optional: {
      prescribed: set.optional?.prescribed || null,
      completed: set.optional?.completed || null
    },
  };

  // distance_duration is always non-dropset, with either distance or durationSec
  if (exerciseType === 'distance_duration') {
    return {
      ...base,
      exerciseType: 'distance_duration',
      distance: {
        prescribed: distanceValue,
        completed: distanceValue,  // Pre-filled with prescribed
      },
      durationSec: {
        prescribed: durationValue,
        completed: durationValue,  // Pre-filled with prescribed
      },
      dropset: null,  // Always present, null for non-dropset
    } as SetPayload;
  }

  // Dropset handling – presence of dropset implies dropset semantics
  if (set.type === 'dropset') {
    const repStages = parseStages(set.reps);
    const weightStages = exerciseType === 'weight_reps' ? parseStages(set.weight) : [];

    const stages = Array.from(
      { length: Math.max(repStages.length, weightStages.length) },
      (_v, index) => {
        const repPrescribed = repStages[index] ?? null;
        const weightPrescribed = weightStages[index] ?? null;
        return {
          weight: { prescribed: weightPrescribed, completed: weightPrescribed },
          reps: { prescribed: repPrescribed, completed: repPrescribed },
          completed: false,
        };
      }
    ).filter((s) => s.reps.prescribed != null || s.weight.prescribed != null);

    // Left/Right Dropset handling
    let leftDropsetStages: any[] | undefined;
    let rightDropsetStages: any[] | undefined;

    if (set.leftReps || set.rightReps) {
      const leftRepStages = parseStages(set.leftReps);
      const rightRepStages = parseStages(set.rightReps);

      const leftWeightStages = parseStages(set.leftWeight);
      const rightWeightStages = parseStages(set.rightWeight);

      if (leftRepStages.length > 0) {
        leftDropsetStages = leftRepStages.map((r, idx) => {
          const w = leftWeightStages[idx] ?? weightValue;
          return {
            reps: { prescribed: r, completed: r },
            weight: { prescribed: w, completed: w },
            completed: false
          };
        });
      }
      if (rightRepStages.length > 0) {
        rightDropsetStages = rightRepStages.map((r, idx) => {
          const w = rightWeightStages[idx] ?? weightValue;
          return {
            reps: { prescribed: r, completed: r },
            weight: { prescribed: w, completed: w },
            completed: false
          };
        });
      }
    }

    if (exerciseType === 'weight_reps') {
      return {
        ...base,
        type: 'dropset' as const,
        exerciseType: 'weight_reps',
        weight: { prescribed: weightValue, completed: weightValue },
        reps: { prescribed: repsValue, completed: repsValue },
        leftReps: set.leftReps ? { prescribed: parseNumber(set.leftReps, 'null') ?? 0, completed: parseNumber(set.leftReps, 'null') ?? 0 } : undefined,
        rightReps: set.rightReps ? { prescribed: parseNumber(set.rightReps, 'null') ?? 0, completed: parseNumber(set.rightReps, 'null') ?? 0 } : undefined,
        dropset: { stages },
        leftDropset: leftDropsetStages ? { stages: leftDropsetStages } : undefined,
        rightDropset: rightDropsetStages ? { stages: rightDropsetStages } : undefined,
      } as SetPayload;
    }

    // reps-only dropset
    return {
      ...base,
      type: 'dropset' as const,
      exerciseType: 'reps',
      reps: { prescribed: repsValue, completed: repsValue },
      dropset: {
        stages: stages.map((s) => ({
          reps: s.reps,
          weight: s.weight,
          completed: false,
        })),
      },
      leftDropset: leftDropsetStages ? { stages: leftDropsetStages } : undefined,
      rightDropset: rightDropsetStages ? { stages: rightDropsetStages } : undefined,
    } as SetPayload;
  }

  // Non-dropset sets
  if (exerciseType === 'weight_reps') {
    return {
      ...base,
      exerciseType: 'weight_reps',
      weight: { prescribed: weightValue, completed: weightValue },
      reps: { prescribed: repsValue, completed: repsValue },
      leftReps: set.leftReps ? { prescribed: parseNumber(set.leftReps, 'null') ?? 0, completed: parseNumber(set.leftReps, 'null') ?? 0 } : undefined,
      rightReps: set.rightReps ? { prescribed: parseNumber(set.rightReps, 'null') ?? 0, completed: parseNumber(set.rightReps, 'null') ?? 0 } : undefined,
      dropset: null,  // Always present, null for non-dropset
    } as SetPayload;
  }

  // reps-only non-dropset
  return {
    ...base,
    exerciseType: 'reps',
    reps: { prescribed: repsValue, completed: repsValue },
    leftReps: set.leftReps ? { prescribed: parseNumber(set.leftReps, 'null') ?? 0, completed: parseNumber(set.leftReps, 'null') ?? 0 } : undefined,
    rightReps: set.rightReps ? { prescribed: parseNumber(set.rightReps, 'null') ?? 0, completed: parseNumber(set.rightReps, 'null') ?? 0 } : undefined,
    dropset: null,  // Always present, null for non-dropset
  } as SetPayload;
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

        return {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) =>
            mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, parserType)
          ),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || null,  // Use null, not undefined
          notes: exercise.notes || null,  // Use null, not empty string
          eachSide: exercise.eachSide || false,
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

      // Parse values for MetricNumber pattern with pre-fill
      const weightValue = parseNumber(firstSet?.weight, 'null') ?? exercise.weight ?? null;
      const repsValue = parseNumber(firstSet?.reps, 'null') ?? exercise.reps ?? null;
      const distanceValue = parseNumber(firstSet?.distance, 'null') ?? exercise.distance ?? null;
      const durationValue = parseNumber(firstSet?.duration, 'null') ?? exercise.durationSec ?? null;

      return {
        prescribedExerciseId: prescribedId,
        performedExerciseId: null,  // null => same as prescribed
        exerciseType: exercise.exerciseType,
        type: firstSet?.type || null,
        weight: { prescribed: weightValue ?? 0, completed: weightValue ?? 0 },
        reps: { prescribed: repsValue ?? 0, completed: repsValue ?? 0 },
        distance: { prescribed: distanceValue, completed: distanceValue },
        durationSec: { prescribed: durationValue, completed: durationValue },
        restSec: parseNumber(firstSet?.rest, 'null') ?? exercise.restSec ?? null,
        completed: false,
        notes: exercise.notes || null,
        eachSide: exercise.eachSide || false,
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

        return {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: exercise.exerciseType as ExerciseType,
          set: mapSetDataToPayload(exercise.exerciseType as ExerciseType, firstSet, parserType),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || null,  // Use null, not undefined
          notes: exercise.notes || null,
          eachSide: exercise.eachSide || false,
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

        return {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) =>
            mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, parserType)
          ),
          alternatives: exercise.alternatives || [],
          supersetId: exercise.supersetGroupId || null,  // Use null, not undefined
          notes: exercise.notes || null,
          eachSide: exercise.eachSide || false,
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

    // Parse values for MetricNumber pattern with pre-fill
    const weightValue = parseNumber(firstSet?.weight, 'null') ?? exercise.weight ?? null;
    const repsValue = parseNumber(firstSet?.reps, 'null') ?? exercise.reps ?? null;
    const distanceValue = parseNumber(firstSet?.distance, 'null') ?? exercise.distance ?? null;
    const durationValue = parseNumber(firstSet?.duration, 'null') ?? exercise.durationSec ?? null;

    return {
      prescribedExerciseId: prescribedId,
      performedExerciseId: null,  // null => same as prescribed
      exerciseType: exercise.exerciseType,
      type: firstSet?.type || null,
      weight: { prescribed: weightValue ?? 0, completed: weightValue ?? 0 },
      reps: { prescribed: repsValue ?? 0, completed: repsValue ?? 0 },
      distance: { prescribed: distanceValue, completed: distanceValue },
      durationSec: { prescribed: durationValue, completed: durationValue },
      restSec: parseNumber(firstSet?.rest, 'null') ?? exercise.restSec ?? null,
      completed: false,
      notes: exercise.notes || null,
      eachSide: exercise.eachSide || false,
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

      return {
        itemType: 'exercise' as const,
        data: {
          prescribedExerciseId: prescribedId,
          performedExerciseId: null,  // null => same as prescribed
          exerciseType: item.exercise.exerciseType as ExerciseType,
          sets: (item.exercise.sets || []).map((set) =>
            mapSetDataToPayload(item.exercise.exerciseType as ExerciseType, set, parserType)
          ),
          alternatives: item.exercise.alternatives || [],
          supersetId: item.exercise.supersetGroupId || null,  // Use null, not undefined
          notes: item.exercise.notes || null,
          eachSide: item.exercise.eachSide || false,
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
