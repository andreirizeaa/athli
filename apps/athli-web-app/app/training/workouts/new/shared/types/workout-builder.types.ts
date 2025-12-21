import type { Exercise } from '@/lib/general/exercise-search';
import type { SetData } from '../../components/exercise-card';

/**
 * Exercise extended with superset grouping and instance tracking
 */
export type ExerciseWithSuperset = Exercise & {
  supersetGroupId?: string | null;
  instanceId: string;
  sets?: SetData[];
  alternatives?: string[]; // Array of exercise IDs for alternative exercises
};

/**
 * Workout schema used in the builder UI
 */
export type WorkoutSchema = {
  sections: Array<{
    id: string;
    type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';
    exercises?: ExerciseWithSuperset[];
    roundDurationSec?: number;
    targetRounds?: number;
    category?: 'warmup' | 'cooldown' | 'mobility';
  }>;
};

/**
 * Workout metadata
 */
export type WorkoutMeta = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
};

/**
 * Validation errors for individual set fields
 */
export type SetFieldValidation = {
  reps?: boolean;
  weight?: boolean;
  distance?: boolean;
  duration?: boolean;
  rest?: boolean;
};

/**
 * Validation errors for exercises (keyed by instanceId, then set index)
 */
export type ValidationErrors = Record<string, Record<number, SetFieldValidation>>;

/**
 * Validation errors for sections
 */
export type SectionValidation = {
  missingConfig?: boolean;
  emptyExercises?: boolean;
};

/**
 * Validation errors for sections (keyed by section ID)
 */
export type SectionValidationErrors = Record<string, SectionValidation>;
