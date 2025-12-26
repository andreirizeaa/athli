import type { WorkoutSchema, ExerciseWithSuperset } from '../types/workout-builder.types';

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
    sections: currentSchema.sections.map((section) => {
      if (section.id === sectionId && section.exercises) {
        return {
          ...section,
          exercises: section.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
        };
      }
      return section;
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
    sections: currentSchema.sections.map((section) => {
      if (section.id === sectionId && section.exercises) {
        const exerciseIdSet = new Set(exerciseIds);
        return {
          ...section,
          exercises: section.exercises.filter(
            (exercise) => !exerciseIdSet.has(exercise.exerciseId)
          ),
        };
      }
      return section;
    }),
  };
};

/**
 * Handles adding a manual empty exercise to a section
 *
 * @param sectionId - The ID of the section to add the exercise to
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleAddExercise = (
  sectionId: string,
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
    supersetGroupId: null,
    instanceId: `empty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  return {
    ...currentSchema,
    sections: currentSchema.sections.map((section) => {
      if (section.id === sectionId && section.exercises) {
        return {
          ...section,
          exercises: [...section.exercises, emptyExercise],
        };
      }
      return section;
    }),
  };
};
