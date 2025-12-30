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
