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
    { value: 'timed', label: 'Timed', description: 'Work and rest intervals with specified durations' },
    { value: 'circuits', label: 'Circuits', description: 'Multiple exercises performed in sequence with minimal rest' },
] as const;

export type SectionType = typeof SECTION_TYPES[number]['value'];

// Exercise Category Types
export const EXERCISE_CATEGORY_OPTIONS = [
    { value: 'weight_reps', label: 'Weight & Reps' },
    { value: 'reps', label: 'Reps Only' },
    { value: 'distance_duration', label: 'Distance & Duration' },
] as const;

export type ExerciseCategory = typeof EXERCISE_CATEGORY_OPTIONS[number]['value'];

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
] as const;

export type Equipment = typeof EQUIPMENT_OPTIONS[number]['value'];

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

// Column Selection Options
export const COLUMN_OPTIONS = [
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
