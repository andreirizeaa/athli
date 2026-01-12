import type { SetData } from '@/components/training/builder/exercise-card';
import type {
  SetFieldValidation,
  ValidationErrors,
  SectionValidationErrors,
  SectionValidation,
  WorkoutSchema,
  ExerciseWithSuperset,
  ExerciseValidationError,
} from '@/components/training/shared/types/workout-builder.types';

/**
 * Maps a column label to the actual field name where data is stored
 * This must match the logic in exercise-card.tsx getFieldName
 */
const getFieldNameFromLabel = (columnLabel: string | undefined): 'reps' | 'weight' | 'distance' | 'duration' | 'optional' | null => {
  if (!columnLabel || columnLabel === 'None') return null;
  if (columnLabel === 'Reps') return 'reps';
  if (columnLabel === 'kg' || columnLabel === 'lbs') return 'weight';
  if (columnLabel === 'km' || columnLabel === 'm' || columnLabel === 'yards' || columnLabel === 'miles' || columnLabel === 'feet') return 'distance';
  if (columnLabel === 'minutes' || columnLabel === 'seconds') return 'duration';
  // For optional columns (Tempo, RIR, RPE, etc.)
  return 'optional';
};

/**
 * Gets the value from a set based on the field name
 */
const getFieldValue = (set: SetData, fieldName: 'reps' | 'weight' | 'distance' | 'duration' | 'optional' | null): string => {
  if (!fieldName) return '';
  if (fieldName === 'reps') return set.reps || '';
  if (fieldName === 'weight') return set.weight || '';
  if (fieldName === 'distance') return set.distance || '';
  if (fieldName === 'duration') return set.duration || '';
  if (fieldName === 'optional') return set.optional?.prescribed || '';
  return '';
};

/**
 * Validates tempo format - must be empty or complete X-X-X-X format (4 digits)
 */
const isTempoValid = (tempo?: string): boolean => {
  if (!tempo || tempo.trim() === '') return true;
  // Must match exactly X-X-X-X where X is a digit
  const tempoPattern = /^\d-\d-\d-\d$/;
  return tempoPattern.test(tempo);
};

/**
 * Recomputes validation errors for a single exercise based on its sets
 * Simple validation: value required in each cell unless column is set to "None"
 */
export const recomputeExerciseValidation = (
  exerciseInstanceId: string,
  exerciseType: 'weight_reps' | 'reps' | 'distance_duration',
  sets: SetData[] | undefined,
  hasAttemptedSave: boolean,
  currentErrors: ValidationErrors,
  eachSide?: boolean,
  column1Label?: string,
  column2Label?: string,
  tempo?: string
): ValidationErrors => {
  // Do not show validation until the user has attempted to save at least once
  if (!hasAttemptedSave) {
    return currentErrors;
  }

  const next: ValidationErrors = { ...currentErrors };
  const exerciseErrors: ExerciseValidationError = {};

  // Map column labels to field names
  const column1Field = getFieldNameFromLabel(column1Label);
  const column2Field = getFieldNameFromLabel(column2Label);

  // Column 1 is required if not "None" or optional type
  const column1Required = column1Field !== null && column1Field !== 'optional';
  // Column 2 is required if not "None" or optional type
  const column2Required = column2Field !== null && column2Field !== 'optional';

  if (sets && sets.length > 0) {
    sets.forEach((set, index) => {
      const setErrors: SetFieldValidation = {};

      // Validate column 1 (if required)
      if (column1Required) {
        const value = getFieldValue(set, column1Field);
        if (!value || value.trim() === '') {
          // Mark the appropriate field as having an error
          if (column1Field === 'reps') setErrors.reps = true;
          else if (column1Field === 'weight') setErrors.weight = true;
          else if (column1Field === 'distance') setErrors.distance = true;
          else if (column1Field === 'duration') setErrors.duration = true;
        }
      }

      // Validate column 2 (if required)
      if (column2Required) {
        const value = getFieldValue(set, column2Field);
        if (!value || value.trim() === '') {
          // Mark the appropriate field as having an error
          if (column2Field === 'reps') setErrors.reps = true;
          else if (column2Field === 'weight') setErrors.weight = true;
          else if (column2Field === 'distance') setErrors.distance = true;
          else if (column2Field === 'duration') setErrors.duration = true;
        }
      }

      if (Object.keys(setErrors).length > 0) {
        exerciseErrors[index] = setErrors;
      }
    });
  }

  // Check tempo format (at exercise level, not per-set)
  if (!isTempoValid(tempo)) {
    // Add a special marker for tempo error (use set index -1 or a special key)
    exerciseErrors[-1] = { tempo: true } as unknown as SetFieldValidation;
  }

  if (Object.keys(exerciseErrors).length === 0) {
    delete next[exerciseInstanceId];
  } else {
    next[exerciseInstanceId] = exerciseErrors;
  }

  return next;
};

/**
 * Clears a specific validation error field for a set
 */
export const clearSetValidationField = (
  exerciseInstanceId: string,
  setIndex: number,
  field: keyof SetFieldValidation,
  currentErrors: ValidationErrors
): ValidationErrors => {
  const exerciseErrors = currentErrors[exerciseInstanceId];
  if (!exerciseErrors) return currentErrors;

  const setErrors = exerciseErrors[setIndex];
  if (!setErrors || !setErrors[field]) return currentErrors;

  const nextSetErrors: SetFieldValidation = { ...setErrors };
  delete nextSetErrors[field];

  const nextExerciseErrors: Record<number, SetFieldValidation> = { ...exerciseErrors };
  if (Object.keys(nextSetErrors).length === 0) {
    delete nextExerciseErrors[setIndex];
  } else {
    nextExerciseErrors[setIndex] = nextSetErrors;
  }

  const nextValidationErrors: ValidationErrors = { ...currentErrors };
  if (Object.keys(nextExerciseErrors).length === 0) {
    delete nextValidationErrors[exerciseInstanceId];
  } else {
    nextValidationErrors[exerciseInstanceId] = nextExerciseErrors;
  }

  return nextValidationErrors;
};

