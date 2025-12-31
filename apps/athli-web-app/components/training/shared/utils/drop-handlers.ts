import type { Exercise } from '@/api/exercise/exercise-search';
import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset, WorkoutSection } from '@/components/training/shared/types/workout-builder.types';

/**
 * Handles dropping an exercise at the end of all items (top-level)
 *
 * @param draggedExercise - The exercise being dragged
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleTopLevelDrop = (
  draggedExercise: Exercise,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const exerciseWithSuperset: ExerciseWithSuperset = {
    ...draggedExercise,
    supersetGroupId: null,
    instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  const newItem: WorkoutSchemaItem = {
    itemType: 'exercise',
    exercise: exerciseWithSuperset,
  };

  return {
    ...currentSchema,
    items: [...currentSchema.items, newItem],
  };
};

/**
 * Handles dropping an exercise at a specific slot in the items array (top-level)
 *
 * @param slotIndex - The index where the exercise should be inserted
 * @param draggedExercise - The exercise being dragged
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleTopLevelSlotDrop = (
  slotIndex: number,
  draggedExercise: Exercise,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const exerciseWithSuperset: ExerciseWithSuperset = {
    ...draggedExercise,
    supersetGroupId: null,
    instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  const newItem: WorkoutSchemaItem = {
    itemType: 'exercise',
    exercise: exerciseWithSuperset,
  };

  const updatedItems = [...currentSchema.items];
  const safeIndex = Math.min(Math.max(slotIndex, 0), updatedItems.length);
  updatedItems.splice(safeIndex, 0, newItem);

  return {
    ...currentSchema,
    items: updatedItems,
  };
};

/**
 * Handles dropping an exercise at the end of a section
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
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId) {
        const exercises = item.section.exercises || [];
        const exerciseWithSuperset: ExerciseWithSuperset = {
          ...draggedExercise,
          supersetGroupId: null,
          instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        };
        return {
          ...item,
          section: {
            ...item.section,
            exercises: [...exercises, exerciseWithSuperset],
          },
        };
      }
      return item;
    }),
  };
};

/**
 * Handles dropping an exercise at a specific slot position within a section
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
    items: currentSchema.items.map((item) => {
      if (item.itemType !== 'section' || item.section.id !== sectionId) return item;

      const exercises = item.section.exercises || [];
      const exerciseWithSuperset: ExerciseWithSuperset = {
        ...draggedExercise,
        supersetGroupId: null,
        instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };

      const updatedExercises = [...exercises];
      const safeIndex = Math.min(Math.max(slotIndex, 0), updatedExercises.length);
      updatedExercises.splice(safeIndex, 0, exerciseWithSuperset);

      return {
        ...item,
        section: {
          ...item.section,
          exercises: updatedExercises,
        },
      };
    }),
  };
};
