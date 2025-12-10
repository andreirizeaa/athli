export type ExerciseType = 'weight_reps' | 'reps' | 'distance_duration';

export type SetPayload = {
  setNumber: number;
  isDropset: boolean;
  weight: number | null;
  reps: number | null;
  distance: number | null;
  durationSec: number | null;
  restSec: number | null;
  // For dropsets, these contain one entry per stage; for normal sets they are null.
  weightStages: number[] | null;
  repStages: number[] | null;
};

// Regular section exercise (with sets)
export type RegularExercisePayload = {
  id: string;
  name: string;
  exerciseType: ExerciseType;
  sets: SetPayload[];
};

// AMRAP / Timed round exercise (no sets, flat metrics only)
export type RoundExercisePayload = {
  id: string;
  name: string;
  exerciseType: ExerciseType;
  weight: number | null;
  reps: number | null;
  distance: number | null;
  durationSec: number | null;
  restSec: number | null;
};

export type SectionType = 'regular' | 'amrap' | 'timed';

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

export type WorkoutSectionPayload =
  | RegularSectionPayload
  | AmrapSectionPayload
  | TimedSectionPayload;

export type WorkoutProgramPayload = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  sections: WorkoutSectionPayload[];
};
