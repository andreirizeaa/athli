export type ExerciseType = 'weight_reps' | 'reps' | 'distance_duration';

/**
 * Workout execution status
 */
export type WorkoutStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Numeric metric pairs:
 * - prescribed: coach target
 * - completed: client actual (null until logged)
 */
export type MetricNumber = {
  prescribed: number;
  completed: number | null;
};

/**
 * Always-present optional metric (no undefined):
 * value may be null when not applicable / not set.
 */
export type OptionalMetric = {
  prescribed: number | null;
  completed: number | null;
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
 * Common rest/type field shared by all exercise metric variants.
 * Always present:
 * - type can be null if not used
 */
type BaseMetrics = {
  type: 'warmUp' | 'normal' | 'failure' | 'dropset' | null;
  restSec: number | null;
};

/**
 * -----------------------
 * Round (AMRAP / Timed)
 * -----------------------
 * One completion boolean at the payload level:
 * RoundExercisePayload.completed
 */
type WeightRepsRoundIncomplete = BaseMetrics & {
  exerciseType: 'weight_reps';
  weight: { prescribed: number; completed: null };
  reps: { prescribed: number; completed: null };
};

type WeightRepsRoundComplete = BaseMetrics & {
  exerciseType: 'weight_reps';
  weight: { prescribed: number; completed: number };
  reps: { prescribed: number; completed: number };
};

type RepsRoundIncomplete = BaseMetrics & {
  exerciseType: 'reps';
  reps: { prescribed: number; completed: null };
};

type RepsRoundComplete = BaseMetrics & {
  exerciseType: 'reps';
  reps: { prescribed: number; completed: number };
};

type DistanceDurationRound = BaseMetrics & {
  exerciseType: 'distance_duration';
  distance: OptionalMetric;
  durationSec: OptionalMetric;
};

/**
 * Round-level exercise payload:
 * - stable local id
 * - swaps supported
 * - notes always present (nullable)
 */
export type RoundExercisePayload =
  | (ExerciseIdPair & {
    notes: string | null;
    completed: false;
    tempo: string | null;
    rpe: string | null;
    heartRateZone: string | null;
    eachSide: boolean;
  } & (WeightRepsRoundIncomplete | RepsRoundIncomplete | DistanceDurationRound))
  | (ExerciseIdPair & {
    notes: string | null;
    completed: true;
    tempo: string | null;
    rpe: string | null;
    heartRateZone: string | null;
    eachSide: boolean;
  } & (WeightRepsRoundComplete | RepsRoundComplete | DistanceDurationRound));

/**
 * -----------------------
 * Dropset
 * -----------------------
 * Stages always have weight/reps objects (nullable values),
 * so payload shape is stable.
 */
export type DropsetStage = {
  weight: OptionalMetric;
  reps: OptionalMetric;
  completed: boolean;
};

export type DropsetPayload = {
  stages: DropsetStage[];
};

/**
 * -----------------------
 * Sets (Regular / Circuits / Auxiliary)
 * -----------------------
 * One completion boolean here: BaseSet.completed
 * All fields always present; dropset is null unless type === 'dropset'
 */
type BaseSet = {
  setNumber: number;
  type: 'warmUp' | 'normal' | 'failure' | 'dropset';
  restSec: number | null;
  completed: boolean;
  skipped: boolean;
  optional: string | null;   // Optional column 1 value (Tempo, RPE, RIR, etc.)
  optional2: string | null;  // Optional column 2 value
};

type WeightRepsSetCommon = BaseSet & {
  exerciseType: 'weight_reps';
  weight: MetricNumber;
  reps: MetricNumber;
  leftReps?: MetricNumber;
  rightReps?: MetricNumber;
};

type WeightRepsSetNonDropset = WeightRepsSetCommon & {
  type: 'warmUp' | 'normal' | 'failure';
  dropset: null;
};

type WeightRepsSetDropset = WeightRepsSetCommon & {
  type: 'dropset';
  dropset: DropsetPayload;
  leftDropset?: DropsetPayload;
  rightDropset?: DropsetPayload;
};

type RepsSetCommon = BaseSet & {
  exerciseType: 'reps';
  reps: MetricNumber;
  leftReps?: MetricNumber;
  rightReps?: MetricNumber;
};

type RepsSetNonDropset = RepsSetCommon & {
  type: 'warmUp' | 'normal' | 'failure';
  dropset: null;
};

type RepsSetDropset = RepsSetCommon & {
  type: 'dropset';
  dropset: DropsetPayload;
  leftDropset?: DropsetPayload;
  rightDropset?: DropsetPayload;
};

type DistanceDurationSet = BaseSet & {
  exerciseType: 'distance_duration';
  distance: OptionalMetric;
  durationSec: OptionalMetric;
  dropset: null; // never relevant for distance_duration
};

/**
 * Completion strictness:
 * If you want TS to enforce that completed sets must have numeric completed values,
 * we can additionally split WeightRepsSet / RepsSet into completed:true/false variants.
 * (Right now this keeps payload stable & simple; enforce invariants in runtime validation.)
 */
export type WeightRepsSet = WeightRepsSetNonDropset | WeightRepsSetDropset;
export type RepsSet = RepsSetNonDropset | RepsSetDropset;

export type SetPayload = WeightRepsSet | RepsSet | DistanceDurationSet;

/**
 * Regular section exercise (with sets)
 * - uses ExerciseIdPair for identification
 * - alternatives always present (can be empty)
 */
export type RegularExercisePayload = ExerciseIdPair & {
  exerciseType: ExerciseType;
  sets: SetPayload[];
  alternatives: string[];
  notes: string | null;
  supersetId: string | null;
  tempo: string | null;
  rpe: string | null;
  heartRateZone: string | null;
  eachSide: boolean;
  optionalColumnType: string | null;
  optionalColumnType2: string | null;
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
  notes: string | null;
};

export type AmrapSectionPayload = {
  id: string;
  name: string;
  type: 'amrap';
  durationSec: number;
  actualDurationSec: number | null;
  roundsCompleted: number | null;
  exercises: RoundExercisePayload[];
  notes: string | null;
};

export type TimedSectionPayload = {
  id: string;
  name: string;
  type: 'timed';
  targetRounds: number;
  actualRounds: number | null;
  totalDurationSec: number | null;
  exercises: RoundExercisePayload[];
  notes: string | null;
};

/**
 * Circuits: exactly one set per exercise.
 */
export type CircuitExercisePayload = Omit<RegularExercisePayload, 'sets'> & {
  set: SetPayload;
  notes: string | null;
};

export type CircuitExerciseGroupPayload = {
  isSuperset: boolean;
  exercises: CircuitExercisePayload[];
};

export type CircuitsSectionPayload = {
  id: string;
  name: string;
  type: 'circuits';
  targetRounds: number;
  actualRounds: number | null;
  totalDurationSec: number | null;
  exercises: CircuitExerciseGroupPayload[];
  notes: string | null;
};

export type AuxiliarySectionPayload = {
  id: string;
  name: string;
  type: 'auxiliary';
  category: AuxiliaryCategory;
  exercises: ExerciseGroupPayload[];
  notes: string | null;
};

export type WorkoutSectionPayload =
  | RegularSectionPayload
  | AmrapSectionPayload
  | TimedSectionPayload
  | CircuitsSectionPayload
  | AuxiliarySectionPayload;

/**
 * A workout item can be either:
 * - An exercise (top-level, possibly in supersets)
 * - A section containing exercises
 */
export type WorkoutItem =
  | { itemType: 'exercise'; data: RegularExercisePayload }
  | { itemType: 'section'; data: WorkoutSectionPayload };

/**
 * Pre-workout user inputs
 */
export type WorkoutPre = {
  readiness: number | null; // 0-10
};

/**
 * Post-workout user inputs and stats
 */
export type WorkoutPost = {
  rating: number | null; // 1-5
  intensity: number | null; // 0-10
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
};

export type WorkoutDetails = {
  description: string;
  type: string;
  difficulty: string;
  equipment: string[]; // empty allowed
  totalExercises: number;
};

export type WorkoutData = {
  description: string;
  type: string;
  difficulty: string;
  equipment: string[]; // empty allowed
  totalExercises: number;
  items: WorkoutItem[];
  pre: WorkoutPre;
  post: WorkoutPost;
  completedSummary: WorkoutMeta;
};

export type WorkoutPayload = WorkoutData & {
  id: string | null; // always present, null when not saved yet
  name: string;
};

// Legacy aliases
export type WorkoutProgramPayload = WorkoutPayload;

export const DEFAULT_EXECUTION_FIELDS: Pick<WorkoutData, 'pre' | 'post' | 'completedSummary'> = {
  pre: { readiness: null },
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
  },
};
