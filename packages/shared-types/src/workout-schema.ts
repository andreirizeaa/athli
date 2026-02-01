/**
 * Athli Workout Schema - Shared between Web and Mobile Apps
 *
 * CRITICAL: This is the single source of truth for workout data structures.
 * Any changes to this schema MUST be tested on both web and mobile apps.
 *
 * This ensures workouts created on web can be opened on mobile and vice versa.
 */

// ============================================================================
// Core Types
// ============================================================================

export type WorkoutStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Completion status for exercises and sections (3 states)
 */
export type CompletionStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Completion status for individual sets (2 states - no in_progress)
 */
export type SetCompletionStatus = 'not_started' | 'completed';

/**
 * Trackable field with label and prescribed/completed values
 * - label: column type (e.g., 'Reps', 'kg', 'lbs', 'km', 'minutes', 'RIR', etc.)
 * - prescribed: coach target value
 * - completed: client actual value (null until logged)
 */
export type TrackableField = {
  label: string;
  prescribed: string | null;
  completed: string | null;
};

/**
 * Exercise IDs
 * - prescribedExerciseId: coach-selected exercise id
 * - performedExerciseId: client-performed exercise id (null => same as prescribed)
 */
export type ExerciseIdPair = {
  prescribedExerciseId: string;
  performedExerciseId: string | null;
};

/**
 * Dropset stage with trackable fields
 */
export type DropsetStage = {
  trackableField1: TrackableField;
  trackableField2: TrackableField;
  completed: SetCompletionStatus;
};

export type DropsetPayload = {
  stages: DropsetStage[];
};

/**
 * Set payload - unified structure for all exercise types
 */
export type SetPayload = {
  setNumber: number;
  type: 'warmUp' | 'normal' | 'failure' | 'dropset';
  restSec: number | null;
  completed: SetCompletionStatus;
  skipped: boolean;
  trackableField1: TrackableField;
  trackableField2: TrackableField;
  dropset: DropsetPayload | null;
};

/**
 * Round exercise payload (for AMRAP / Timed sections)
 */
export type RoundExercisePayload = ExerciseIdPair & {
  id: string; // Instance ID - unique for this specific exercise instance in the workout/section
  notes: string | null;
  completed: CompletionStatus;
  eachSide: boolean;
  tempo: string | null;
  trackableField1: TrackableField;
  trackableField2: TrackableField;
  restSec: number | null;
  alternatives: string[];
  supersetId: string | null; // References the instance ID (id field) of another exercise in the superset
  column1Label: string;
  column2Label: string;
};

/**
 * Regular section exercise (with sets)
 */
export type RegularExercisePayload = ExerciseIdPair & {
  id: string; // Instance ID - unique for this specific exercise instance in the workout/section
  sets: SetPayload[];
  alternatives: string[];
  notes: string | null;
  supersetId: string | null; // References the instance ID (id field) of another exercise in the superset
  eachSide: boolean;
  tempo: string | null;
  column1Label: string;
  column2Label: string;
  completed: CompletionStatus; // Derived from sets: not_started -> in_progress -> completed
};

// ============================================================================
// Section Types
// ============================================================================

export type SectionType = 'regular' | 'amrap' | 'tabata' | 'hiit' | 'emom' | 'circuits' | 'auxiliary';
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
  notes: string | null;
  completed: CompletionStatus;
};

export type AmrapSectionPayload = {
  id: string;
  name: string;
  type: 'amrap';
  durationSec: number;
  roundsCompleted: number | null;
  exercises: RoundExercisePayload[];
  notes: string | null;
  completed: CompletionStatus;
};

/**
 * Interval-based sections: exactly one set per exercise
 */
export type CircuitExercisePayload = Omit<RegularExercisePayload, 'sets' | 'completed'> & {
  set: SetPayload;
  completed: CompletionStatus; // Derived from set completion
};

export type CircuitExerciseGroupPayload = {
  isSuperset: boolean;
  exercises: CircuitExercisePayload[];
};

export type TabataSectionPayload = {
  id: string;
  name: string;
  type: 'tabata';
  workSec: number;
  restSec: number;
  rounds: number;
  completedRounds: number; // Tracks which round user is on for resume
  exercises: CircuitExerciseGroupPayload[];
  notes: string | null;
  completed: CompletionStatus;
};

export type HiitSectionPayload = {
  id: string;
  name: string;
  type: 'hiit';
  workSec: number;
  restSec: number;
  rounds: number;
  completedRounds: number; // Tracks which round user is on for resume
  exercises: CircuitExerciseGroupPayload[];
  notes: string | null;
  completed: CompletionStatus;
};

export type EmomSectionPayload = {
  id: string;
  name: string;
  type: 'emom';
  intervalSec: number;
  durationMin: number;
  completedRounds: number; // Tracks which round user is on for resume
  exercises: CircuitExerciseGroupPayload[];
  notes: string | null;
  completed: CompletionStatus;
};

export type CircuitsSectionPayload = {
  id: string;
  name: string;
  type: 'circuits';
  rounds: number;
  completedRounds: number; // Tracks which round user is on for resume
  exercises: CircuitExerciseGroupPayload[];
  notes: string | null;
  completed: CompletionStatus;
};

export type AuxiliarySectionPayload = {
  id: string;
  name: string;
  type: 'auxiliary';
  category: AuxiliaryCategory;
  exercises: ExerciseGroupPayload[];
  notes: string | null;
  completed: CompletionStatus;
};

