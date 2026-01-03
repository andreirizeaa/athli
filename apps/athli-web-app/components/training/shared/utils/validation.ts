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
  currentErrors: ValidationErrors,
  eachSide?: boolean,
  tempo?: string
): ValidationErrors => {
  // Do not show validation until the user has attempted to save at least once
  if (!hasAttemptedSave) {
    return currentErrors;
  }

  const next: ValidationErrors = { ...currentErrors };
  const exerciseErrors: ExerciseValidationError = {};

  // Tempo Validation
  if (tempo && tempo.trim() !== '') {
    const parts = tempo.split('-');
    const isComplete = parts.length === 4 && parts.every(p => p.trim() !== '');
    if (!isComplete) {
      exerciseErrors.tempo = true;
    }
  }

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
          // For dropsets, check that all drop stages have values
          // Dropset values are stored as hyphen-separated strings like "10-8-6"

          if (eachSide) {
            // Each-side dropsets use leftReps and rightReps
            const leftRepsStages = (set.leftReps || '').split('-');
            const rightRepsStages = (set.rightReps || '').split('-');
            const allLeftRepsValid = leftRepsStages.length > 0 && leftRepsStages.every(stage => stage.trim() !== '') && !(leftRepsStages.length === 1 && leftRepsStages[0] === '');
            const allRightRepsValid = rightRepsStages.length > 0 && rightRepsStages.every(stage => stage.trim() !== '') && !(rightRepsStages.length === 1 && rightRepsStages[0] === '');

            if (!allLeftRepsValid || !allRightRepsValid) {
              setErrors.reps = true;
            }

            if (exerciseType === 'weight_reps') {
              // For each-side weight_reps dropsets, also validate left/right weight stages
              const leftWeightStages = (set.leftWeight || '').split('-');
              const rightWeightStages = (set.rightWeight || '').split('-');
              const allLeftWeightValid = leftWeightStages.length > 0 && leftWeightStages.every(stage => stage.trim() !== '') && !(leftWeightStages.length === 1 && leftWeightStages[0] === '');
              const allRightWeightValid = rightWeightStages.length > 0 && rightWeightStages.every(stage => stage.trim() !== '') && !(rightWeightStages.length === 1 && rightWeightStages[0] === '');

              if (!allLeftWeightValid || !allRightWeightValid) {
                setErrors.weight = true;
              }
            }
          } else {
            // Standard dropset (not each-side)
            const repsStages = (set.reps || '').split('-');
            const allRepsValid = repsStages.length > 0 && repsStages.every(stage => stage.trim() !== '');

            if (exerciseType === 'weight_reps') {
              const weightStages = (set.weight || '').split('-');
              const allWeightValid = weightStages.length > 0 && weightStages.every(stage => stage.trim() !== '');

              // Both reps and weight must have all stages filled
              if (!allRepsValid || repsStages.length === 0 || (repsStages.length === 1 && repsStages[0] === '')) {
                setErrors.reps = true;
              }
              if (!allWeightValid || weightStages.length === 0 || (weightStages.length === 1 && weightStages[0] === '')) {
                setErrors.weight = true;
              }
            } else {
              // For reps-only exercises, just validate reps
              if (!allRepsValid || repsStages.length === 0 || (repsStages.length === 1 && repsStages[0] === '')) {
                setErrors.reps = true;
              }
            }
          }
        } else {
          // Reps required only for non-dropset, non-failure sets
          if (set.type !== 'failure') {
            if (eachSide) {
              const leftRepsStr = set.leftReps?.toString() || '';
              const rightRepsStr = set.rightReps?.toString() || '';
              const hasLeftReps = leftRepsStr.trim() !== '';
              const hasRightReps = rightRepsStr.trim() !== '';

              if (!hasLeftReps || !hasRightReps) {
                setErrors.reps = true; // Use 'reps' key for the error signal
              }
            } else {
              const repsStr = set.reps?.toString() || '';
              const hasReps = repsStr.trim() !== '';
              if (!hasReps) {
                setErrors.reps = true;
              }
            }
          }

          // Weight required for all weight_reps sets except dropsets
          if (exerciseType === 'weight_reps') {
            const weightStr = set.weight?.toString() || '';
            const hasWeight = weightStr.trim() !== '';
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
  // Tempo Validation
  if (exercise.tempo && exercise.tempo.trim() !== '') {
    const parts = exercise.tempo.split('-');
    const isComplete = parts.length === 4 && parts.every(p => p.trim() !== '');
    if (!isComplete) {
      if (!nextErrors[exercise.instanceId]) {
        nextErrors[exercise.instanceId] = {};
      }
      nextErrors[exercise.instanceId].tempo = true;
    }
  }

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
        // For dropsets, check that all drop stages have values
        // Dropset values are stored as hyphen-separated strings like "10-8-6"

        if (exercise.eachSide) {
          // Each-side dropsets use leftReps and rightReps
          const leftRepsStages = (set.leftReps || '').split('-');
          const rightRepsStages = (set.rightReps || '').split('-');
          const allLeftRepsValid = leftRepsStages.length > 0 && leftRepsStages.every(stage => stage.trim() !== '') && !(leftRepsStages.length === 1 && leftRepsStages[0] === '');
          const allRightRepsValid = rightRepsStages.length > 0 && rightRepsStages.every(stage => stage.trim() !== '') && !(rightRepsStages.length === 1 && rightRepsStages[0] === '');

          if (!allLeftRepsValid || !allRightRepsValid) {
            setErrors.reps = true;
          }

          if (exercise.exerciseType === 'weight_reps') {
            // For each-side weight_reps dropsets, also validate left/right weight stages
            const leftWeightStages = (set.leftWeight || '').split('-');
            const rightWeightStages = (set.rightWeight || '').split('-');
            const allLeftWeightValid = leftWeightStages.length > 0 && leftWeightStages.every(stage => stage.trim() !== '') && !(leftWeightStages.length === 1 && leftWeightStages[0] === '');
            const allRightWeightValid = rightWeightStages.length > 0 && rightWeightStages.every(stage => stage.trim() !== '') && !(rightWeightStages.length === 1 && rightWeightStages[0] === '');

            if (!allLeftWeightValid || !allRightWeightValid) {
              setErrors.weight = true;
            }
          }
        } else {
          // Standard dropset (not each-side)
          const repsStages = (set.reps || '').split('-');
          const allRepsValid = repsStages.length > 0 && repsStages.every(stage => stage.trim() !== '');

          if (exercise.exerciseType === 'weight_reps') {
            const weightStages = (set.weight || '').split('-');
            const allWeightValid = weightStages.length > 0 && weightStages.every(stage => stage.trim() !== '');

            // Both reps and weight must have all stages filled
            if (!allRepsValid || repsStages.length === 0 || (repsStages.length === 1 && repsStages[0] === '')) {
              setErrors.reps = true;
            }
            if (!allWeightValid || weightStages.length === 0 || (weightStages.length === 1 && weightStages[0] === '')) {
              setErrors.weight = true;
            }
          } else {
            // For reps-only exercises, just validate reps
            if (!allRepsValid || repsStages.length === 0 || (repsStages.length === 1 && repsStages[0] === '')) {
              setErrors.reps = true;
            }
          }
        }
      } else {
        // Reps required only for non-dropset, non-failure sets
        if (set.type !== 'failure') {
          if (exercise.eachSide) {
            const leftRepsStr = set.leftReps?.toString() || '';
            const rightRepsStr = set.rightReps?.toString() || '';
            const hasLeftReps = leftRepsStr.trim() !== '';
            const hasRightReps = rightRepsStr.trim() !== '';

            if (!hasLeftReps || !hasRightReps) {
              setErrors.reps = true;
            }
          } else {
            const repsStr = set.reps?.toString() || '';
            const hasReps = repsStr.trim() !== '';
            if (!hasReps) {
              setErrors.reps = true;
            }
          }
        }

        // Weight required for all weight_reps sets except dropsets
        if (exercise.exerciseType === 'weight_reps') {
          const weightStr = set.weight?.toString() || '';
          const hasWeight = weightStr.trim() !== '';
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
