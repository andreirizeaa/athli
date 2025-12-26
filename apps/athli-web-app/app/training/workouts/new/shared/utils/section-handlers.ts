import type { WorkoutSchema, ExerciseWithSuperset } from '../types/workout-builder.types';

/**
 * Handles adding a new section to the workout
 *
 * @param type - The type of section to add
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleSectionSelect = (
  type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary',
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const newSection = {
    id: `sec_${type}_${Date.now()}`,
    type,
    // All section types use `exercises` for the builder UI. For AMRAP/Timed/Circuits/Auxiliary,
    // these will later be mapped appropriately in the payload.
    exercises: [] as ExerciseWithSuperset[],
    ...(type === 'amrap' && { roundDurationSec: undefined }),
    ...(type === 'timed' && { targetRounds: undefined }),
    ...(type === 'circuits' && { targetRounds: undefined }),
    ...(type === 'auxiliary' && { category: undefined }),
  };

  return {
    ...currentSchema,
    sections: [...currentSchema.sections, newSection],
  };
};

/**
 * Handles deleting a section from the workout
 *
 * @param sectionId - The ID of the section to delete
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema and whether to switch to section mode
 */
export const handleDeleteSection = (
  sectionId: string,
  currentSchema: WorkoutSchema
): { schema: WorkoutSchema; shouldSwitchToSectionMode: boolean } => {
  const updatedSections = currentSchema.sections.filter((section) => section.id !== sectionId);
  const shouldSwitchToSectionMode = updatedSections.length === 0;

  return {
    schema: {
      ...currentSchema,
      sections: updatedSections,
    },
    shouldSwitchToSectionMode,
  };
};

/**
 * Gets a user-friendly description for a section type
 *
 * @param type - The section type
 * @returns A description of what the section type means
 */
export const getSectionDescription = (
  type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary'
): string => {
  switch (type) {
    case 'regular':
      return 'Exercise for exercise. Follow the sets and reps specified.';
    case 'amrap':
      return 'Track the total amount of rounds completed in the allocated time.';
    case 'timed':
      return 'Track total duration until completion of assigned rounds.';
    case 'circuits':
      return 'Complete all exercises in the circuit for the specified number of rounds. One set per exercise.';
    case 'auxiliary':
      return 'Warm up, cool down, or mobility exercises. Follow the sets and reps specified.';
    default:
      return '';
  }
};
