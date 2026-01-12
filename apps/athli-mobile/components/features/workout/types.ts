/**
 * Legacy types file for backwards compatibility.
 * New code should import from '@/components/features/workout/workout-schema' directly.
 */

// Re-export builder types for backwards compatibility
export {
    type BuilderExerciseSet as ExerciseSet,
    type BuilderExercise as WorkoutExercise,
    type BuilderSection as WorkoutSection,
    type BuilderItem,  // Don't alias to WorkoutItem to avoid conflict with shared package
    getDefaultColumns,
} from '@/components/features/workout/workout-schema';

// Note: WorkoutItem from shared package refers to the API payload item type
// Use BuilderItem for builder UI state

export { COLUMN_OPTIONS, HEART_RATE_ZONE_OPTIONS } from '@athli/shared-types';
export type { ColumnValue, HeartRateZone } from '@athli/shared-types';

