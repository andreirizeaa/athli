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
  tempo?: string;           // Exercise-level tempo (x-x-x-x format)
  column1Label?: string;    // Column 1 label (Reps, seconds, km, etc.)
  column2Label?: string;    // Column 2 label (kg, lbs, feet, etc.)
};

/**
 * Section type for the builder UI
 */
export type WorkoutSection = {
  id: string;
  name?: string;
  type: 'regular' | 'amrap' | 'tabata' | 'hiit' | 'emom' | 'auxiliary';
  exercises?: ExerciseWithSuperset[];
  roundDurationSec?: number;  // AMRAP
  workSec?: number;           // Tabata/HIIT
  restSec?: number;           // Tabata/HIIT
  rounds?: number;            // Tabata/HIIT
  intervalSec?: number;       // EMOM
  durationMin?: number;       // EMOM
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
  tempo?: boolean;
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
