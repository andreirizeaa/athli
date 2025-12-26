import type { WorkoutSchema, ExerciseWithSuperset } from '../types/workout-builder.types';

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
 * Links two consecutive exercises into a superset
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
    sections: currentSchema.sections.map((section) => {
      if (section.id === sectionId && section.exercises) {
        const exercises = [...section.exercises];
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
          ...section,
          exercises,
        };
      }
      return section;
    }),
  };
};

/**
 * Unlinks two consecutive exercises in a superset
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
    sections: currentSchema.sections.map((section) => {
      if (section.id === sectionId && section.exercises) {
        const exercises = [...section.exercises];
        const currentExercise = exercises[exerciseIndex];
        const nextExercise = exercises[exerciseIndex + 1];

        if (
          currentExercise &&
          nextExercise &&
          currentExercise.supersetGroupId &&
          currentExercise.supersetGroupId === nextExercise.supersetGroupId
        ) {
          const groupId = currentExercise.supersetGroupId;

          // We want to break the chain only at the selected boundary:
          // - Keep the chain above exerciseIndex as one superset group
          // - Keep the chain below exerciseIndex+1 as a separate superset group (if 2+ cards)

          // Find contiguous segment ABOVE including exerciseIndex that belongs to this group
          let upperStart = exerciseIndex;
          while (upperStart > 0 && exercises[upperStart - 1].supersetGroupId === groupId) {
            upperStart -= 1;
          }
          const upperEnd = exerciseIndex;

          // Find contiguous segment BELOW starting at exerciseIndex + 1 that belongs to this group
          let lowerStart = exerciseIndex + 1;
          let lowerEnd = lowerStart;
          while (
            lowerEnd < exercises.length - 1 &&
            exercises[lowerEnd + 1].supersetGroupId === groupId
          ) {
            lowerEnd += 1;
          }

          // Upper segment stays with the original groupId (no change needed)

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
          ...section,
          exercises,
        };
      }
      return section;
    }),
  };
};
