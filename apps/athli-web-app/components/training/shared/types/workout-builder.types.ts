import type { Exercise } from '@/api/exercise/exercise-search';
import type { SetData } from '@/components/training/builder/exercise-card';

/**
 * Exercise extended with superset grouping and instance tracking
 */
export type ExerciseWithSuperset = Exercise & {
  supersetGroupId?: string | null;
  instanceId: string;
  sets?: SetData[];
  alternatives?: string[]; // Array of exercise IDs for alternative exercises
  notes?: string;
  eachSide?: boolean;       // Exercise-level each side toggle
  optionalColumnType?: 'Optional' | 'Tempo' | 'RIR' | 'RPE' | 'Heart Rate Zone' | 'Calories' | 'Watts' | 'Pace' | 'Speed' | 'Incline' | 'Height' | 'RPM';
};

/**
 * Section type for the builder UI
 */
export type WorkoutSection = {
  id: string;
  name?: string;
  type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';
  exercises?: ExerciseWithSuperset[];
  roundDurationSec?: number;
  targetRounds?: number;
  category?: 'warmup' | 'cooldown' | 'mobility';
  notes?: string;
  isLoading?: boolean;
};

/**
 * A workout schema item can be either:
 * - A top-level exercise (possibly part of a superset with adjacent exercises)
 * - A section containing exercises
 */
export type WorkoutSchemaItem =
  | { itemType: 'exercise'; exercise: ExerciseWithSuperset }
  | { itemType: 'section'; section: WorkoutSection };

/**
 * Workout schema used in the builder UI
 */
export type WorkoutSchema = {
  items: WorkoutSchemaItem[];
};

/**
 * Workout metadata
 */
export type WorkoutMeta = {
  name: string;
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
 * Validation errors for exercises (keyed by instanceId)
 * Can contain set-level errors (indexed by set number) and/or a supersetMismatch flag
 */
export type ExerciseValidationError = Record<number, SetFieldValidation> & {
  supersetMismatch?: boolean;
};

export type ValidationErrors = Record<string, ExerciseValidationError>;

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
