/**
 * Centralized Training Constants
 * Shared across mobile and web applications
 */

import type { SectionType as WorkoutSchemaSectionType } from './workout-schema';

// Re-export types from workout-schema to avoid duplication
export type SectionType = WorkoutSchemaSectionType;

// Workout Types
export const WORKOUT_TYPES = [
    { value: 'weightlifting', label: 'Weightlifting' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'hiit', label: 'HIIT' },
    { value: 'crossfit', label: 'CrossFit' },
    { value: 'running', label: 'Running' },
    { value: 'cycling', label: 'Cycling' },
    { value: 'swimming', label: 'Swimming' },
    { value: 'yoga', label: 'Yoga' },
    { value: 'pilates', label: 'Pilates' },
    { value: 'combination', label: 'Combination' },
] as const;

export type WorkoutType = typeof WORKOUT_TYPES[number]['value'];

// Program Types (extended from workout types)
export const PROGRAM_TYPES = [
    { value: 'weightlifting', label: 'Weightlifting' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'hiit', label: 'HIIT' },
    { value: 'crossfit', label: 'CrossFit' },
    { value: 'running', label: 'Running' },
    { value: 'cycling', label: 'Cycling' },
    { value: 'swimming', label: 'Swimming' },
    { value: 'yoga', label: 'Yoga' },
    { value: 'pilates', label: 'Pilates' },
    { value: 'strength', label: 'Strength' },
    { value: 'hypertrophy', label: 'Hypertrophy' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'power', label: 'Power' },
    { value: 'athletic_performance', label: 'Athletic Performance' },
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'general_fitness', label: 'General Fitness' },
    { value: 'sport_specific', label: 'Sport Specific' },
    { value: 'rehabilitation', label: 'Rehabilitation' },
    { value: 'combination', label: 'Combination' },
] as const;

export type ProgramType = typeof PROGRAM_TYPES[number]['value'];

