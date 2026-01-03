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
    { value: 'timed', label: 'Timed', description: 'Work and rest intervals with specified durations' },
    { value: 'circuits', label: 'Circuits', description: 'Multiple exercises performed in sequence with minimal rest' },
] as const;

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
    { label: 'Time', value: 'time' },
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

export const OPTIONAL_COLUMN_OPTIONS = [
    { label: 'Optional', value: 'Optional' },
    { label: 'Tempo', value: 'Tempo' },
    { label: 'RIR', value: 'RIR' },
    { label: 'RPE', value: 'RPE' },
    { label: 'Heart Rate Zone', value: 'Heart Rate Zone' },
    { label: 'Calories', value: 'Calories' },
    { label: 'Watts', value: 'Watts' },
    { label: 'Pace', value: 'Pace' },
    { label: 'Speed', value: 'Speed' },
    { label: 'Incline', value: 'Incline' },
    { label: 'Height', value: 'Height' },
    { label: 'RPM', value: 'RPM' },
] as const;
