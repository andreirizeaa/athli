export type ExerciseType = 'weight_reps' | 'reps' | 'distance_duration';

/**
 * Workout execution status
 */
export type WorkoutStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Common rest field shared by all exercise metric variants.
 */
type BaseMetrics = {
  restSec: number | null;
  completed?: boolean; // Whether this particular metric was completed (empty when coach creates)
};

type WeightRepsMetrics = BaseMetrics & {
  exerciseType: 'weight_reps';
  weight: number;
  reps: number;
};

type RepsMetrics = BaseMetrics & {
  exerciseType: 'reps';
  reps: number;
};

type DistanceDurationMetrics = BaseMetrics & {
  exerciseType: 'distance_duration';
  distance?: number;
  durationSec?: number;
};

/**
 * Round-level exercise metrics are now a discriminated union keyed
 * by `exerciseType` so invalid combinations are impossible at the type level.
 * Only stores exerciseId - exercise details are fetched from RapidAPI Exercise DB
 */
export type RoundExercisePayload = {
  id: string;
} & (WeightRepsMetrics | RepsMetrics | DistanceDurationMetrics);

/**
 * Dropset representation – each stage may specify weight and/or reps.
 * Presence of `dropset` implies the set is a dropset; there is no
 * separate `isDropset` flag or parallel arrays.
 */
export type DropsetStage = {
  weight?: number;
  reps?: number;
  completed?: boolean; // Whether this stage was completed (empty when coach creates)
};

type BaseSet = {
  setNumber: number;
  restSec: number | null;
  completed?: boolean; // Whether this set was completed (empty when coach creates)
  skipped?: boolean; // Whether this set was skipped (empty when coach creates)
};

type WeightRepsSet = BaseSet & {
  exerciseType: 'weight_reps';
  weight: number;
  reps: number;
  dropset?: {
    stages: DropsetStage[];
  };
};

type RepsSet = BaseSet & {
  exerciseType: 'reps';
  reps: number;
  dropset?: {
    stages: DropsetStage[];
  };
};

type DistanceDurationSet = BaseSet & {
  exerciseType: 'distance_duration';
  distance?: number;
  durationSec?: number;
};

export type SetPayload = WeightRepsSet | RepsSet | DistanceDurationSet;

// Regular section exercise (with sets)
// Only stores exerciseId - exercise details are fetched from RapidAPI Exercise DB
export type RegularExercisePayload = {
  id: string;
  exerciseType: ExerciseType;
  sets: SetPayload[];
  alternatives?: string[]; // Array of exercise IDs for alternative exercises
  notes?: string; // User notes for this exercise (empty when coach creates)
};

export type SectionType = 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';

export type AuxiliaryCategory = 'warmup' | 'cooldown' | 'mobility';

export type ExerciseGroupPayload = {
  isSuperset: boolean;
  exercises: RegularExercisePayload[];
};

export type RegularSectionPayload = {
  id: string;
  type: 'regular';
  exercises: ExerciseGroupPayload[];
  notes?: string; // User notes for this section (empty when coach creates)
};

export type AmrapSectionPayload = {
  id: string;
  type: 'amrap';
  durationSec: number; // Planned duration
  actualDurationSec?: number; // Actual duration completed (empty when coach creates)
  roundsCompleted?: number; // Number of rounds completed (empty when coach creates)
  exercises: RoundExercisePayload[];
  notes?: string; // User notes (empty when coach creates)
};

export type TimedSectionPayload = {
  id: string;
  type: 'timed';
  targetRounds: number; // Planned rounds
  actualRounds?: number; // Actual rounds completed (empty when coach creates)
  totalDurationSec?: number; // Total time taken (empty when coach creates)
  exercises: RoundExercisePayload[];
  notes?: string; // User notes (empty when coach creates)
};

/**
 * Circuits: exactly one set per exercise. At the payload level we
 * model this explicitly as `set` instead of `sets[]`.
 */
export type CircuitExercisePayload = Omit<RegularExercisePayload, 'sets'> & {
  set: SetPayload;
};

export type CircuitExerciseGroupPayload = {
  isSuperset: boolean;
  exercises: CircuitExercisePayload[];
};

export type CircuitsSectionPayload = {
  id: string;
  type: 'circuits';
  targetRounds: number; // Planned rounds
  actualRounds?: number; // Actual rounds completed (empty when coach creates)
  totalDurationSec?: number; // Total time taken (empty when coach creates)
  exercises: CircuitExerciseGroupPayload[];
  notes?: string; // User notes (empty when coach creates)
};

export type AuxiliarySectionPayload = {
  id: string;
  type: 'auxiliary';
  category: AuxiliaryCategory;
  exercises: ExerciseGroupPayload[];
  notes?: string; // User notes (empty when coach creates)
};

export type WorkoutSectionPayload =
  | RegularSectionPayload
  | AmrapSectionPayload
  | TimedSectionPayload
  | CircuitsSectionPayload
  | AuxiliarySectionPayload;

/**
 * Workout data structure stored in the workout_data JSONB field.
 * Contains only the actual workout structure and execution tracking.
 * Metadata (title, description, type, difficulty, equipment) is stored in table columns.
 */
export type WorkoutData = {
  sections: WorkoutSectionPayload[];

  // Execution tracking (empty when coach creates)
  status?: WorkoutStatus;
  startedAt?: string; // ISO 8601 timestamp
  completedAt?: string; // ISO 8601 timestamp
  totalDurationMin?: number; // Total workout duration in minutes

  // Session-level metrics (empty when coach creates)
  sessionComments?: string; // User comments for the entire session
  totalWeightLifted?: number; // Total weight lifted in the session (in kg or lbs)
  intensity?: number; // Perceived intensity (0-10 scale)
  readiness?: number; // Pre-workout readiness (0-10 scale)

  // Additional fields
  overallNotes?: string; // User notes for the entire workout
  rating?: number; // User rating (1-5)
};

/**
 * Complete workout payload including metadata.
 * Used for creating/editing workouts in the UI.
 * When sending to backend, metadata fields are sent separately from workout_data.
 */
export type WorkoutPayload = {
  id?: string; // Workout ID (assigned after creation)
  title: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  totalExercises: number; // Total number of exercises across all sections
  sections: WorkoutSectionPayload[];

  // Execution tracking (empty when coach creates)
  status?: WorkoutStatus;
  startedAt?: string; // ISO 8601 timestamp
  completedAt?: string; // ISO 8601 timestamp
  totalDurationMin?: number; // Total workout duration in minutes

  // Session-level metrics (empty when coach creates)
  sessionComments?: string; // User comments for the entire session
  totalWeightLifted?: number; // Total weight lifted in the session (in kg or lbs)
  intensity?: number; // Perceived intensity (0-10 scale)
  readiness?: number; // Pre-workout readiness (0-10 scale)

  // Additional fields
  overallNotes?: string; // User notes for the entire workout
  rating?: number; // User rating (1-5)
};

// Legacy aliases for backwards compatibility
export type WorkoutProgramPayload = WorkoutPayload;

