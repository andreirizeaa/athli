import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset, WorkoutSection } from '@/components/training/shared/types/workout-builder.types';
import { SECTION_TYPE_DEFAULTS } from '@athli/shared-types';

/**
 * Handles adding a new section to the workout
 *
 * @param type - The type of section to add
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleSectionSelect = (
  type: 'regular' | 'amrap' | 'tabata' | 'hiit' | 'emom' | 'circuits' | 'auxiliary',
  currentSchema: WorkoutSchema,
  overrides?: Partial<WorkoutSection>
): WorkoutSchema => {
  const newSection: WorkoutSection = {
    id: `sec_${type}_${Date.now()}`,
    type,
    // All section types use `exercises` for the builder UI. For AMRAP/Tabata/HIIT/EMOM/Circuits/Auxiliary,
    // these will later be mapped appropriately in the payload.
    exercises: [] as ExerciseWithSuperset[],
    ...(type === 'amrap' && { roundDurationSec: undefined }),
    ...(type === 'tabata' && {
      workSec: SECTION_TYPE_DEFAULTS.tabata.workSec,
      restSec: SECTION_TYPE_DEFAULTS.tabata.restSec,
      rounds: SECTION_TYPE_DEFAULTS.tabata.rounds
    }),
    ...(type === 'hiit' && {
      workSec: SECTION_TYPE_DEFAULTS.hiit.workSec,
      restSec: SECTION_TYPE_DEFAULTS.hiit.restSec,
      rounds: SECTION_TYPE_DEFAULTS.hiit.rounds
    }),
    ...(type === 'emom' && {
      intervalSec: SECTION_TYPE_DEFAULTS.emom.intervalSec,
      durationMin: SECTION_TYPE_DEFAULTS.emom.durationMin
    }),
    ...(type === 'circuits' && {
      rounds: SECTION_TYPE_DEFAULTS.circuits.rounds
    }),
    ...(type === 'auxiliary' && { category: undefined }),
    ...overrides,
  };

  const newItem: WorkoutSchemaItem = {
    itemType: 'section',
    section: newSection,
  };

  return {
    ...currentSchema,
    items: [...currentSchema.items, newItem],
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
  const updatedItems = currentSchema.items.filter((item) => {
    if (item.itemType === 'section') {
      return item.section.id !== sectionId;
    }
    return true;
  });

  // Only switch to section mode if there are no items at all
  const shouldSwitchToSectionMode = updatedItems.length === 0;

  return {
    schema: {
      ...currentSchema,
      items: updatedItems,
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
  type: 'regular' | 'amrap' | 'tabata' | 'hiit' | 'emom' | 'circuits' | 'auxiliary'
): string => {
  switch (type) {
    case 'regular':
      return 'Exercise for exercise. Follow the sets and reps specified.';
    case 'amrap':
      return 'Track the total amount of rounds completed in the allocated time.';
    case 'tabata':
      return 'High-intensity intervals with 20s work and 10s rest for 8 rounds.';
    case 'hiit':
      return 'High-intensity interval training with customizable work/rest periods.';
    case 'emom':
      return 'Every Minute On the Minute - complete exercises within each minute interval.';
    case 'circuits':
      return 'Circuit training - complete all exercises in order for the specified number of rounds.';
    case 'auxiliary':
      return 'Warm up, cool down, or mobility exercises. Follow the sets and reps specified.';
    default:
      return '';
  }
};