// Difficulty Levels
export const DIFFICULTY_LEVELS = [
    { value: 'all_levels', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number]['value'];

// Section Types
export const SECTION_TYPES = [
    { value: 'regular', label: 'Regular', description: 'Standard strength training with sets, reps, and rest periods' },
    { value: 'amrap', label: 'AMRAP', description: 'As Many Rounds/Reps As Possible within a time limit' },
    { value: 'tabata', label: 'Tabata', description: 'High-intensity intervals: 20s work, 10s rest, 8 rounds' },
    { value: 'hiit', label: 'HIIT', description: 'High-intensity interval training with customizable work/rest' },
    { value: 'emom', label: 'EMOM', description: 'Every Minute On the Minute with set duration' },
    { value: 'circuits', label: 'Circuits', description: 'Circuit training with a set number of rounds' },
] as const;

// Default configuration values for interval-based section types
export const SECTION_TYPE_DEFAULTS = {
    tabata: { workSec: 20, restSec: 10, rounds: 8 },
    hiit: { workSec: 40, restSec: 20, rounds: 10 },
    emom: { intervalSec: 60, durationMin: 10 },
    circuits: { rounds: 3 },
} as const;

// Exercise Type/Category Options
export const EXERCISE_TYPE_OPTIONS = [
    { value: 'weight_reps', label: 'Weight & Reps' },
    { value: 'reps', label: 'Reps Only' },
    { value: 'distance_duration', label: 'Distance & Duration' },
] as const;

export type ExerciseType = typeof EXERCISE_TYPE_OPTIONS[number]['value'];

// Muscle Group Options
export const MUSCLE_GROUP_OPTIONS = [
    { value: 'Chest', label: 'Chest' },
    { value: 'Back', label: 'Back' },
    { value: 'Shoulders', label: 'Shoulders' },
    { value: 'Biceps', label: 'Biceps' },
    { value: 'Triceps', label: 'Triceps' },
    { value: 'Forearms', label: 'Forearms' },
    { value: 'Abs', label: 'Abs' },
    { value: 'Obliques', label: 'Obliques' },
    { value: 'Quadriceps', label: 'Quadriceps' },
    { value: 'Hamstrings', label: 'Hamstrings' },
    { value: 'Glutes', label: 'Glutes' },
    { value: 'Calves', label: 'Calves' },
    { value: 'Traps', label: 'Traps' },
    { value: 'Lats', label: 'Lats' },
    { value: 'Delts', label: 'Delts' },
    { value: 'Full Body', label: 'Full Body' },
] as const;

export type MuscleGroup = typeof MUSCLE_GROUP_OPTIONS[number]['value'];

// Muscle Options (simplified for filtering)
export const MUSCLE_OPTIONS = [
    { label: 'Chest', value: 'Chest' },
    { label: 'Back', value: 'Back' },
    { label: 'Legs', value: 'Legs' },
    { label: 'Shoulders', value: 'Shoulders' },
    { label: 'Arms', value: 'Arms' },
    { label: 'Core', value: 'Core' },
    { label: 'Cardio', value: 'Cardio' },
] as const;

export type Muscle = typeof MUSCLE_OPTIONS[number]['value'];

// Equipment Options
export const EQUIPMENT_OPTIONS = [
    { value: 'Barbell', label: 'Barbell' },
    { value: 'Dumbbell', label: 'Dumbbell' },
    { value: 'Kettlebell', label: 'Kettlebell' },
    { value: 'Cable Machine', label: 'Cable Machine' },
    { value: 'Machine', label: 'Machine' },
    { value: 'Resistance Band', label: 'Resistance Band' },
    { value: 'Bodyweight', label: 'Bodyweight' },
    { value: 'Medicine Ball', label: 'Medicine Ball' },
    { value: 'TRX', label: 'TRX' },
    { value: 'Pulley', label: 'Pulley' },
    { value: 'Smith Machine', label: 'Smith Machine' },
    { value: 'Plate Loaded', label: 'Plate Loaded' },
    { value: 'Free Weights', label: 'Free Weights' },
    { value: 'Pull-up Bar', label: 'Pull-up Bar' },
    { value: 'Bands', label: 'Bands' },
    { value: 'None', label: 'None' },
] as const;

export type Equipment = typeof EQUIPMENT_OPTIONS[number]['value'];

// Exercise Equipment Options (alias for compatibility)
export const EXERCISE_EQUIPMENT_OPTIONS = EQUIPMENT_OPTIONS;

// Category Options
export const CATEGORY_OPTIONS = [
    { label: 'Strength', value: 'Strength' },
    { label: 'Cardio', value: 'Cardio' },
    { label: 'Plyometrics', value: 'Plyometrics' },
    { label: 'Stretching', value: 'Stretching' },
    { label: 'Powerlifting', value: 'Powerlifting' },
    { label: 'Olympic Weightlifting', value: 'Olympic Weightlifting' },
] as const;

export type Category = typeof CATEGORY_OPTIONS[number]['value'];

// Modality Options
export const MODALITY_OPTIONS = [
    { value: 'Strength', label: 'Strength' },
    { value: 'Power', label: 'Power' },
    { value: 'Agility', label: 'Agility' },
    { value: 'Plyos', label: 'Plyos' },
    { value: 'Mobility', label: 'Mobility' },
    { value: 'Endurance', label: 'Endurance' },
    { value: 'Cardio', label: 'Cardio' },
    { value: 'Flexibility', label: 'Flexibility' },
    { value: 'Balance', label: 'Balance' },
    { value: 'Stability', label: 'Stability' },
    { value: 'Speed', label: 'Speed' },
    { value: 'Coordination', label: 'Coordination' },
] as const;

export type Modality = typeof MODALITY_OPTIONS[number]['value'];

// ============================================================================
// MUSCLEWIKI FILTER OPTIONS
// These are aligned with MuscleWiki API categories for seamless integration
// ============================================================================

// MuscleWiki Equipment Categories (maps to their 'category' field)
// Values are capitalized as returned by the MuscleWiki API
export const MUSCLEWIKI_CATEGORY_OPTIONS = [
    { value: 'Band', label: 'Band' },
    { value: 'Barbell', label: 'Barbell' },
    { value: 'Bodyweight', label: 'Bodyweight' },
    { value: 'Bosu-Ball', label: 'Bosu Ball' },
    { value: 'Cables', label: 'Cables' },
    { value: 'Cardio', label: 'Cardio' },
    { value: 'Dumbbells', label: 'Dumbbells' },
    { value: 'Kettlebells', label: 'Kettlebells' },
    { value: 'Machine', label: 'Machine' },
    { value: 'Medicine-Ball', label: 'Medicine Ball' },
    { value: 'Plate', label: 'Plate' },
    { value: 'Recovery', label: 'Recovery' },
    { value: 'Smith-Machine', label: 'Smith Machine' },
    { value: 'Stretches', label: 'Stretches' },
    { value: 'TRX', label: 'TRX' },
    { value: 'Vitruvian', label: 'Vitruvian' },
    { value: 'Yoga', label: 'Yoga' },
] as const;

export type MuscleWikiCategory = typeof MUSCLEWIKI_CATEGORY_OPTIONS[number]['value'];

// MuscleWiki Gender Options (for filtering exercise videos)
export const MUSCLEWIKI_GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
] as const;

export type MuscleWikiGender = typeof MUSCLEWIKI_GENDER_OPTIONS[number]['value'];

