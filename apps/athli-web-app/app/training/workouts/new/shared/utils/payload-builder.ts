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
} from '../../workout-schema';
import type { SetData } from '../../components/exercise-card';
import type {
  ExerciseWithSuperset,
  WorkoutSchema,
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

  const sections: WorkoutSectionPayload[] = workoutSchema.sections.map((section) => {
    if (section.type === 'regular') {
      const groups = groupExercisesBySupersetForPayload(section.exercises || []);

      const exercises: ExerciseGroupPayload[] = groups.map((group) => {
        const mapped = group.map<RegularExercisePayload>((exercise) => ({
          id: exercise.exerciseId,
          name: exercise.name,
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
        name: exercise.name,
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
            name: exercise.name,
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
          name: exercise.name,
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

    const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => ({
      id: exercise.exerciseId ?? exercise.id,
      name: exercise.name,
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
  });

  // Extract unique equipment from all exercises
  const equipmentSet = new Set<string>();
  workoutSchema.sections.forEach((section) => {
    section.exercises?.forEach((exercise) => {
      exercise.equipments?.forEach((equipment) => {
        if (equipment && equipment.trim() !== '') {
          equipmentSet.add(equipment);
        }
      });
    });
  });
  const equipment = Array.from(equipmentSet).sort();

  return {
    title: meta.title,
    description: meta.description,
    type: meta.type,
    difficulty: meta.difficulty,
    equipment,
    sections,
  };
};
