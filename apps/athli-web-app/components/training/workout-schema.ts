export type ExerciseType = 'weight_reps' | 'reps' | 'distance_duration';

/**
 * Workout execution status
 */
export type WorkoutStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Common rest field shared by all exercise metric variants.
 */
type BaseMetrics = {
  type?: 'warmUp' | 'normal' | 'failure' | 'dropset'; // Matching BaseSet type
  restSec: number | null;
  completed: boolean; // Whether this particular metric was completed (default false)
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
  notes?: string; // User notes for this exercise
} & (WeightRepsMetrics | RepsMetrics | DistanceDurationMetrics);

/**
 * Dropset representation – each stage may specify weight and/or reps.
 * Presence of `dropset` implies the set is a dropset; there is no
 * separate `isDropset` flag or parallel arrays.
 */
export type DropsetStage = {
  weight?: number;
  reps?: number;
  completed: boolean; // Whether this stage was completed (default false)
};

type BaseSet = {
  setNumber: number;
  type: 'warmUp' | 'normal' | 'failure' | 'dropset';
  restSec: number | null;
  completed: boolean; // Whether this set was completed (default false)
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
  supersetId?: string; // Optional superset ID to link exercises
};

export type SectionType = 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';

export type AuxiliaryCategory = 'warmup' | 'cooldown' | 'mobility';

export type ExerciseGroupPayload = {
  isSuperset: boolean;
  exercises: RegularExercisePayload[];
};

export type RegularSectionPayload = {
  id: string;
  name: string;
  type: 'regular';
  exercises: ExerciseGroupPayload[];
  notes?: string; // User notes for this section (empty when coach creates)
};

export type AmrapSectionPayload = {
  id: string;
  name: string;
  type: 'amrap';
  durationSec: number; // Planned duration
  actualDurationSec?: number; // Actual duration completed (empty when coach creates)
  roundsCompleted?: number; // Number of rounds completed (empty when coach creates)
  exercises: RoundExercisePayload[];
  notes?: string; // User notes (empty when coach creates)
};

export type TimedSectionPayload = {
  id: string;
  name: string;
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
  notes?: string;
};

export type CircuitExerciseGroupPayload = {
  isSuperset: boolean;
  exercises: CircuitExercisePayload[];
};

export type CircuitsSectionPayload = {
  id: string;
  name: string;
  type: 'circuits';
  targetRounds: number; // Planned rounds
  actualRounds?: number; // Actual rounds completed (empty when coach creates)
  totalDurationSec?: number; // Total time taken (empty when coach creates)
  exercises: CircuitExerciseGroupPayload[];
  notes?: string; // User notes (empty when coach creates)
};

export type AuxiliarySectionPayload = {
  id: string;
  name: string;
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
 * A workout item can be either:
 * - An exercise group (top-level exercises, possibly in supersets)
 * - A section containing exercises
 */
export type WorkoutItem =
  | { itemType: 'exercise'; data: RegularExercisePayload }
  | { itemType: 'section'; data: WorkoutSectionPayload };

/**
 * Workout data structure stored in the workout_data JSONB field.
 * Includes complete workout information (metadata + execution).
 * All fields are required.
 */
export type WorkoutData = {
  // Metadata
  title: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  totalExercises: number;

  items: WorkoutItem[]; // Mixed array of top-level exercises and sections

  // Execution tracking (set to defaults when coach creates)
  status: WorkoutStatus;
  startedAt: string | null; // ISO 8601 timestamp, null when not started
  completedAt: string | null; // ISO 8601 timestamp, null when not completed
  totalDurationMin: number | null; // Total workout duration in minutes, null when not tracked

  // Session-level metrics (set to defaults when coach creates)
  totalWeightLifted: number | null; // Total weight lifted in the session (in kg or lbs), null when not tracked
  intensity: number | null; // Perceived intensity (0-10 scale), null when not rated
  readiness: number | null; // Pre-workout readiness (0-10 scale), null when not rated

  // Additional fields
  overallNotes: string; // User notes for the entire workout, empty string when none
  rating: number | null; // User rating (1-5), null when not rated
};

/**
 * Complete workout payload including metadata.
 * Used for creating/editing workouts in the UI.
 * Inherits directly from WorkoutData and adds optional ID.
 */
export type WorkoutPayload = WorkoutData & {
  id?: string; // Workout ID (assigned after creation)
};

// Legacy aliases for backwards compatibility
export type WorkoutProgramPayload = WorkoutPayload;

export const DEFAULT_EXECUTION_FIELDS = {
  status: 'not_started' as const,
  startedAt: null,
  completedAt: null,
  totalDurationMin: null,
  totalWeightLifted: null,
  intensity: null,
  readiness: null,
  overallNotes: '',
  rating: null,
};