// MuscleWiki Muscle Groups (for filtering via API)
// These are the primary muscle groups used by the MuscleWiki /muscles endpoint
export const MUSCLEWIKI_MUSCLE_OPTIONS = [
    { value: 'Chest', label: 'Chest' },
    { value: 'Back', label: 'Back' },
    { value: 'Shoulders', label: 'Shoulders' },
    { value: 'Biceps', label: 'Biceps' },
    { value: 'Triceps', label: 'Triceps' },
    { value: 'Forearms', label: 'Forearms' },
    { value: 'Abs', label: 'Abs' },
    { value: 'Obliques', label: 'Obliques' },
    { value: 'Quadriceps', label: 'Quadriceps' },
    { value: 'Hamstrings', label: 'Hamstrings' },
    { value: 'Glutes', label: 'Glutes' },
    { value: 'Calves', label: 'Calves' },
    { value: 'Traps', label: 'Traps' },
    { value: 'Lats', label: 'Lats' },
    { value: 'Lower Back', label: 'Lower Back' },
    { value: 'Hip Flexors', label: 'Hip Flexors' },
    { value: 'Adductors', label: 'Adductors' },
    { value: 'Abductors', label: 'Abductors' },
    { value: 'Neck', label: 'Neck' },
] as const;

export type MuscleWikiMuscle = typeof MUSCLEWIKI_MUSCLE_OPTIONS[number]['value'];

// MuscleWiki Difficulty Levels (capitalized as returned by API)
export const MUSCLEWIKI_DIFFICULTY_OPTIONS = [
    { value: 'Novice', label: 'Novice' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
] as const;

export type MuscleWikiDifficulty = typeof MUSCLEWIKI_DIFFICULTY_OPTIONS[number]['value'];

// MuscleWiki Force Types (capitalized as returned by API)
export const MUSCLEWIKI_FORCE_OPTIONS = [
    { value: 'Push', label: 'Push' },
    { value: 'Pull', label: 'Pull' },
    { value: 'Static', label: 'Static' },
] as const;

export type MuscleWikiForce = typeof MUSCLEWIKI_FORCE_OPTIONS[number]['value'];

// MuscleWiki Mechanic Types (capitalized as returned by API)
export const MUSCLEWIKI_MECHANIC_OPTIONS = [
    { value: 'Compound', label: 'Compound' },
    { value: 'Isolation', label: 'Isolation' },
] as const;

export type MuscleWikiMechanic = typeof MUSCLEWIKI_MECHANIC_OPTIONS[number]['value'];

// Habit Unit Options
export const HABIT_UNIT_OPTIONS = [
    { value: 'steps', label: 'Steps' },
    { value: 'min', label: 'Min' },
    { value: 'times', label: 'Times' },
    { value: 'count', label: 'Count' },
    { value: 'drink', label: 'Drink' },
    { value: 'cups', label: 'Cups' },
    { value: 'm', label: 'm' },
    { value: 'km', label: 'km' },
    { value: 'mile', label: 'Mile' },
    { value: 'sec', label: 'Sec' },
    { value: 'hour', label: 'Hour' },
    { value: 'ml', label: 'ml' },
    { value: 'l', label: 'l' },
    { value: 'oz', label: 'oz' },
    { value: 'cal', label: 'Cal' },
    { value: 'g', label: 'g' },
    { value: 'mg', label: 'mg' },
] as const;

export type HabitUnit = typeof HABIT_UNIT_OPTIONS[number]['value'];

// Habit Period Options
export const HABIT_PERIOD_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
] as const;

export type HabitPeriod = typeof HABIT_PERIOD_OPTIONS[number]['value'];

// Habit Duration Period Options
export const HABIT_DURATION_PERIOD_OPTIONS = [
    { value: 'days', label: 'Days' },
    { value: 'months', label: 'Months' },
    { value: 'years', label: 'Years' },
] as const;

export type HabitDurationPeriod = typeof HABIT_DURATION_PERIOD_OPTIONS[number]['value'];

// Heart Rate Zone Options
export const HEART_RATE_ZONE_OPTIONS = [
    { value: 'Zone 1', label: 'Zone 1', subtitle: '50-60% of max HR' },
    { value: 'Zone 2', label: 'Zone 2', subtitle: '60-70% of max HR' },
    { value: 'Zone 3', label: 'Zone 3', subtitle: '70-80% of max HR' },
    { value: 'Zone 4', label: 'Zone 4', subtitle: '80-90% of max HR' },
    { value: 'Zone 5', label: 'Zone 5', subtitle: '90-100% of max HR' },
] as const;

export type HeartRateZone = typeof HEART_RATE_ZONE_OPTIONS[number]['value'];

