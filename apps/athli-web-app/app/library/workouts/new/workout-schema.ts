export type ExerciseType = 'weight_reps' | 'reps' | 'distance_duration';

/**
 * Common rest field shared by all exercise metric variants.
 */
type BaseMetrics = {
  restSec: number | null;
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
 */
export type RoundExercisePayload = {
  id: string;
  name: string;
} & (WeightRepsMetrics | RepsMetrics | DistanceDurationMetrics);

/**
 * Dropset representation – each stage may specify weight and/or reps.
 * Presence of `dropset` implies the set is a dropset; there is no
 * separate `isDropset` flag or parallel arrays.
 */
export type DropsetStage = {
  weight?: number;
  reps?: number;
};

type BaseSet = {
  setNumber: number;
  restSec: number | null;
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
export type RegularExercisePayload = {
  id: string;
  name: string;
  exerciseType: ExerciseType;
  sets: SetPayload[];
  alternatives?: string[]; // Array of exercise IDs for alternative exercises
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
  // Regular sections contain exercise groups. For tri-sets / giant-sets,
  // isSuperset is true and the exercises array has 2+ items. For single
  // exercises, isSuperset is false and exercises has exactly 1 item.
  exercises: ExerciseGroupPayload[];
};

export type AmrapSectionPayload = {
  id: string;
  type: 'amrap';
  durationSec: number;
  exercises: RoundExercisePayload[];
};

export type TimedSectionPayload = {
  id: string;
  type: 'timed';
  targetRounds: number;
  exercises: RoundExercisePayload[];
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
  targetRounds: number;
  exercises: CircuitExerciseGroupPayload[];
};

export type AuxiliarySectionPayload = {
  id: string;
  type: 'auxiliary';
  category: AuxiliaryCategory; // 'warmup' | 'cooldown' | 'mobility'
  // Auxiliary sections act like regular sections with sets
  exercises: ExerciseGroupPayload[];
};

export type WorkoutSectionPayload =
  | RegularSectionPayload
  | AmrapSectionPayload
  | TimedSectionPayload
  | CircuitsSectionPayload
  | AuxiliarySectionPayload;

export type WorkoutProgramPayload = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  sections: WorkoutSectionPayload[];
};
