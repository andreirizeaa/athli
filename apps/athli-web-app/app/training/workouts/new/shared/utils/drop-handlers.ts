import type { Exercise } from '@/api/exercise/exercise-search';
import type { WorkoutSchema, ExerciseWithSuperset } from '../types/workout-builder.types';

/**
 * Handles dropping an exercise at the end of a section (fallback for when no specific slot is active)
 *
 * @param sectionId - The ID of the section to drop into
 * @param draggedExercise - The exercise being dragged
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleDrop = (
  sectionId: string,
  draggedExercise: Exercise,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    sections: currentSchema.sections.map((section) => {
      if (section.id === sectionId) {
        const exercises = section.exercises || [];
        const exerciseWithSuperset: ExerciseWithSuperset = {
          ...draggedExercise,
          supersetGroupId: null,
          instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        };
        return {
          ...section,
          exercises: [...exercises, exerciseWithSuperset],
        };
      }
      return section;
    }),
  };
};

/**
 * Handles dropping an exercise at a specific slot position
 *
 * @param sectionId - The ID of the section to drop into
 * @param slotIndex - The index where the exercise should be inserted
 * @param draggedExercise - The exercise being dragged
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleSlotDrop = (
  sectionId: string,
  slotIndex: number,
  draggedExercise: Exercise,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    sections: currentSchema.sections.map((section) => {
      if (section.id !== sectionId) return section;

      const exercises = section.exercises || [];
      const exerciseWithSuperset: ExerciseWithSuperset = {
        ...draggedExercise,
        supersetGroupId: null,
        instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };

      const updatedExercises = [...exercises];
      const safeIndex = Math.min(Math.max(slotIndex, 0), updatedExercises.length);
      updatedExercises.splice(safeIndex, 0, exerciseWithSuperset);

      return {
        ...section,
        exercises: updatedExercises,
      };
    }),
  };
};
