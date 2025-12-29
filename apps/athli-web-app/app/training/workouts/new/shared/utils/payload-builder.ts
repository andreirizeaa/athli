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
} from '../../workout-schema';
import type { SetData } from '../../components/exercise-card';
import type {
  ExerciseWithSuperset,
  WorkoutSchema,
  WorkoutSchemaItem,
  WorkoutSection,
  WorkoutMeta,
} from '../types/workout-builder.types';

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
 * Groups consecutive top-level exercise items into superset groups
 * Used for building payload from items array
 */
const groupTopLevelExerciseItems = (
  items: WorkoutSchemaItem[]
): Array<{ type: 'exerciseGroup'; exercises: ExerciseWithSuperset[] } | { type: 'section'; section: WorkoutSection }> => {
  const result: Array<{ type: 'exerciseGroup'; exercises: ExerciseWithSuperset[] } | { type: 'section'; section: WorkoutSection }> = [];
  let currentExerciseGroup: ExerciseWithSuperset[] = [];
  let currentGroupId: string | null = null;

  const flushCurrentGroup = () => {
    if (currentExerciseGroup.length > 0) {
      result.push({ type: 'exerciseGroup', exercises: currentExerciseGroup });
      currentExerciseGroup = [];
      currentGroupId = null;
    }
  };

  items.forEach((item) => {
    if (item.itemType === 'section') {
      flushCurrentGroup();
      result.push({ type: 'section', section: item.section });
    } else if (item.itemType === 'exercise') {
      const exercise = item.exercise;
      if (exercise.supersetGroupId) {
        if (exercise.supersetGroupId === currentGroupId) {
          currentExerciseGroup.push(exercise);
        } else {
          flushCurrentGroup();
          currentExerciseGroup = [exercise];
          currentGroupId = exercise.supersetGroupId;
        }
      } else {
        flushCurrentGroup();
        result.push({ type: 'exerciseGroup', exercises: [exercise] });
      }
    }
  });

  flushCurrentGroup();
  return result;
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
    restSec: set.rest ? (parseNumber(set.rest, 'null') ?? null) : null,
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
        const stage: { weight?: number; reps?: number } = {};
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
        stages: stages.map((s) => ({ reps: s.reps })),
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
      const mapped = group.map<RegularExercisePayload>((exercise) => ({
        id: exercise.exerciseId,
        exerciseType: exercise.exerciseType as ExerciseType,
        sets: (exercise.sets || []).map((set) =>
          mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, parserType)
        ),
        alternatives: exercise.alternatives || [],
      }));

      const isSuperset = mapped.length > 1;

      return {
        isSuperset,
        exercises: mapped,
      };
    });

    return {
      id: section.id,
      type: 'regular',
      exercises,
    };
  }

  if (section.type === 'amrap') {
    const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => ({
      id: exercise.exerciseId ?? exercise.id,
      exerciseType: exercise.exerciseType,
      weight: exercise.weight ?? null,
      reps: exercise.reps ?? null,
      distance: exercise.distance ?? null,
      durationSec: exercise.durationSec ?? null,
      restSec: exercise.restSec ?? null,
    }));

    return {
      id: section.id,
      type: 'amrap',
      durationSec: section.roundDurationSec || 0,
      exercises,
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

        return {
          id: exercise.exerciseId,
          exerciseType: exercise.exerciseType as ExerciseType,
          set: mapSetDataToPayload(exercise.exerciseType as ExerciseType, firstSet, parserType),
          alternatives: exercise.alternatives || [],
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
      type: 'circuits',
      targetRounds: section.targetRounds || 0,
      exercises,
    };
  }

  if (section.type === 'auxiliary') {
    const groups = groupExercisesBySupersetForPayload(section.exercises || []);

    const exercises: ExerciseGroupPayload[] = groups.map((group) => {
      const mapped = group.map<RegularExercisePayload>((exercise) => ({
        id: exercise.exerciseId,
        exerciseType: exercise.exerciseType as ExerciseType,
        sets: (exercise.sets || []).map((set) =>
          mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, parserType)
        ),
        alternatives: exercise.alternatives || [],
      }));

      const isSuperset = mapped.length > 1;

      return {
        isSuperset,
        exercises: mapped,
      };
    });

    return {
      id: section.id,
      type: 'auxiliary',
      category: section.category || 'warmup',
      exercises,
    };
  }

  // Timed section
  const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => ({
    id: exercise.exerciseId ?? exercise.id,
    exerciseType: exercise.exerciseType,
    weight: exercise.weight ?? null,
    reps: exercise.reps ?? null,
    distance: exercise.distance ?? null,
    durationSec: exercise.durationSec ?? null,
    restSec: exercise.restSec ?? null,
  }));

  return {
    id: section.id,
    type: 'timed',
    targetRounds: section.targetRounds || 0,
    exercises,
  };
};

/**
 * Builds an exercise group payload from top-level exercises
 */
const buildExerciseGroupPayload = (
  exercises: ExerciseWithSuperset[],
  parserType: ParserType
): ExerciseGroupPayload => {
  const mapped = exercises.map<RegularExercisePayload>((exercise) => ({
    id: exercise.exerciseId,
    exerciseType: exercise.exerciseType as ExerciseType,
    sets: (exercise.sets || []).map((set) =>
      mapSetDataToPayload(exercise.exerciseType as ExerciseType, set, parserType)
    ),
    alternatives: exercise.alternatives || [],
  }));

  return {
    isSuperset: mapped.length > 1,
    exercises: mapped,
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

  // Group items into exercise groups and sections
  const groupedItems = groupTopLevelExerciseItems(workoutSchema.items);

  // Build items array for payload
  const items: WorkoutItem[] = groupedItems.map((group) => {
    if (group.type === 'section') {
      return {
        itemType: 'section' as const,
        data: buildSectionPayload(group.section, parserType),
      };
    } else {
      return {
        itemType: 'exercise' as const,
        data: buildExerciseGroupPayload(group.exercises, parserType),
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
      totalExercises += item.data.exercises.length;
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

  return {
    title: meta.title,
    description: meta.description,
    type: meta.type,
    difficulty: meta.difficulty,
    equipment,
    totalExercises,
    items,
  };
};
