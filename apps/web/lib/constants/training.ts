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

export const DIFFICULTY_LEVELS = [
    { value: 'all_levels', label: 'All levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
] as const;

export const SECTION_TYPES = [
    { value: 'regular', label: 'Regular', description: 'Standard strength training with sets, reps, and rest periods' },
    { value: 'amrap', label: 'AMRAP', description: 'As Many Rounds/Reps As Possible within a time limit' },
    { value: 'tabata', label: 'Tabata', description: 'High-intensity intervals: 20s work, 10s rest, 8 rounds' },
    { value: 'hiit', label: 'HIIT', description: 'High-intensity interval training with customizable work/rest' },
    { value: 'emom', label: 'EMOM', description: 'Every Minute On the Minute with set duration' },
] as const;

// Default configuration values for interval-based section types
export const SECTION_TYPE_DEFAULTS = {
    tabata: { workSec: 20, restSec: 10, rounds: 8 },
    hiit: { workSec: 40, restSec: 20, rounds: 10 },
    emom: { intervalSec: 60, durationMin: 10 },
} as const;

export const MUSCLE_OPTIONS = [
    { label: 'Chest', value: 'Chest' },
    { label: 'Back', value: 'Back' },
    { label: 'Legs', value: 'Legs' },
    { label: 'Shoulders', value: 'Shoulders' },
    { label: 'Arms', value: 'Arms' },
    { label: 'Core', value: 'Core' },
    { label: 'Cardio', value: 'Cardio' },
] as const;

export const EXERCISE_TYPE_OPTIONS = [
    { label: 'Weight & Reps', value: 'weight_reps' },
    { label: 'Reps Only', value: 'reps' },
    { label: 'Distance & Duration', value: 'distance_duration' },
] as const;

export const CATEGORY_OPTIONS = [
    { label: 'Strength', value: 'Strength' },
    { label: 'Cardio', value: 'Cardio' },
    { label: 'Plyometrics', value: 'Plyometrics' },
    { label: 'Stretching', value: 'Stretching' },
    { label: 'Powerlifting', value: 'Powerlifting' },
    { label: 'Olympic Weightlifting', value: 'Olympic Weightlifting' },
] as const;

export const EQUIPMENT_OPTIONS = [
    { label: 'None', value: 'None' },
    { label: 'Barbell', value: 'Barbell' },
    { label: 'Dumbbell', value: 'Dumbbell' },
    { label: 'Machine', value: 'Machine' },
    { label: 'Kettlebell', value: 'Kettlebell' },
    { label: 'Pull-up Bar', value: 'Pull-up Bar' },
    { label: 'Bands', value: 'Bands' },
] as const;

export const HEART_RATE_ZONE_OPTIONS = [
    { value: 'Z1: 50-60% of max HR', label: 'Z1: 50-60% of max HR' },
    { value: 'Z2: 60-70% of max HR', label: 'Z2: 60-70% of max HR' },
    { value: 'Z3: 70-80% of max HR', label: 'Z3: 70-80% of max HR' },
    { value: 'Z4: 80-90% of max HR', label: 'Z4: 80-90% of max HR' },
    { value: 'Z5: 90-100% of max HR', label: 'Z5: 90-100% of max HR' },
] as const;


export const OPTIONAL_COLUMN_OPTIONS = [
    { label: 'Optional', value: 'Optional' },
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

// Column options with units - flat array
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
    
    { label: 'Optional', value: 'Optional' },
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

export const EXERCISE_CATEGORY_OPTIONS = [
    { label: 'Weight & Reps', value: 'Weight & Reps' },
    { label: 'Reps', value: 'Reps' },
    { label: 'Distance / Duration', value: 'Distance / Duration' },
] as const;

export const MUSCLE_GROUP_OPTIONS = [
    { label: 'Chest', value: 'Chest' },
    { label: 'Back', value: 'Back' },
    { label: 'Shoulders', value: 'Shoulders' },
    { label: 'Biceps', value: 'Biceps' },
    { label: 'Triceps', value: 'Triceps' },
    { label: 'Forearms', value: 'Forearms' },
    { label: 'Abs', value: 'Abs' },
    { label: 'Obliques', value: 'Obliques' },
    { label: 'Quadriceps', value: 'Quadriceps' },
    { label: 'Hamstrings', value: 'Hamstrings' },
    { label: 'Glutes', value: 'Glutes' },
    { label: 'Calves', value: 'Calves' },
    { label: 'Traps', value: 'Traps' },
    { label: 'Lats', value: 'Lats' },
    { label: 'Delts', value: 'Delts' },
    { label: 'Full Body', value: 'Full Body' },
] as const;

export const EXERCISE_EQUIPMENT_OPTIONS = [
    { label: 'Barbell', value: 'Barbell' },
    { label: 'Dumbbell', value: 'Dumbbell' },
    { label: 'Kettlebell', value: 'Kettlebell' },
    { label: 'Cable Machine', value: 'Cable Machine' },
    { label: 'Machine', value: 'Machine' },
    { label: 'Resistance Band', value: 'Resistance Band' },
    { label: 'Bodyweight', value: 'Bodyweight' },
    { label: 'Medicine Ball', value: 'Medicine Ball' },
    { label: 'TRX', value: 'TRX' },
    { label: 'Pulley', value: 'Pulley' },
    { label: 'Smith Machine', value: 'Smith Machine' },
    { label: 'Plate Loaded', value: 'Plate Loaded' },
    { label: 'Free Weights', value: 'Free Weights' },
] as const;

export const MODALITY_OPTIONS = [
    { label: 'Strength', value: 'Strength' },
    { label: 'Power', value: 'Power' },
    { label: 'Agility', value: 'Agility' },
    { label: 'Plyos', value: 'Plyos' },
    { label: 'Mobility', value: 'Mobility' },
    { label: 'Endurance', value: 'Endurance' },
    { label: 'Cardio', value: 'Cardio' },
    { label: 'Flexibility', value: 'Flexibility' },
    { label: 'Balance', value: 'Balance' },
    { label: 'Stability', value: 'Stability' },
    { label: 'Speed', value: 'Speed' },
    { label: 'Coordination', value: 'Coordination' },
] as const;