export type WorkoutSectionPayload =
  | RegularSectionPayload
  | AmrapSectionPayload
  | TabataSectionPayload
  | HiitSectionPayload
  | EmomSectionPayload
  | CircuitsSectionPayload
  | AuxiliarySectionPayload;

// ============================================================================
// Workout Metadata
// ============================================================================

/**
 * Pre-workout user inputs (1-5 scale)
 */
export type WorkoutPre = {
  sleep: number | null;     // 1-5 scale
  mood: number | null;      // 1-5 scale
  energy: number | null;    // 1-5 scale
  stress: number | null;    // 1-5 scale
  soreness: number | null;  // 1-5 scale
};

/**
 * Post-workout user inputs and stats
 */
export type WorkoutPost = {
  rating: number | null;
  intensity: number | null;
  sessionComments: string | null;
};

/**
 * System managed execution metadata
 */
export type WorkoutMeta = {
  status: WorkoutStatus;
  startedAt: string | null;
  completedAt: string | null;
  totalDurationMin: number | null;
  totalWeightLifted: number | null;
  pausedAt: string | null;
  totalPausedMs: number;
};

export type WorkoutDetails = {
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  totalExercises: number;
};

// ============================================================================
// Workout Item and Payload Types
// ============================================================================

/**
 * A workout item can be a top-level exercise or a section
 */
export type WorkoutItem =
  | { itemType: 'exercise'; data: RegularExercisePayload }
  | { itemType: 'section'; data: WorkoutSectionPayload };

/**
 * Workout program payload for API communication
 * Uses items array instead of sections for flexible structure
 */
export type WorkoutProgramPayload = {
  id: string | null;
  name: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  totalExercises: number;
  items: WorkoutItem[];
  pre: WorkoutPre;
  post: WorkoutPost;
  completedSummary: WorkoutMeta;
};

export type WorkoutData = {
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  totalExercises: number;
  items: WorkoutItem[];
  pre: WorkoutPre;
  post: WorkoutPost;
  completedSummary: WorkoutMeta;
};

export type WorkoutPayload = WorkoutData & {
  id: string | null;
  name: string;
};

// ============================================================================
// Default Values and Helper Functions
// ============================================================================

export const DEFAULT_EXECUTION_FIELDS: Pick<WorkoutData, 'pre' | 'post' | 'completedSummary'> = {
  pre: {
    sleep: null,
    mood: null,
    energy: null,
    stress: null,
    soreness: null
  },
  post: {
    rating: null,
    intensity: null,
    sessionComments: null,
  },
  completedSummary: {
    status: 'not_started' as const,
    startedAt: null,
    completedAt: null,
    totalDurationMin: null,
    totalWeightLifted: null,
    pausedAt: null,
    totalPausedMs: 0,
  },
};

/**
 * Helper to create a default trackable field
 */
export const createTrackableField = (label: string, prescribed: string | null = null): TrackableField => ({
  label,
  prescribed,
  completed: null,
});

/**
 * Helper to create a default set
 */
export const createDefaultSet = (
  setNumber: number,
  column1Label: string,
  column2Label: string
): SetPayload => ({
  setNumber,
  type: 'normal',
  restSec: null,
  completed: 'not_started',
  skipped: false,
  trackableField1: createTrackableField(column1Label),
  trackableField2: createTrackableField(column2Label),
  dropset: null,
});

// ============================================================================
// Completion Status Helper Functions
// ============================================================================

/**
 * Helper to derive exercise completion status from its sets
 * - not_started: no sets completed
 * - in_progress: some sets completed
 * - completed: all sets completed
 */
export const deriveExerciseStatus = (sets: SetPayload[]): CompletionStatus => {
  if (sets.length === 0) return 'not_started';

  const completedCount = sets.filter(s => s.completed === 'completed').length;

  if (completedCount === 0) return 'not_started';
  if (completedCount === sets.length) return 'completed';
  return 'in_progress';
};

/**
 * Helper to derive section completion status from exercises
 */
export const deriveSectionStatus = (
  completedCount: number,
  totalCount: number
): CompletionStatus => {
  if (completedCount === 0) return 'not_started';
  if (completedCount === totalCount) return 'completed';
  return 'in_progress';
};

/**
 * Helper to derive interval section status from completed rounds
 */
export const deriveIntervalSectionStatus = (
  completedRounds: number,
  totalRounds: number
): CompletionStatus => {
  if (completedRounds === 0) return 'not_started';
  if (completedRounds >= totalRounds) return 'completed';
  return 'in_progress';
};

/**
 * Migration helper: Convert boolean completed to CompletionStatus
 * Used for backward compatibility with existing data
 */
export const migrateSetCompletionBoolean = (
  completed: boolean | SetCompletionStatus
): SetCompletionStatus => {
  if (typeof completed === 'boolean') {
    return completed ? 'completed' : 'not_started';
  }
  return completed;
};

/**
 * Migration helper: Convert boolean completed to CompletionStatus
 * Used for backward compatibility with existing data
 */
export const migrateCompletionBoolean = (
  completed: boolean | CompletionStatus
): CompletionStatus => {
  if (typeof completed === 'boolean') {
    return completed ? 'completed' : 'not_started';
  }
  return completed;
};

/**
 * Check if a trackable field is optional (should not be marked as completed)
 * Optional when label is 'Optional' AND no prescribed value
 */
export const isOptionalField = (field: TrackableField): boolean => {
  return field.label === 'Optional' && field.prescribed === null;
};
