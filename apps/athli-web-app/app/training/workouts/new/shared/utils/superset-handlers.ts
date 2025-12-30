import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset, WorkoutSection } from '../types/workout-builder.types';

/**
 * Groups consecutive exercises by their superset ID for display purposes
 *
 * @param exercises - Array of exercises
 * @returns Array of exercise groups (supersets and individual exercises)
 */
export const groupExercisesBySuperset = (
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
 * Links two consecutive top-level exercises into a superset
 *
 * @param itemIndex - The index of the first exercise item in the items array
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleTopLevelSupersetLink = (
  itemIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const items = [...currentSchema.items];
  const currentItem = items[itemIndex];
  const nextItem = items[itemIndex + 1];

  // Both must be exercise items
  if (
    !currentItem ||
    !nextItem ||
    currentItem.itemType !== 'exercise' ||
    nextItem.itemType !== 'exercise'
  ) {
    return currentSchema;
  }

  // Determine the contiguous block we are (or will be) linking
  let start = itemIndex;
  let end = itemIndex + 1;

  // Extend upwards while part of any existing superset chain (and is exercise)
  while (
    start > 0 &&
    items[start - 1].itemType === 'exercise' &&
    (items[start - 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId
  ) {
    start -= 1;
  }

  // Extend downwards while part of any existing superset chain (and is exercise)
  while (
    end < items.length - 1 &&
    items[end + 1].itemType === 'exercise' &&
    (items[end + 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId
  ) {
    end += 1;
  }

  // Use an existing group id if present, otherwise create a new one
  const existingGroupId =
    currentItem.exercise.supersetGroupId ||
    nextItem.exercise.supersetGroupId ||
    (items[start] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId ||
    (items[end] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId;

  const supersetGroupId =
    existingGroupId || `superset_toplevel_${itemIndex}_${Date.now()}`;

  // Assign the same supersetGroupId to the entire contiguous block
  for (let i = start; i <= end; i += 1) {
    const item = items[i];
    if (item.itemType === 'exercise') {
      items[i] = {
        ...item,
        exercise: {
          ...item.exercise,
          supersetGroupId,
        },
      };
    }
  }

  return {
    ...currentSchema,
    items,
  };
};

/**
 * Unlinks two consecutive top-level exercises in a superset
 *
 * @param itemIndex - The index of the first exercise item in the link to break
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleTopLevelSupersetUnlink = (
  itemIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const items = [...currentSchema.items];
  const currentItem = items[itemIndex];
  const nextItem = items[itemIndex + 1];

  // Both must be exercise items with same superset group
  if (
    !currentItem ||
    !nextItem ||
    currentItem.itemType !== 'exercise' ||
    nextItem.itemType !== 'exercise'
  ) {
    return currentSchema;
  }

  const currentExercise = currentItem.exercise;
  const nextExercise = nextItem.exercise;

  if (
    !currentExercise.supersetGroupId ||
    currentExercise.supersetGroupId !== nextExercise.supersetGroupId
  ) {
    return currentSchema;
  }

  const groupId = currentExercise.supersetGroupId;

  // Find contiguous segment ABOVE including itemIndex that belongs to this group
  let upperStart = itemIndex;
  while (
    upperStart > 0 &&
    items[upperStart - 1].itemType === 'exercise' &&
    (items[upperStart - 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId === groupId
  ) {
    upperStart -= 1;
  }

  // Find contiguous segment BELOW starting at itemIndex + 1 that belongs to this group
  let lowerStart = itemIndex + 1;
  let lowerEnd = lowerStart;
  while (
    lowerEnd < items.length - 1 &&
    items[lowerEnd + 1].itemType === 'exercise' &&
    (items[lowerEnd + 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId === groupId
  ) {
    lowerEnd += 1;
  }

  // Lower segment becomes either a new superset group (if at least 2 exercises)
  // or is fully unlinked if it's only a single exercise.
  const lowerLength = lowerEnd - lowerStart + 1;
  const newGroupId =
    lowerLength >= 2 ? `superset_toplevel_${lowerStart}_${Date.now()}` : null;

  for (let i = lowerStart; i <= lowerEnd; i += 1) {
    const item = items[i];
    if (item.itemType === 'exercise') {
      items[i] = {
        ...item,
        exercise: {
          ...item.exercise,
          supersetGroupId: newGroupId,
        },
      };
    }
  }

  return {
    ...currentSchema,
    items,
  };
};

/**
 * Links two consecutive exercises within a section into a superset
 *
 * @param sectionId - The ID of the section containing the exercises
 * @param exerciseIndex - The index of the first exercise in the superset
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleSupersetLink = (
  sectionId: string,
  exerciseIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exercises = [...item.section.exercises];
        const currentExercise = exercises[exerciseIndex];
        const nextExercise = exercises[exerciseIndex + 1];

        if (currentExercise && nextExercise) {
          // Determine the contiguous block we are (or will be) linking
          let start = exerciseIndex;
          let end = exerciseIndex + 1;

          // Extend upwards while part of any existing superset chain
          while (start > 0 && exercises[start - 1].supersetGroupId) {
            start -= 1;
          }

          // Extend downwards while part of any existing superset chain
          while (end < exercises.length - 1 && exercises[end + 1].supersetGroupId) {
            end += 1;
          }

          // Use an existing group id if present, otherwise create a new one
          const existingGroupId =
            currentExercise.supersetGroupId ||
            nextExercise.supersetGroupId ||
            exercises[start].supersetGroupId ||
            exercises[end].supersetGroupId;

          const supersetGroupId =
            existingGroupId || `superset_${sectionId}_${exerciseIndex}_${Date.now()}`;

          // Assign the same supersetGroupId to the entire contiguous block
          for (let i = start; i <= end; i += 1) {
            exercises[i] = {
              ...exercises[i],
              supersetGroupId,
            };
          }
        }

        return {
          ...item,
          section: {
            ...item.section,
            exercises,
          },
        };
      }
      return item;
    }),
  };
};

/**
 * Unlinks two consecutive exercises within a section in a superset
 *
 * @param sectionId - The ID of the section containing the exercises
 * @param exerciseIndex - The index of the first exercise in the link to break
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleSupersetUnlink = (
  sectionId: string,
  exerciseIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exercises = [...item.section.exercises];
        const currentExercise = exercises[exerciseIndex];
        const nextExercise = exercises[exerciseIndex + 1];

        if (
          currentExercise &&
          nextExercise &&
          currentExercise.supersetGroupId &&
          currentExercise.supersetGroupId === nextExercise.supersetGroupId
        ) {
          const groupId = currentExercise.supersetGroupId;

          // Find contiguous segment ABOVE including exerciseIndex that belongs to this group
          let upperStart = exerciseIndex;
          while (upperStart > 0 && exercises[upperStart - 1].supersetGroupId === groupId) {
            upperStart -= 1;
          }

          // Find contiguous segment BELOW starting at exerciseIndex + 1 that belongs to this group
          let lowerStart = exerciseIndex + 1;
          let lowerEnd = lowerStart;
          while (
            lowerEnd < exercises.length - 1 &&
            exercises[lowerEnd + 1].supersetGroupId === groupId
          ) {
            lowerEnd += 1;
          }

          // Lower segment becomes either a new superset group (if at least 2 exercises)
          // or is fully unlinked if it's only a single exercise.
          const lowerLength = lowerEnd - lowerStart + 1;
          const newGroupId =
            lowerLength >= 2 ? `superset_${sectionId}_${lowerStart}_${Date.now()}` : null;

          for (let i = lowerStart; i <= lowerEnd; i += 1) {
            exercises[i] = {
              ...exercises[i],
              supersetGroupId: newGroupId,
            };
          }
        }

        return {
          ...item,
          section: {
            ...item.section,
            exercises,
          },
        };
      }
      return item;
    }),
  };
};
