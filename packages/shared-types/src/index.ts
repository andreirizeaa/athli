/**
 * @athli/shared-types
 *
 * Shared TypeScript types and utilities for the Athli platform.
 * This package ensures type consistency between web and mobile apps.
 *
 * CRITICAL: This is the SINGLE source of truth for:
 * - Workout schema types
 * - Payload building (builder → API)
 * - Payload conversion (API → builder)
 *
 * ONE SCHEMA - ONE BUILDER - ONE CONVERTER - NO DRIFT
 */

// Core schema types
export * from './workout-schema';

// Payload building (builder → API)
export * from './payload-builder';

// Payload conversion (API → builder)
export * from './payload-converter';

// Training constants (centralized) - export specific items to avoid duplicates
export {
  WORKOUT_TYPES,
  PROGRAM_TYPES,
  DIFFICULTY_LEVELS,
  SECTION_TYPES,
  EXERCISE_TYPE_OPTIONS,
  MUSCLE_GROUP_OPTIONS,
  MUSCLE_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXERCISE_EQUIPMENT_OPTIONS,
  CATEGORY_OPTIONS,
  MODALITY_OPTIONS,
  HABIT_UNIT_OPTIONS,
  HABIT_PERIOD_OPTIONS,
  HABIT_DURATION_PERIOD_OPTIONS,
  HEART_RATE_ZONE_OPTIONS,
  COLUMN_OPTIONS,
  OPTIONAL_COLUMN_OPTIONS,
  EXERCISE_CATEGORY_OPTIONS,
  type WorkoutType,
  type ProgramType,
  type DifficultyLevel,
  type MuscleGroup,
  type Muscle,
  type Equipment,
  type Category,
  type Modality,
  type HabitUnit,
  type HabitPeriod,
  type HabitDurationPeriod,
  type HeartRateZone,
  type ColumnValue,
  type OptionalColumn,
} from './training-constants';
