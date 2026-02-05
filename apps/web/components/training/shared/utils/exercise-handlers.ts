import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset } from '@/components/training/shared/types/workout-builder.types';

/**
 * Handles deleting a top-level exercise from the items array
 *
 * @param exerciseInstanceId - The instance ID of the exercise to delete
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleDeleteTopLevelExercise = (
  exerciseInstanceId: string,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.filter((item) => {
      if (item.itemType === 'exercise') {
        return item.exercise.instanceId !== exerciseInstanceId;
      }
      return true;
    }),
  };
};

/**
 * Handles deleting an exercise from a section (called from overview panel)
 *
 * @param sectionId - The ID of the section containing the exercise
 * @param exerciseId - The ID of the exercise to delete
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleDeleteExerciseFromOverview = (
  sectionId: string,
  exerciseId: string,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        return {
          ...item,
          section: {
            ...item.section,
            exercises: item.section.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
          },
        };
      }
      return item;
    }),
  };
};

/**
 * Handles deleting a superset group from a section (called from overview panel)
 *
 * @param sectionId - The ID of the section containing the superset
 * @param exerciseIds - Array of exercise IDs in the superset group
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleDeleteSupersetFromOverview = (
  sectionId: string,
  exerciseIds: string[],
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exerciseIdSet = new Set(exerciseIds);
        return {
          ...item,
          section: {
            ...item.section,
            exercises: item.section.exercises.filter(
              (exercise) => !exerciseIdSet.has(exercise.exerciseId)
            ),
          },
        };
      }
      return item;
    }),
  };
};

/**
 * Handles adding a manual empty exercise at the top level
 *
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleAddTopLevelExercise = (
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const emptyExercise: ExerciseWithSuperset = {
    exerciseId: `empty_${Date.now()}`,
    name: '',
    imageUrl: '',
    videoUrl: '',
    equipments: [],
    bodyParts: [],
    exerciseType: 'weight_reps',
    targetMuscles: [],
    secondaryMuscles: [],
    keywords: [],
    overview: '',
    instructions: [],
    exerciseTips: [],
    variations: [],
    relatedExerciseIds: [],
    source: 'musclewiki',
    supersetGroupId: null,
    instanceId: `empty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  const newItem: WorkoutSchemaItem = {
    itemType: 'exercise',
    exercise: emptyExercise,
  };

  return {
    ...currentSchema,
    items: [...currentSchema.items, newItem],
  };
};

/**
 * Handles adding a manual empty exercise to a section
 *
 * @param sectionId - The ID of the section to add the exercise to
 * @param currentSchema - The current workout schema
 * @param sectionType - Optional section type to determine default column labels
 * @returns Updated workout schema
 */
export const handleAddExercise = (
  sectionId: string,
  currentSchema: WorkoutSchema,
  sectionType?: string
): WorkoutSchema => {
  const isIntervalSection = sectionType === 'tabata' || sectionType === 'hiit' || sectionType === 'emom' || sectionType === 'circuits';

  const emptyExercise: ExerciseWithSuperset = {
    exerciseId: `empty_${Date.now()}`,
    name: '',
    imageUrl: '',
    videoUrl: '',
    equipments: [],
    bodyParts: [],
    exerciseType: 'weight_reps',
    targetMuscles: [],
    secondaryMuscles: [],
    keywords: [],
    overview: '',
    instructions: [],
    exerciseTips: [],
    variations: [],
    relatedExerciseIds: [],
    source: 'musclewiki',
    supersetGroupId: null,
    instanceId: `empty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    column1Label: 'Reps',
    column2Label: isIntervalSection ? 'Optional' : undefined,
  };

  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId) {
        return {
          ...item,
          section: {
            ...item.section,
            exercises: [...(item.section.exercises || []), emptyExercise],
          },
        };
      }
      return item;
    }),
  };
};
