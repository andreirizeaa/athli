/**
 * Validation utilities for workout and section builders
 */

import { type BuilderExercise, type BuilderSection, type BuilderItem, isBuilderSection } from './workout-schema';

export type ExerciseValidationError = {
    exerciseId: string;
    setErrors: { setIndex: number; column1: boolean; column2: boolean }[];
    tempoError: boolean;
};

export type ValidationResult = {
    isValid: boolean;
    errors: ExerciseValidationError[];
    emptySectionIds: string[];
    errorMessage: string | null;
};

/**
 * Validates tempo format - must be empty or complete X-X-X-X format (4 digits)
 */
export const isTempoValid = (tempo?: string): boolean => {
    if (!tempo || tempo.trim() === '') return true;
    // Must match exactly X-X-X-X where X is a digit
    const tempoPattern = /^\d-\d-\d-\d$/;
    return tempoPattern.test(tempo);
};

/**
 * Validates a single exercise
 */
export const validateExercise = (exercise: BuilderExercise): ExerciseValidationError | null => {
    const setErrors: { setIndex: number; column1: boolean; column2: boolean }[] = [];

    // Check each set for missing values
    exercise.sets.forEach((set, index) => {
        const column1Required = exercise.column1Type !== 'None';
        const column2Required = exercise.column2Type !== 'None';

        const column1Missing = column1Required && (!set.column1 || set.column1.trim() === '');
        const column2Missing = column2Required && (!set.column2 || set.column2.trim() === '');

        if (column1Missing || column2Missing) {
            setErrors.push({
                setIndex: index,
                column1: column1Missing,
                column2: column2Missing,
            });
        }
    });

    // Check tempo format
    const tempoError = !isTempoValid(exercise.tempo);

    if (setErrors.length > 0 || tempoError) {
        return {
            exerciseId: exercise.id,
            setErrors,
            tempoError,
        };
    }

    return null;
};

/**
 * Validates all exercises in a list
 */
export const validateExercises = (exercises: BuilderExercise[]): ValidationResult => {
    const errors: ExerciseValidationError[] = [];

    exercises.forEach((exercise) => {
        const error = validateExercise(exercise);
        if (error) {
            errors.push(error);
        }
    });

    if (errors.length === 0) {
        return { isValid: true, errors: [], emptySectionIds: [], errorMessage: null };
    }

    // Build error message
    const hasSetErrors = errors.some(e => e.setErrors.length > 0);
    const hasTempoErrors = errors.some(e => e.tempoError);

    let message = 'Please fix the following issues:\n\n';
    if (hasSetErrors) {
        message += '• All set values are required (unless column is set to "None")\n';
    }
    if (hasTempoErrors) {
        message += '• Tempo must be in X-X-X-X format (e.g., 3-1-2-0)\n';
    }

    return {
        isValid: false,
        errors,
        emptySectionIds: [],
        errorMessage: message,
    };
};

/**
 * Validates all items in the workout builder (exercises and sections)
 */
export const validateWorkoutItems = (items: BuilderItem[]): ValidationResult => {
    const allErrors: ExerciseValidationError[] = [];
    const emptySections: { id: string; name: string }[] = [];

    items.forEach((item) => {
        if (isBuilderSection(item)) {
            // Check if section has at least one exercise
            if (item.exercises.length === 0) {
                emptySections.push({ id: item.id, name: item.name });
            }

            // Validate exercises within sections
            item.exercises.forEach((exercise) => {
                const error = validateExercise(exercise);
                if (error) {
                    allErrors.push(error);
                }
            });
        } else {
            // Validate top-level exercise
            const error = validateExercise(item);
            if (error) {
                allErrors.push(error);
            }
        }
    });

    if (allErrors.length === 0 && emptySections.length === 0) {
        return { isValid: true, errors: [], emptySectionIds: [], errorMessage: null };
    }

    const hasSetErrors = allErrors.some(e => e.setErrors.length > 0);
    const hasTempoErrors = allErrors.some(e => e.tempoError);
    const hasEmptySections = emptySections.length > 0;

    let message = 'Please fix the following issues:\n\n';
    if (hasEmptySections) {
        const sectionNames = emptySections.map(s => s.name).join(', ');
        message += `• Sections must have at least one exercise: ${sectionNames}\n`;
    }
    if (hasSetErrors) {
        message += '• All set values are required (unless column is set to "None")\n';
    }
    if (hasTempoErrors) {
        message += '• Tempo must be in X-X-X-X format (e.g., 3-1-2-0)\n';
    }

    return {
        isValid: false,
        errors: allErrors,
        emptySectionIds: emptySections.map(s => s.id),
        errorMessage: message,
    };
};

/**
 * Helper to check if a specific set has an error
 */
export const hasSetError = (
    errors: ExerciseValidationError[],
    exerciseId: string,
    setIndex: number
): { column1: boolean; column2: boolean } => {
    const exerciseError = errors.find(e => e.exerciseId === exerciseId);
    if (!exerciseError) return { column1: false, column2: false };

    const setError = exerciseError.setErrors.find(s => s.setIndex === setIndex);
    return setError || { column1: false, column2: false };
};

/**
 * Helper to check if an exercise has a tempo error
 */
export const hasTempoError = (errors: ExerciseValidationError[], exerciseId: string): boolean => {
    const exerciseError = errors.find(e => e.exerciseId === exerciseId);
    return exerciseError?.tempoError ?? false;
};
