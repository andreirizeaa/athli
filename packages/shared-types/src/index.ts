/**
 * @athli/shared-types
 *
 * Shared TypeScript types and utilities for the Athli platform.
 * This package ensures type consistency between web API, web frontend, and mobile apps.
 *
 * CRITICAL: This is the SINGLE source of truth for:
 * - Workout schema types
 * - Payload building (builder → API)
 * - Payload conversion (API → builder)
 * - Messaging schema types
 * - Messaging constants and utilities
 *
 * ONE SCHEMA - ONE BUILDER - ONE CONVERTER - NO DRIFT
 */

// ================================================
// SCHEMAS - Core type definitions
// ================================================
export * from './schemas';

// ================================================
// FUNCTIONS - Utility functions
// ================================================
export * from './functions';

// ================================================
// CONSTANTS - Centralized constants
// ================================================
// Export specific items from training-constants to avoid duplicates
export {
  WORKOUT_TYPES,
  PROGRAM_TYPES,
  DIFFICULTY_LEVELS,
  SECTION_TYPES,
  SECTION_TYPE_DEFAULTS,
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
  CATEGORY_COLUMN_DEFAULTS,
  DEFAULT_COLUMN_CONFIG,
  getDefaultColumnsForCategory,
  EXERCISE_CATEGORY_OPTIONS,
  // MuscleWiki-specific filter options
  MUSCLEWIKI_CATEGORY_OPTIONS,
  MUSCLEWIKI_GENDER_OPTIONS,
  MUSCLEWIKI_MUSCLE_OPTIONS,
  MUSCLEWIKI_DIFFICULTY_OPTIONS,
  MUSCLEWIKI_FORCE_OPTIONS,
  MUSCLEWIKI_MECHANIC_OPTIONS,
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
  type CategoryColumnConfig,
  type ExerciseType,
  // MuscleWiki types
  type MuscleWikiCategory,
  type MuscleWikiGender,
  type MuscleWikiMuscle,
  type MuscleWikiDifficulty,
  type MuscleWikiForce,
  type MuscleWikiMechanic,
} from './constants/training-constants';

// Messaging constants
export * from './constants/messaging-constants';

// Timezone constants
export {
  TIMEZONE_OPTIONS,
  TIMEZONE_GROUPS,
  TIMEZONE_VALUES,
  type TimezoneOption,
  type TimezoneGroup,
  type Timezone,
} from './constants/timezone-constants';

// Notification constants
export * from './constants/notification-constants';
