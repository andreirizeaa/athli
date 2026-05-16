/**
 * AI Payload Transformer (Mobile)
 * Transforms simplified AI payloads to full API format for saving.
 * Port of apps/web/lib/ai-payload-transformer.ts
 */

// ── UUID ───────────────────────────────────────────────────────────

function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── AI Types (what the AI generates) ───────────────────────────────

export interface AIWorkoutPayload {
  name: string;
  description?: string;
  type?: 'strength' | 'hypertrophy' | 'conditioning' | 'cardio' | 'mobility';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  totalExercises?: number;
  sections: AISection[];
}

export interface AISection {
  name: string;
  type?: 'regular' | 'superset' | 'circuit' | 'amrap';
  exercises: AIExercise[];
}

export interface AIExercise {
  prescribedExerciseId?: string;
  name: string;
  category?: string;
  sets?: number;
  column1Label?: string;
  column1Value?: string;
  column2Label?: string;
  column2Value?: string | null;
  rest?: number | null;
  notes?: string | null;
  reps?: string;
  weight?: string | null;
}

// ── API Types (what the backend expects) ───────────────────────────

export interface APIWorkoutPayload {
  name: string;
  description: string;
  type: string;
  difficulty: string;
  equipment: string[];
  items: APIWorkoutItem[];
  pre: Record<string, null>;
  post: Record<string, null | string>;
  completedSummary: Record<string, null | string | number>;
}

export interface APIWorkoutItem {
  itemType: 'section';
  data: APISectionData;
}

export interface APISectionData {
  id: string;
  name: string;
  type: string;
  exercises: APIExerciseGroup[];
  notes: string | null;
  completed: 'not_started' | 'in_progress' | 'completed';
}

export interface APIExerciseGroup {
  isSuperset: boolean;
  exercises: APIExercise[];
}

export interface APIExercise {
  prescribedExerciseId: string | null;
  performedExerciseId: string | null;
  id: string;
  sets: APISet[];
  alternatives: string[];
  notes: string | null;
  supersetId: string | null;
  eachSide: boolean;
  tempo: string | null;
  column1Label: string;
  column2Label: string;
  completed: 'not_started' | 'in_progress' | 'completed';
}

export interface APISet {
  setNumber: number;
  type: 'warmUp' | 'normal' | 'failure' | 'dropset';
  restSec: number | null;
  completed: 'not_started' | 'completed';
  skipped: boolean;
  trackableField1: {
    label: string;
    prescribed: string | null;
    completed: string | null;
  };
  trackableField2: {
    label: string;
    prescribed: string | null;
    completed: string | null;
  };
  dropset: null;
}

// ── Transformers ───────────────────────────────────────────────────

function buildExerciseGroup(exercise: AIExercise): APIExerciseGroup {
  const numSets = exercise.sets || 3;
  const restSeconds = exercise.rest ?? 90;

  const col1Label = exercise.column1Label || 'Reps';
  const col1Value = exercise.column1Value || exercise.reps || '10';
  const col2Label = exercise.column2Label || 'kg';
  const col2Value =
    exercise.column2Value !== undefined ? exercise.column2Value : exercise.weight || null;

  const sets: APISet[] = Array.from({ length: numSets }, (_, index) => ({
    setNumber: index + 1,
    type: 'normal' as const,
    restSec: restSeconds,
    completed: 'not_started' as const,
    skipped: false,
    trackableField1: { label: col1Label, prescribed: col1Value, completed: null },
    trackableField2: { label: col2Label, prescribed: col2Value, completed: null },
    dropset: null,
  }));

  return {
    isSuperset: false,
    exercises: [
      {
        prescribedExerciseId: exercise.prescribedExerciseId || null,
        performedExerciseId: null,
        id: uuid(),
        sets,
        alternatives: [],
        notes: exercise.notes || null,
        supersetId: null,
        eachSide: false,
        tempo: null,
        column1Label: col1Label,
        column2Label: col2Label,
        completed: 'not_started',
      },
    ],
  };
}

/**
 * Transform AI workout payload to full API format
 */
export function transformWorkoutPayload(aiPayload: AIWorkoutPayload): APIWorkoutPayload {
  const items: APIWorkoutItem[] = aiPayload.sections.map((section) => ({
    itemType: 'section' as const,
    data: {
      id: uuid(),
      name: section.name,
      type: section.type || 'regular',
      exercises: section.exercises.map(buildExerciseGroup),
      notes: null,
      completed: 'not_started' as const,
    },
  }));

  return {
    name: aiPayload.name,
    description: aiPayload.description || '',
    type: aiPayload.type || 'strength',
    difficulty: aiPayload.difficulty || 'intermediate',
    equipment: [],
    items,
    pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
    post: { rating: null, intensity: null, sessionComments: '' },
    completedSummary: {
      status: 'not_started',
      startedAt: null,
      completedAt: null,
      totalDurationMin: null,
      totalWeightLifted: null,
      pausedAt: null,
      totalPausedMs: 0,
    },
  };
}

/**
 * Transform AI section payload to API format
 */
export interface AISectionPayload {
  name: string;
  description?: string;
  type?: 'regular' | 'superset' | 'circuit' | 'amrap';
  exercises: AIExercise[];
}

export function transformSectionPayload(aiPayload: AISectionPayload) {
  return {
    name: aiPayload.name,
    description: aiPayload.description || '',
    type: aiPayload.type || 'regular',
    section_data: {
      exercises: aiPayload.exercises.map(buildExerciseGroup),
    },
  };
}

/**
 * Get workout summary from AI payload (for display)
 */
export function getWorkoutSummary(payload: AIWorkoutPayload) {
  const exerciseCount = payload.sections.reduce(
    (sum, section) => sum + section.exercises.length,
    0,
  );
  return {
    exerciseCount,
    sectionCount: payload.sections.length,
    type: payload.type || 'strength',
    difficulty: payload.difficulty || 'intermediate',
  };
}
