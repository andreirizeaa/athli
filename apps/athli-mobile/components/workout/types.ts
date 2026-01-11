/**
 * Legacy types file for backwards compatibility.
 * New code should import from '@/components/workout/workout-schema' directly.
 */

// Re-export builder types for backwards compatibility
export {
    type BuilderExerciseSet as ExerciseSet,
    type BuilderExercise as WorkoutExercise,
    type BuilderSection as WorkoutSection,
    type BuilderItem as WorkoutItem,
    getDefaultColumns,
} from '@/components/workout/workout-schema';

export { COLUMN_OPTIONS, HEART_RATE_ZONE_OPTIONS } from '@/constants/training';
export type { ColumnValue, HeartRateZone } from '@/constants/training';

