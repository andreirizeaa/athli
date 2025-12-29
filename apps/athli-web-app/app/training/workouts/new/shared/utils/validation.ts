import type { SetData } from '../../components/exercise-card';
import type {
  SetFieldValidation,
  ValidationErrors,
  SectionValidationErrors,
  SectionValidation,
  WorkoutSchema,
  ExerciseWithSuperset,
} from '../types/workout-builder.types';

/**
 * Recomputes validation errors for a single exercise based on its sets
 *
 * @param exerciseInstanceId - The instance ID of the exercise
 * @param exerciseType - The type of exercise (weight_reps, reps, or distance_duration)
 * @param sets - The sets data for the exercise
 * @param hasAttemptedSave - Whether the user has attempted to save (controls when validation is shown)
 * @param currentErrors - The current validation errors state
 * @returns Updated validation errors
 */
export const recomputeExerciseValidation = (
  exerciseInstanceId: string,
  exerciseType: 'weight_reps' | 'reps' | 'distance_duration',
  sets: SetData[] | undefined,
  hasAttemptedSave: boolean,
  currentErrors: ValidationErrors
): ValidationErrors => {
  // Do not show validation until the user has clicked Save at least once
  if (!hasAttemptedSave) {
    return currentErrors;
  }

  const next: ValidationErrors = { ...currentErrors };
  const exerciseErrors: Record<number, SetFieldValidation> = {};

  if (sets && sets.length > 0) {
    sets.forEach((set, index) => {
      const setErrors: SetFieldValidation = {};

      const hasRest = !!set.rest && set.rest.trim() !== '';
      if (!hasRest) {
        setErrors.rest = true;
      }

      if (exerciseType === 'distance_duration') {
        const hasDistance = !!set.distance && set.distance.trim() !== '';
        const hasDuration = !!set.duration && set.duration.trim() !== '';

        if (!hasDistance && !hasDuration) {
          setErrors.distance = true;
          setErrors.duration = true;
        }
      } else {
        if (set.type === 'dropset') {
          // For dropsets, at least one drop stage is required in reps or weight
          const hasReps = !!set.reps && set.reps.trim() !== '';
          const hasWeight =
            exerciseType === 'weight_reps' && !!set.weight && set.weight.trim() !== '';
          if (!hasReps && !hasWeight) {
            setErrors.reps = true;
            if (exerciseType === 'weight_reps') {
              setErrors.weight = true;
            }
          }
        } else {
          // Reps are required only for normal/warmUp (not dropset or failure)
          if (set.type !== 'failure') {
            const hasReps = !!set.reps && set.reps.trim() !== '';
            if (!hasReps) {
              setErrors.reps = true;
            }
          }

          // Weight is required for all weight_reps sets except dropsets
          if (exerciseType === 'weight_reps') {
            const hasWeight = !!set.weight && set.weight.trim() !== '';
            if (!hasWeight) {
              setErrors.weight = true;
            }
          }
        }
      }

      if (Object.keys(setErrors).length > 0) {
        exerciseErrors[index] = setErrors;
      }
    });
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
 *
 * @param exerciseInstanceId - The instance ID of the exercise
 * @param setIndex - The index of the set
 * @param field - The field to clear the error for
 * @param currentErrors - The current validation errors state
 * @returns Updated validation errors
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
 */
const validateExercise = (
  exercise: ExerciseWithSuperset,
  nextErrors: ValidationErrors
): void => {
  const sets = exercise.sets || [];

  sets.forEach((set, index) => {
    const setErrors: SetFieldValidation = {};

    const hasRest = !!set.rest && set.rest.trim() !== '';
    if (!hasRest) {
      setErrors.rest = true;
    }

    if (exercise.exerciseType === 'distance_duration') {
      const hasDistance = !!set.distance && set.distance.trim() !== '';
      const hasDuration = !!set.duration && set.duration.trim() !== '';

      if (!hasDistance && !hasDuration) {
        setErrors.distance = true;
        setErrors.duration = true;
      }
    } else {
      if (set.type === 'dropset') {
        // For dropsets, at least one drop stage is required in reps or weight
        const hasReps = !!set.reps && set.reps.trim() !== '';
        const hasWeight =
          exercise.exerciseType === 'weight_reps' && !!set.weight && set.weight.trim() !== '';
        if (!hasReps && !hasWeight) {
          setErrors.reps = true;
          if (exercise.exerciseType === 'weight_reps') {
            setErrors.weight = true;
          }
        }
      } else {
        // Reps required only for non-dropset, non-failure sets
        if (set.type !== 'failure') {
          const hasReps = !!set.reps && set.reps.trim() !== '';
          if (!hasReps) {
            setErrors.reps = true;
          }
        }

        // Weight required for all weight_reps sets except dropsets
        if (exercise.exerciseType === 'weight_reps') {
          const hasWeight = !!set.weight && set.weight.trim() !== '';
          if (!hasWeight) {
            setErrors.weight = true;
          }
        }
      }
    }

    if (Object.keys(setErrors).length > 0) {
      if (!nextErrors[exercise.instanceId]) {
        nextErrors[exercise.instanceId] = {};
      }
      nextErrors[exercise.instanceId][index] = setErrors;
    }
  });
};

/**
 * Validates the entire workout schema and returns all validation errors
 *
 * @param workoutSchema - The workout schema to validate
 * @returns An object containing exercise validation errors and section validation errors
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
 *
 * @param sectionId - The ID of the section
 * @param currentErrors - The current section validation errors
 * @returns Updated section validation errors
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
 *
 * @param sectionId - The ID of the section
 * @param currentErrors - The current section validation errors
 * @returns Updated section validation errors
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