// Column Selection Options
export const COLUMN_OPTIONS = [
    // Optional (disables column)
    { label: '(Optional)', value: 'Optional' },

    // Reps (no units)
    { label: 'Reps', value: 'Reps' },

    // Weight units
    { label: 'Kg', value: 'kg' },
    { label: 'Lbs', value: 'lbs' },

    // Distance units
    { label: 'Km', value: 'km' },
    { label: 'M', value: 'm' },
    { label: 'Yards', value: 'yards' },
    { label: 'Miles', value: 'miles' },
    { label: 'Feet', value: 'feet' },

    // Duration units
    { label: 'Minutes', value: 'minutes' },
    { label: 'Seconds', value: 'seconds' },

    // None
    { label: 'None', value: 'None' },

    // Optional columns
    { label: 'Tempo', value: 'Tempo' },
    { label: 'RIR', value: 'RIR' },
    { label: 'RPE', value: 'RPE' },
    { label: 'HR Zone', value: 'Heart Rate Zone' },
    { label: 'Calories', value: 'Calories' },
    { label: 'Watts', value: 'Watts' },
    { label: 'Pace', value: 'Pace' },
    { label: 'Speed', value: 'Speed' },
    { label: 'Incline', value: 'Incline' },
    { label: 'Height', value: 'Height' },
    { label: 'RPM', value: 'RPM' },
] as const;

export type ColumnValue = typeof COLUMN_OPTIONS[number]['value'];

// Optional Column Options (subset of COLUMN_OPTIONS)
export const OPTIONAL_COLUMN_OPTIONS = [
    { label: '(Optional)', value: 'Optional' },
    { label: 'Tempo', value: 'Tempo' },
    { label: 'RIR', value: 'RIR' },
    { label: 'RPE', value: 'RPE' },
    { label: 'HR Zone', value: 'Heart Rate Zone' },
    { label: 'Calories', value: 'Calories' },
    { label: 'Watts', value: 'Watts' },
    { label: 'Pace', value: 'Pace' },
    { label: 'Speed', value: 'Speed' },
    { label: 'Incline', value: 'Incline' },
    { label: 'Height', value: 'Height' },
    { label: 'RPM', value: 'RPM' },
] as const;

export type OptionalColumn = typeof OPTIONAL_COLUMN_OPTIONS[number]['value'];

// Category to Default Columns Mapping
// Defines what columns should be shown by default based on exercise category
export type CategoryColumnConfig = {
    column1: ColumnValue;
    column2: ColumnValue;
};

export const CATEGORY_COLUMN_DEFAULTS: Record<string, CategoryColumnConfig> = {
    // Weight-based exercises: Reps + Weight
    'Barbell': { column1: 'Reps', column2: 'kg' },
    'Cables': { column1: 'Reps', column2: 'kg' },
    'Dumbbells': { column1: 'Reps', column2: 'kg' },
    'Kettlebells': { column1: 'Reps', column2: 'kg' },
    'Machine': { column1: 'Reps', column2: 'kg' },
    'Medicine-Ball': { column1: 'Reps', column2: 'kg' },
    'Plate': { column1: 'Reps', column2: 'kg' },
    'Smith-Machine': { column1: 'Reps', column2: 'kg' },
    'Vitruvian': { column1: 'Reps', column2: 'kg' },

    // Bodyweight exercises: Reps only
    'Bodyweight': { column1: 'Reps', column2: 'Optional' },
    'Band': { column1: 'Reps', column2: 'Optional' },
    'Bosu-Ball': { column1: 'Reps', column2: 'Optional' },
    'TRX': { column1: 'Reps', column2: 'Optional' },

    // Cardio exercises: Duration only
    'Cardio': { column1: 'minutes', column2: 'Optional' },

    // Recovery/Flexibility
    'Recovery': { column1: 'Reps', column2: 'Optional' },
    'Stretches': { column1: 'Reps', column2: 'Optional' },
    'Yoga': { column1: 'minutes', column2: 'Optional' },
};

// Default fallback for unknown categories
export const DEFAULT_COLUMN_CONFIG: CategoryColumnConfig = {
    column1: 'Reps',
    column2: 'kg',
};

/**
 * Get the default column configuration for an exercise based on its category
 * @param category - The MuscleWiki category of the exercise
 * @returns The default column configuration
 */
export const getDefaultColumnsForCategory = (category?: string): CategoryColumnConfig => {
    if (!category) return DEFAULT_COLUMN_CONFIG;
    return CATEGORY_COLUMN_DEFAULTS[category] || DEFAULT_COLUMN_CONFIG;
};

// Exercise Category Options (alias for compatibility)
export const EXERCISE_CATEGORY_OPTIONS = EXERCISE_TYPE_OPTIONS;