/**
 * Validates a single exercise and adds any errors to the nextErrors object
 * Simple validation: value required in each cell unless column is set to "None"
 */
const validateExercise = (
  exercise: ExerciseWithSuperset,
  nextErrors: ValidationErrors
): void => {
  const sets = exercise.sets || [];

  // Get column labels
  const column1Label = exercise.column1Label;
  const column2Label = exercise.column2Label;

  // Map column labels to field names
  const column1Field = getFieldNameFromLabel(column1Label);
  const column2Field = getFieldNameFromLabel(column2Label);

  // Column 1 is required if not "None" or optional type
  const column1Required = column1Field !== null && column1Field !== 'optional';
  // Column 2 is required if not "None" or optional type
  const column2Required = column2Field !== null && column2Field !== 'optional';

  sets.forEach((set, index) => {
    const setErrors: SetFieldValidation = {};

    // Validate column 1 (if required)
    if (column1Required) {
      const value = getFieldValue(set, column1Field);
      if (!value || value.trim() === '') {
        // Mark the appropriate field as having an error
        if (column1Field === 'reps') setErrors.reps = true;
        else if (column1Field === 'weight') setErrors.weight = true;
        else if (column1Field === 'distance') setErrors.distance = true;
        else if (column1Field === 'duration') setErrors.duration = true;
      }
    }

    // Validate column 2 (if required)
    if (column2Required) {
      const value = getFieldValue(set, column2Field);
      if (!value || value.trim() === '') {
        // Mark the appropriate field as having an error
        if (column2Field === 'reps') setErrors.reps = true;
        else if (column2Field === 'weight') setErrors.weight = true;
        else if (column2Field === 'distance') setErrors.distance = true;
        else if (column2Field === 'duration') setErrors.duration = true;
      }
    }

    if (Object.keys(setErrors).length > 0) {
      if (!nextErrors[exercise.instanceId]) {
        nextErrors[exercise.instanceId] = {};
      }
      nextErrors[exercise.instanceId][index] = setErrors;
    }
  });

  // Check tempo format (at exercise level)
  if (!isTempoValid(exercise.tempo)) {
    if (!nextErrors[exercise.instanceId]) {
      nextErrors[exercise.instanceId] = {};
    }
    nextErrors[exercise.instanceId][-1] = { tempo: true } as unknown as SetFieldValidation;
  }
};

/**
 * Validates the entire workout schema and returns all validation errors
 */
export const validateWorkoutSchema = (
  workoutSchema: WorkoutSchema
): { exerciseErrors: ValidationErrors; sectionErrors: SectionValidationErrors } => {
  const nextErrors: ValidationErrors = {};
  const nextSectionErrors: SectionValidationErrors = {};

  workoutSchema.items.forEach((item) => {
    if (item.itemType === 'exercise') {
      // Validate top-level exercise
      validateExercise(item.exercise, nextErrors);
    } else if (item.itemType === 'section') {
      const section = item.section;
      const sectionErrors: SectionValidation = {};

      // Validate section configuration
      if (section.type === 'amrap') {
        if (!section.roundDurationSec || section.roundDurationSec <= 0) {
          sectionErrors.missingConfig = true;
        }
      }

      if (section.type === 'timed') {
        if (!section.targetRounds || section.targetRounds <= 0) {
          sectionErrors.missingConfig = true;
        }
      }

      if (section.type === 'circuits') {
        if (!section.targetRounds || section.targetRounds <= 0) {
          sectionErrors.missingConfig = true;
        }
      }

      if (section.type === 'auxiliary') {
        if (!section.category) {
          sectionErrors.missingConfig = true;
        }
      }

      // Validate section has exercises
      if (!section.exercises || section.exercises.length === 0) {
        sectionErrors.emptyExercises = true;
      }

      if (Object.keys(sectionErrors).length > 0) {
        nextSectionErrors[section.id] = sectionErrors;
      }

      // Validate individual exercises within section
      section.exercises?.forEach((exercise) => {
        validateExercise(exercise, nextErrors);
      });
    }
  });

  return { exerciseErrors: nextErrors, sectionErrors: nextSectionErrors };
};

/**
 * Clears the empty exercises validation error when an exercise is added to a section
 */
export const clearEmptyExercisesError = (
  sectionId: string,
  currentErrors: SectionValidationErrors
): SectionValidationErrors => {
  const existing = currentErrors[sectionId];
  if (!existing || !existing.emptyExercises) return currentErrors;

  const nextSection = { ...existing };
  delete nextSection.emptyExercises;

  const next: SectionValidationErrors = { ...currentErrors };
  if (Object.keys(nextSection).length === 0) {
    delete next[sectionId];
  } else {
    next[sectionId] = nextSection;
  }

  return next;
};

/**
 * Clears the missing config validation error when configuration is added to a section
 */
export const clearMissingConfigError = (
  sectionId: string,
  currentErrors: SectionValidationErrors
): SectionValidationErrors => {
  const existing = currentErrors[sectionId];
  if (!existing || !existing.missingConfig) return currentErrors;

  const nextSection = { ...existing };
  delete nextSection.missingConfig;

  const next: SectionValidationErrors = { ...currentErrors };
  if (Object.keys(nextSection).length === 0) {
    delete next[sectionId];
  } else {
    next[sectionId] = nextSection;
  }

  return next;
};
