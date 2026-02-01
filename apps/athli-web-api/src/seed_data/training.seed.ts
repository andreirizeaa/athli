/**
 * Training Seed Data
 * Generates test training data for clients including workouts and history
 *
 * Schema notes:
 * - client_training: PK (client_id, date, coach_id), columns: training_data (JSONB object)
 * - client_training_history: PK (client_id, coach_id, date, workout_id), status only
 */

import {
  TEST_PREFIX,
  randomInRange,
  randomPick,
  formatDate,
  generateUUID,
  generateExerciseInstanceId,
} from './utils';

type WorkoutStatus = 'not_started' | 'in_progress' | 'completed';

// Exercise IDs from exercises.json for realistic workout data
const EXERCISE_IDS = {
  BARBELL_BENCH_PRESS: '3',
  BARBELL_SQUAT: '6',
  PULL_UPS: '19',
  BARBELL_DEADLIFT: '31',
  DUMBBELL_SHOULDER_PRESS: '36',
  BARBELL_ROW: '39',
  DUMBBELL_CURL: '12',
  TRICEP_PUSHDOWN: '15',
  LEG_PRESS: '8',
  LAT_PULLDOWN: '22',
};


/**
 * Create a regular section with exercises having sets array
 */
const createRegularSection = (name: string, exercises: Array<{ exerciseId: string; sets: number; reps: string; rest: number; weight?: string }>) => ({
  itemType: 'section' as const,
  data: {
    id: `sec_regular_${generateUUID()}`,
    name,
    type: 'regular',
    notes: null,
    exercises: exercises.map(ex => ({
      isSuperset: false,
      exercises: [{
        id: generateExerciseInstanceId(ex.exerciseId),
        prescribedExerciseId: ex.exerciseId,
        performedExerciseId: null,
        completed: 'not_started',
        notes: null,
        tempo: null,
        eachSide: false,
        supersetId: null,
        alternatives: [],
        column1Label: 'Reps',
        column2Label: ex.weight ? 'kg' : 'Optional',
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          type: 'normal',
          restSec: ex.rest,
          completed: 'not_started',
          skipped: false,
          dropset: null,
          trackableField1: { label: 'Reps', prescribed: ex.reps, completed: null },
          trackableField2: { label: ex.weight ? 'kg' : 'Optional', prescribed: ex.weight || null, completed: null },
        })),
      }],
    })),
  },
});

/**
 * Create a circuit-type section (circuits, emom, hiit, tabata) with single set per exercise
 */
const createCircuitSection = (
  name: string,
  type: 'circuits' | 'emom' | 'hiit' | 'tabata',
  exercises: Array<{ exerciseId: string; reps: string; rest: number }>,
  config: { rounds?: number; workSec?: number; restSec?: number; durationMin?: number; intervalSec?: number }
) => {
  const baseData: any = {
    id: `sec_${type}_${generateUUID()}`,
    name,
    type,
    notes: null,
    exercises: exercises.map(ex => ({
      isSuperset: false,
      exercises: [{
        id: generateExerciseInstanceId(ex.exerciseId),
        prescribedExerciseId: ex.exerciseId,
        performedExerciseId: null,
        notes: null,
        tempo: null,
        eachSide: false,
        supersetId: null,
        alternatives: [],
        column1Label: 'Reps',
        column2Label: 'Optional',
        set: {
          setNumber: 1,
          type: 'normal',
          restSec: ex.rest,
          completed: 'not_started',
          skipped: false,
          dropset: null,
          trackableField1: { label: 'Reps', prescribed: ex.reps, completed: null },
          trackableField2: { label: 'Optional', prescribed: null, completed: null },
        },
      }],
    })),
  };

  // Add type-specific fields
  if (type === 'circuits') {
    baseData.rounds = config.rounds || 3;
    baseData.actualRounds = null;
  } else if (type === 'emom') {
    baseData.durationMin = config.durationMin || 10;
    baseData.intervalSec = config.intervalSec || 60;
    baseData.actualDurationSec = null;
  } else if (type === 'hiit' || type === 'tabata') {
    baseData.rounds = config.rounds || (type === 'tabata' ? 8 : 10);
    baseData.workSec = config.workSec || (type === 'tabata' ? 20 : 40);
    baseData.restSec = config.restSec || (type === 'tabata' ? 10 : 20);
    baseData.actualRounds = null;
    baseData.totalDurationSec = null;
  }

  return { itemType: 'section' as const, data: baseData };
};

/**
 * Create an AMRAP section with direct exercises (no groups)
 */
const createAmrapSection = (
  name: string,
  exercises: Array<{ exerciseId: string; reps: string; rest: number }>,
  durationSec: number
) => ({
  itemType: 'section' as const,
  data: {
    id: `sec_amrap_${generateUUID()}`,
    name,
    type: 'amrap',
    notes: null,
    durationSec,
    roundsCompleted: null,
    actualDurationSec: null,
    exercises: exercises.map(ex => ({
      id: generateExerciseInstanceId(ex.exerciseId),
      prescribedExerciseId: ex.exerciseId,
      performedExerciseId: null,
      notes: null,
      tempo: null,
      restSec: ex.rest,
      eachSide: false,
      completed: 'not_started',
      supersetId: null,
      alternatives: [],
      column1Label: 'Reps',
      column2Label: 'Optional',
      trackableField1: { label: 'Reps', prescribed: ex.reps, completed: null },
      trackableField2: { label: 'Optional', prescribed: null, completed: null },
    })),
  },
});

/**
 * Workout templates with full section-based structure
 */
const WORKOUT_TEMPLATES = [
  {
    name: 'Push Day',
    items: [
      createRegularSection('Push Exercises', [
        { exerciseId: EXERCISE_IDS.BARBELL_BENCH_PRESS, sets: 4, reps: '8-10', rest: 120, weight: '60' },
        { exerciseId: EXERCISE_IDS.DUMBBELL_SHOULDER_PRESS, sets: 4, reps: '10-12', rest: 90, weight: '20' },
        { exerciseId: EXERCISE_IDS.TRICEP_PUSHDOWN, sets: 3, reps: '12-15', rest: 60, weight: '25' },
      ]),
    ],
  },
  {
    name: 'Pull Day',
    items: [
      createRegularSection('Pull Exercises', [
        { exerciseId: EXERCISE_IDS.BARBELL_DEADLIFT, sets: 4, reps: '5', rest: 180, weight: '100' },
        { exerciseId: EXERCISE_IDS.BARBELL_ROW, sets: 4, reps: '8-10', rest: 90, weight: '60' },
        { exerciseId: EXERCISE_IDS.LAT_PULLDOWN, sets: 3, reps: '10-12', rest: 90, weight: '50' },
        { exerciseId: EXERCISE_IDS.DUMBBELL_CURL, sets: 3, reps: '12-15', rest: 60, weight: '12' },
      ]),
    ],
  },
  {
    name: 'Leg Day',
    items: [
      createRegularSection('Leg Exercises', [
        { exerciseId: EXERCISE_IDS.BARBELL_SQUAT, sets: 4, reps: '6-8', rest: 180, weight: '80' },
        { exerciseId: EXERCISE_IDS.LEG_PRESS, sets: 4, reps: '10-12', rest: 120, weight: '120' },
        { exerciseId: EXERCISE_IDS.BARBELL_DEADLIFT, sets: 3, reps: '8-10', rest: 120, weight: '80' },
      ]),
    ],
  },
  {
    name: 'HIIT Circuit',
    items: [
      createCircuitSection('Circuit', 'circuits', [
        { exerciseId: EXERCISE_IDS.BARBELL_SQUAT, reps: '12', rest: 30 },
        { exerciseId: EXERCISE_IDS.PULL_UPS, reps: '10', rest: 30 },
      ], { rounds: 3 }),
      createCircuitSection('Tabata Finisher', 'tabata', [
        { exerciseId: EXERCISE_IDS.BARBELL_BENCH_PRESS, reps: '15', rest: 10 },
        { exerciseId: EXERCISE_IDS.BARBELL_ROW, reps: '15', rest: 10 },
      ], { rounds: 8, workSec: 20, restSec: 10 }),
    ],
  },
  {
    name: 'Mixed Training',
    items: [
      createRegularSection('Strength', [
        { exerciseId: EXERCISE_IDS.BARBELL_SQUAT, sets: 3, reps: '8-10', rest: 120, weight: '70' },
        { exerciseId: EXERCISE_IDS.BARBELL_BENCH_PRESS, sets: 3, reps: '8-10', rest: 120, weight: '50' },
      ]),
      createAmrapSection('Conditioning', [
        { exerciseId: EXERCISE_IDS.PULL_UPS, reps: '5', rest: 0 },
        { exerciseId: EXERCISE_IDS.DUMBBELL_SHOULDER_PRESS, reps: '10', rest: 0 },
      ], 300),
      createCircuitSection('EMOM Finisher', 'emom', [
        { exerciseId: EXERCISE_IDS.BARBELL_ROW, reps: '10', rest: 0 },
      ], { durationMin: 10, intervalSec: 60 }),
    ],
  },
];

/**
 * Create a workout with full section-based data from a template
 */
const createWorkoutFromTemplate = (template: typeof WORKOUT_TEMPLATES[0], workoutId?: string) => {
  const id = workoutId || generateUUID();
  return {
    id,
    name: `${TEST_PREFIX} ${template.name}`,
    workout_data: {
      items: template.items,
      pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
      post: { rating: null, intensity: null, sessionComments: null },
      completedSummary: {
        status: 'not_started',
        startedAt: null,
        completedAt: null,
        totalDurationMin: null,
        totalWeightLifted: null,
        pausedAt: null,
        totalPausedMs: 0,
      },
    },
  };
};

/**
 * Ensure a workout has proper section/exercise data, recreating if necessary
 */
const ensureWorkoutHasExercises = (workout: { id: string; name: string; workout_data: any }) => {
  // Check if workout has valid section/exercise data
  if (workout.workout_data?.items?.length > 0) {
    const hasValidContent = workout.workout_data.items.some((item: any) => {
      if (item.itemType === 'exercise' && item.data?.sets?.length > 0) {
        return true;
      }
      if (item.itemType === 'section' && item.data?.exercises?.length > 0) {
        return true;
      }
      return false;
    });
    if (hasValidContent) {
      return workout;
    }
  }

  // If no valid content, create from a random template using the workout's id
  const template = randomPick(WORKOUT_TEMPLATES) || WORKOUT_TEMPLATES[0];
  return createWorkoutFromTemplate(template, workout.id);
};

/**
 * Get client training data for past 30 days
 * Creates a mix of completed, incomplete, not started, in progress, and future workouts
 *
 * Schema: client_id, date, coach_id, training_data (JSONB object)
 */
export function getClientTrainingData(
  coachId: string,
  clientId: string,
  workouts: Array<{ id: string; name: string; workout_data: any }>
) {
  const trainingEntries: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ensure all workouts have proper exercise data, or create from templates
  let workoutsToUse: Array<{ id: string; name: string; workout_data: any }>;

  if (workouts.length > 0) {
    // Ensure each workout has valid exercises
    workoutsToUse = workouts.map(w => ensureWorkoutHasExercises(w));
  } else {
    // No workouts provided, create from templates
    workoutsToUse = WORKOUT_TEMPLATES.map(template => createWorkoutFromTemplate(template));
  }

  // Generate training for past 30 days and next 7 days
  for (let dayOffset = -30; dayOffset <= 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = formatDate(date);
    const isPast = dayOffset < 0;
    const isToday = dayOffset === 0;
    const isFuture = dayOffset > 0;

    // Skip some days (rest days) - about 30% chance of rest day
    if (Math.random() < 0.3) {
      continue;
    }

    // Pick a random workout and create a fresh copy with exercises
    const workout = randomPick(workoutsToUse);
    if (!workout) continue;

    // Create a deep copy of workout data to modify
    const workoutData = JSON.parse(JSON.stringify(workout.workout_data));

    // Verify exercises exist in the copied data
    if (!workoutData.items || workoutData.items.length === 0) {
      // This shouldn't happen, but add fallback just in case
      const fallbackTemplate = randomPick(WORKOUT_TEMPLATES) || WORKOUT_TEMPLATES[0];
      const fallbackWorkout = createWorkoutFromTemplate(fallbackTemplate);
      workoutData.items = fallbackWorkout.workout_data.items;
      workoutData.pre = fallbackWorkout.workout_data.pre;
      workoutData.post = fallbackWorkout.workout_data.post;
      workoutData.completedSummary = fallbackWorkout.workout_data.completedSummary;
    }

    let status: WorkoutStatus = 'not_started';
    let startedAt: string | null = null;
    let completedAt: string | null = null;

    if (isPast) {
      // Past workouts: 70% completed, 15% in_progress, 15% not started
      const rand = Math.random();
      if (rand < 0.7) {
        status = 'completed';
        // Mark all exercises as completed
        completeWorkout(workoutData);
        const startTime = new Date(date);
        startTime.setHours(randomInRange(6, 18), randomInRange(0, 59));
        const durationMin = randomInRange(45, 90);
        const endTime = new Date(startTime.getTime() + durationMin * 60000);
        startedAt = startTime.toISOString();
        completedAt = endTime.toISOString();
      } else if (rand < 0.85) {
        status = 'in_progress';
        // Partially complete some exercises
        partiallyCompleteWorkout(workoutData);
        const startTime = new Date(date);
        startTime.setHours(randomInRange(6, 18), randomInRange(0, 59));
        startedAt = startTime.toISOString();
      } else {
        status = 'not_started';
      }
    } else if (isToday) {
      // Today: 50% in progress, 30% not started, 20% completed
      const rand = Math.random();
      if (rand < 0.5) {
        status = 'in_progress';
        partiallyCompleteWorkout(workoutData);
        const startTime = new Date(date);
        startTime.setHours(randomInRange(6, 12), randomInRange(0, 59));
        startedAt = startTime.toISOString();
      } else if (rand < 0.8) {
        status = 'not_started';
      } else {
        status = 'completed';
        completeWorkout(workoutData);
        const startTime = new Date(date);
        startTime.setHours(randomInRange(6, 10), randomInRange(0, 59));
        const durationMin = randomInRange(45, 90);
        const endTime = new Date(startTime.getTime() + durationMin * 60000);
        startedAt = startTime.toISOString();
        completedAt = endTime.toISOString();
      }
    } else if (isFuture) {
      // Future workouts: always not started
      status = 'not_started';
    }

    // Update completedSummary in workout data based on status
    if (workoutData.completedSummary) {
      workoutData.completedSummary.status = status;
      workoutData.completedSummary.startedAt = startedAt;
      workoutData.completedSummary.completedAt = completedAt;
      if (status === 'completed') {
        workoutData.completedSummary.totalDurationMin = randomInRange(45, 90);
        workoutData.completedSummary.totalWeightLifted = randomInRange(1000, 5000);
      }
    }

    // Add pre/post workout data for completed workouts
    if (status === 'completed' && workoutData.pre) {
      workoutData.pre = {
        sleep: randomInRange(5, 9),
        mood: randomInRange(5, 10),
        energy: randomInRange(5, 10),
        stress: randomInRange(1, 7),
        soreness: randomInRange(1, 6),
      };
      workoutData.post = {
        rating: randomInRange(6, 10),
        intensity: randomInRange(6, 10),
        sessionComments: randomPick([
          'Great workout!',
          'Felt strong today.',
          'A bit tired but pushed through.',
          'PR on squats!',
          null,
        ]),
      };
    }

    // Count total exercises in the workout
    let totalExercises = 0;
    if (workoutData.items) {
      for (const item of workoutData.items) {
        if (item.itemType === 'exercise') {
          totalExercises++;
        } else if (item.itemType === 'section' && item.data?.exercises) {
          // Handle different section types
          if (Array.isArray(item.data.exercises)) {
            for (const exerciseOrGroup of item.data.exercises) {
              if (exerciseOrGroup.exercises) {
                // Group with exercises array (circuits, emom, hiit, tabata, regular)
                totalExercises += exerciseOrGroup.exercises.length;
              } else if (exerciseOrGroup.prescribedExerciseId) {
                // Direct exercise (amrap)
                totalExercises++;
              }
            }
          }
        }
      }
    }

    // Create the full workout object structure as expected by the app
    const now = new Date().toISOString();
    const fullWorkoutObject = {
      id: workout.id,
      name: workout.name,
      type: '', // Workout type (optional)
      coach_id: coachId,
      equipment: ['Barbell', 'Dumbbells', 'Bench'],
      created_at: now,
      difficulty: 'intermediate',
      updated_at: now,
      assigned_at: new Date(date).toISOString(),
      assigned_by: coachId,
      description: '',
      is_favourite: false,
      workout_data: workoutData,
      total_exercises: totalExercises,
    };

    // training_data is a JSONB object with workout_1, workout_2, etc. keys
    const trainingDataObject: Record<string, any> = {
      workout_1: fullWorkoutObject,
    };

    trainingEntries.push({
      coach_id: coachId,
      client_id: clientId,
      date: dateStr,
      training_data: trainingDataObject,
      // For internal use in getClientTrainingHistory
      _status: status,
      _workoutId: workout.id,
    });
  }

  return trainingEntries;
}

/**
 * Helper to mark a workout as fully completed
 * Handles all section types: regular, circuits, emom, hiit, tabata, amrap
 */
function completeWorkout(workoutData: any) {
  if (!workoutData.items) return;

  for (const item of workoutData.items) {
    if (item.itemType === 'exercise' && item.data) {
      completeExercise(item.data);
    } else if (item.itemType === 'section' && item.data) {
      const sectionData = item.data;
      const sectionType = sectionData.type;

      if (sectionType === 'amrap') {
        // AMRAP: exercises are directly in the array (not grouped)
        if (Array.isArray(sectionData.exercises)) {
          for (const exercise of sectionData.exercises) {
            completeAmrapExercise(exercise);
          }
        }
        // Set rounds completed
        sectionData.roundsCompleted = randomInRange(3, 8);
        sectionData.actualDurationSec = sectionData.durationSec;
      } else if (sectionType === 'regular') {
        // Regular: exercises in groups with sets array
        if (Array.isArray(sectionData.exercises)) {
          for (const group of sectionData.exercises) {
            if (group.exercises) {
              for (const exercise of group.exercises) {
                completeExercise(exercise);
              }
            }
          }
        }
      } else if (['circuits', 'emom', 'hiit', 'tabata'].includes(sectionType)) {
        // Circuit-type sections: exercises in groups with single set object
        if (Array.isArray(sectionData.exercises)) {
          for (const group of sectionData.exercises) {
            if (group.exercises) {
              for (const exercise of group.exercises) {
                completeCircuitExercise(exercise);
              }
            }
          }
        }
        // Set completion data for circuit-type sections
        if (sectionType === 'circuits') {
          sectionData.actualRounds = sectionData.rounds || 3;
        } else if (sectionType === 'emom') {
          sectionData.actualDurationSec = (sectionData.durationMin || 10) * 60;
        } else if (['hiit', 'tabata'].includes(sectionType)) {
          sectionData.actualRounds = sectionData.rounds || 8;
          sectionData.totalDurationSec = (sectionData.workSec + sectionData.restSec) * sectionData.rounds;
        }
      }
    }
  }
}

/**
 * Helper to complete an AMRAP exercise (direct trackable fields, no sets array)
 */
function completeAmrapExercise(exercise: any) {
  exercise.completed = 'completed';

  // Fill in trackableField1 (e.g., reps)
  if (exercise.trackableField1) {
    const prescribed = exercise.trackableField1.prescribed;
    if (prescribed) {
      const numVal = parseInt(prescribed, 10);
      if (!isNaN(numVal)) {
        exercise.trackableField1.completed = String(numVal + randomInRange(-1, 1));
      } else {
        exercise.trackableField1.completed = prescribed;
      }
    } else {
      exercise.trackableField1.completed = String(randomInRange(8, 12));
    }
  }

  // Fill in trackableField2 (e.g., weight)
  if (exercise.trackableField2) {
    const prescribed = exercise.trackableField2.prescribed;
    if (prescribed) {
      const numVal = parseFloat(prescribed);
      if (!isNaN(numVal)) {
        exercise.trackableField2.completed = String(Math.round(numVal));
      } else {
        exercise.trackableField2.completed = prescribed;
      }
    }
  }
}

/**
 * Helper to complete a circuit-type exercise (has single set object)
 */
function completeCircuitExercise(exercise: any) {
  if (!exercise.set) return;

  const set = exercise.set;
  set.completed = 'completed';
  set.skipped = false;

  // Fill in trackableField1
  if (set.trackableField1) {
    const prescribed = set.trackableField1.prescribed;
    if (prescribed) {
      const numVal = parseInt(prescribed, 10);
      if (!isNaN(numVal)) {
        set.trackableField1.completed = String(numVal + randomInRange(-1, 1));
      } else {
        set.trackableField1.completed = prescribed;
      }
    } else {
      set.trackableField1.completed = String(randomInRange(8, 12));
    }
  }

  // Fill in trackableField2
  if (set.trackableField2) {
    const prescribed = set.trackableField2.prescribed;
    if (prescribed) {
      const numVal = parseFloat(prescribed);
      if (!isNaN(numVal)) {
        set.trackableField2.completed = String(Math.round(numVal));
      } else {
        set.trackableField2.completed = prescribed;
      }
    }
  }
}

/**
 * Helper to mark a workout as partially completed
 * Creates varied states: some exercises completed, some in progress, some not started
 */
function partiallyCompleteWorkout(workoutData: any) {
  if (!workoutData.items) return;

  const numItems = workoutData.items.length;
  const completedCount = Math.floor(numItems * (0.3 + Math.random() * 0.4)); // 30-70% of items completed
  const inProgressCount = Math.min(1, numItems - completedCount); // At least 1 in progress if possible

  for (let i = 0; i < numItems; i++) {
    const item = workoutData.items[i];
    const shouldComplete = i < completedCount;
    const shouldPartial = i >= completedCount && i < completedCount + inProgressCount;

    if (item.itemType === 'exercise' && item.data) {
      if (shouldComplete) {
        completeExercise(item.data);
      } else if (shouldPartial) {
        partiallyCompleteExercise(item.data);
      }
    } else if (item.itemType === 'section' && item.data) {
      const sectionData = item.data;
      const sectionType = sectionData.type;

      if (sectionType === 'amrap') {
        if (shouldComplete && Array.isArray(sectionData.exercises)) {
          for (const exercise of sectionData.exercises) {
            completeAmrapExercise(exercise);
          }
          sectionData.roundsCompleted = randomInRange(2, 5);
          sectionData.actualDurationSec = sectionData.durationSec;
        } else if (shouldPartial && Array.isArray(sectionData.exercises)) {
          // Partially complete AMRAP - only some exercises done
          const completedExercises = Math.ceil(sectionData.exercises.length * 0.5);
          for (let j = 0; j < completedExercises; j++) {
            completeAmrapExercise(sectionData.exercises[j]);
          }
          sectionData.roundsCompleted = randomInRange(1, 3);
        }
      } else if (sectionType === 'regular') {
        if (Array.isArray(sectionData.exercises)) {
          for (const group of sectionData.exercises) {
            if (group.exercises) {
              for (const exercise of group.exercises) {
                if (shouldComplete) {
                  completeExercise(exercise);
                } else if (shouldPartial) {
                  partiallyCompleteExercise(exercise);
                }
              }
            }
          }
        }
      } else if (['circuits', 'emom', 'hiit', 'tabata'].includes(sectionType)) {
        if (Array.isArray(sectionData.exercises)) {
          for (const group of sectionData.exercises) {
            if (group.exercises) {
              for (const exercise of group.exercises) {
                if (shouldComplete) {
                  completeCircuitExercise(exercise);
                } else if (shouldPartial) {
                  partiallyCompleteCircuitExercise(exercise);
                }
              }
            }
          }
        }
        // Set partial completion data
        if (shouldComplete || shouldPartial) {
          if (sectionType === 'circuits') {
            sectionData.actualRounds = shouldComplete ? sectionData.rounds : randomInRange(1, (sectionData.rounds || 3) - 1);
          } else if (sectionType === 'emom') {
            const fullDuration = (sectionData.durationMin || 10) * 60;
            sectionData.actualDurationSec = shouldComplete ? fullDuration : Math.floor(fullDuration * 0.6);
          } else if (['hiit', 'tabata'].includes(sectionType)) {
            sectionData.actualRounds = shouldComplete ? sectionData.rounds : randomInRange(3, (sectionData.rounds || 8) - 2);
          }
        }
      }
    }
  }
}

/**
 * Helper to partially complete a circuit-type exercise
 */
function partiallyCompleteCircuitExercise(exercise: any) {
  if (!exercise.set) return;

  const set = exercise.set;
  // 50% chance of being completed for partial
  if (Math.random() < 0.5) {
    set.completed = 'completed';
    set.skipped = false;

    if (set.trackableField1) {
      const prescribed = set.trackableField1.prescribed;
      if (prescribed) {
        const numVal = parseInt(prescribed, 10);
        if (!isNaN(numVal)) {
          set.trackableField1.completed = String(numVal + randomInRange(-2, 0)); // Slightly less than prescribed
        }
      }
    }
  }
}

/**
 * Helper to partially complete an exercise (some sets done, some not)
 */
function partiallyCompleteExercise(exercise: any) {
  if (!exercise.sets) return;

  // Set exercise-level completed status to in_progress
  exercise.completed = 'in_progress';

  // Complete 1-3 sets of the exercise
  const setsToComplete = Math.min(randomInRange(1, 3), exercise.sets.length);

  for (let i = 0; i < exercise.sets.length; i++) {
    const set = exercise.sets[i];

    if (i < setsToComplete) {
      set.completed = 'completed';
      set.skipped = false;

      // Fill in completed reps
      if (set.trackableField1) {
        const prescribed = set.trackableField1.prescribed;
        if (prescribed) {
          if (typeof prescribed === 'string' && prescribed.includes('-')) {
            const [min, max] = prescribed.split('-').map(Number);
            set.trackableField1.completed = String(randomInRange(min, max));
          } else {
            const numVal = parseInt(prescribed, 10);
            if (!isNaN(numVal)) {
              set.trackableField1.completed = String(numVal + randomInRange(-1, 1));
            } else {
              set.trackableField1.completed = prescribed;
            }
          }
        } else {
          set.trackableField1.completed = String(randomInRange(8, 12));
        }
      }

      // Fill in completed weight
      if (set.trackableField2) {
        const prescribed = set.trackableField2.prescribed;
        if (prescribed) {
          const numVal = parseFloat(prescribed);
          if (!isNaN(numVal)) {
            const variation = numVal * 0.05;
            const completed = numVal + (Math.random() * variation * 2 - variation);
            set.trackableField2.completed = String(Math.round(completed * 2) / 2);
          } else {
            set.trackableField2.completed = prescribed;
          }
        } else if (set.trackableField2.label === 'kg' || set.trackableField2.label === 'lbs') {
          set.trackableField2.completed = String(randomInRange(20, 80));
        }
      }
    }
    // Remaining sets stay as not completed
  }
}

/**
 * Helper to complete an individual exercise
 * Fills in realistic completed values based on prescribed values
 */
function completeExercise(exercise: any) {
  if (!exercise.sets) return;

  // Set exercise-level completed status
  exercise.completed = 'completed';

  for (const set of exercise.sets) {
    set.completed = 'completed';
    set.skipped = false;

    // Fill in completed reps (trackableField1)
    if (set.trackableField1) {
      const prescribed = set.trackableField1.prescribed;
      if (prescribed) {
        // Handle range prescriptions like "8-10"
        if (typeof prescribed === 'string' && prescribed.includes('-')) {
          const [min, max] = prescribed.split('-').map(Number);
          set.trackableField1.completed = String(randomInRange(min, max));
        } else if (typeof prescribed === 'string' && prescribed.includes('s')) {
          // Time-based (e.g., "60s")
          set.trackableField1.completed = prescribed;
        } else {
          // Use prescribed value directly or add slight variation
          const numVal = parseInt(prescribed, 10);
          if (!isNaN(numVal)) {
            // Add -1 to +1 variation
            set.trackableField1.completed = String(numVal + randomInRange(-1, 1));
          } else {
            set.trackableField1.completed = prescribed;
          }
        }
      } else {
        set.trackableField1.completed = String(randomInRange(8, 12));
      }
    }

    // Fill in completed weight (trackableField2)
    if (set.trackableField2) {
      const prescribed = set.trackableField2.prescribed;
      if (prescribed) {
        // Use prescribed weight with slight variation (+/- 5%)
        const numVal = parseFloat(prescribed);
        if (!isNaN(numVal)) {
          const variation = numVal * 0.05; // 5% variation
          const completed = numVal + (Math.random() * variation * 2 - variation);
          set.trackableField2.completed = String(Math.round(completed * 2) / 2); // Round to nearest 0.5
        } else {
          set.trackableField2.completed = prescribed;
        }
      } else if (set.trackableField2.label === 'kg' || set.trackableField2.label === 'lbs') {
        // Generate realistic weight if not prescribed
        set.trackableField2.completed = String(randomInRange(20, 80));
      }
    }
  }
}

/**
 * Get client training history entries
 *
 * Schema: client_id, coach_id, date, workout_id (TEXT), status
 * PK: (client_id, coach_id, date, workout_id)
 * Status constraint: 'in_progress', 'completed', 'missed' only
 */
export function getClientTrainingHistory(
  coachId: string,
  clientId: string,
  trainingData: Array<{ date: string; training_data: Record<string, any>; _status: string; _workoutId?: string }>
) {
  const historyEntries: any[] = [];

  for (const training of trainingData) {
    // Skip not_started training days (not allowed by constraint)
    if (training._status === 'not_started') continue;

    // Get workout ID from the internal field or from training_data
    let workoutId = training._workoutId;

    if (!workoutId) {
      // Fallback: extract from training_data object
      const trainingDataObj = training.training_data || {};
      const firstWorkoutKey = Object.keys(trainingDataObj).find(k => k.startsWith('workout_'));
      if (firstWorkoutKey && trainingDataObj[firstWorkoutKey]?.id) {
        workoutId = trainingDataObj[firstWorkoutKey].id;
      }
    }

    if (!workoutId) continue;

    historyEntries.push({
      coach_id: coachId,
      client_id: clientId,
      workout_id: workoutId,
      date: training.date,
      status: training._status,
    });
  }

  return historyEntries;
}

/**
 * Get client training exercise history
 */
export function getClientTrainingExerciseHistory(
  coachId: string,
  clientId: string,
  trainingData: Array<{ date: string; training_data: Record<string, any>; _status: string; _workoutId?: string }>,
  _trainingHistoryIds: Map<string, string> // Not used in current schema
) {
  const exerciseHistoryEntries: any[] = [];

  for (const training of trainingData) {
    if (training._status === 'not_started') continue;

    // Extract workout entries from training_data object
    const trainingDataObj = training.training_data || {};
    const workoutKeys = Object.keys(trainingDataObj).filter(k => k.startsWith('workout_'));

    for (const key of workoutKeys) {
      const workoutEntry = trainingDataObj[key]?.workout_data;
      if (!workoutEntry?.items) continue;

      for (const item of workoutEntry.items) {
        if (item.itemType === 'exercise' && item.data) {
          const exerciseData = extractExerciseHistory(item.data);
          if (exerciseData) {
            exerciseHistoryEntries.push({
              coach_id: coachId,
              client_id: clientId,
              exercise_id: item.data.prescribedExerciseId,
              date: training.date,
              sets_data: exerciseData.sets,
              total_volume: exerciseData.totalVolume,
            });
          }
        } else if (item.itemType === 'section' && item.data?.exercises) {
          const sectionType = item.data.type;

          for (const exerciseOrGroup of item.data.exercises) {
            // AMRAP sections have exercises directly (not grouped)
            if (sectionType === 'amrap' && exerciseOrGroup.prescribedExerciseId) {
              const exerciseData = extractExerciseHistory(exerciseOrGroup);
              if (exerciseData) {
                exerciseHistoryEntries.push({
                  coach_id: coachId,
                  client_id: clientId,
                  exercise_id: exerciseOrGroup.prescribedExerciseId,
                  date: training.date,
                  sets_data: exerciseData.sets,
                  total_volume: exerciseData.totalVolume,
                });
              }
            }
            // Other sections have grouped exercises
            else if (exerciseOrGroup.exercises) {
              for (const exercise of exerciseOrGroup.exercises) {
                const exerciseData = extractExerciseHistory(exercise);
                if (exerciseData) {
                  exerciseHistoryEntries.push({
                    coach_id: coachId,
                    client_id: clientId,
                    exercise_id: exercise.prescribedExerciseId,
                    date: training.date,
                    sets_data: exerciseData.sets,
                    total_volume: exerciseData.totalVolume,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return exerciseHistoryEntries;
}

/**
 * Extract exercise history data from an exercise object
 * Handles both regular exercises (with sets array) and circuit-type exercises (with single set)
 */
function extractExerciseHistory(exercise: any) {
  let completedSets: any[] = [];

  // Handle regular exercises with sets array
  if (exercise.sets && Array.isArray(exercise.sets)) {
    completedSets = exercise.sets.filter((s: any) => s.completed && !s.skipped);
  }
  // Handle circuit-type exercises with single set object
  else if (exercise.set && exercise.set.completed && !exercise.set.skipped) {
    completedSets = [exercise.set];
  }
  // Handle AMRAP-type exercises with direct completed flag
  else if (exercise.completed && exercise.trackableField1?.completed) {
    completedSets = [{
      setNumber: 1,
      completed: true,
      skipped: false,
      type: 'normal',
      trackableField1: exercise.trackableField1,
      trackableField2: exercise.trackableField2,
    }];
  }

  if (completedSets.length === 0) return null;

  let totalVolume = 0;
  const setsData = completedSets.map((set: any) => {
    const reps = parseInt(set.trackableField1?.completed || '0', 10);
    const weight = parseFloat(set.trackableField2?.completed || '0');
    totalVolume += reps * weight;

    return {
      setNumber: set.setNumber,
      reps: set.trackableField1?.completed,
      weight: set.trackableField2?.completed,
      type: set.type,
    };
  });

  return {
    sets: setsData,
    totalVolume,
  };
}

/**
 * Get coach todo list items
 */
export function getCoachTodoItems(coachId: string, clientIds: string[]) {
  const ownTodos: any[] = [];
  const autoTodos: any[] = [];

  // General todos (not client-specific)
  const generalTodos = [
    { title: `${TEST_PREFIX} Review weekly schedules`, description: 'Check all client schedules for the week', priority: 'high' },
    { title: `${TEST_PREFIX} Update workout templates`, description: 'Add new exercises to workout library', priority: 'medium' },
    { title: `${TEST_PREFIX} Send weekly check-in reminders`, description: 'Remind clients to submit check-ins', priority: 'medium' },
    { title: `${TEST_PREFIX} Review nutrition plans`, description: 'Update meal plans for next month', priority: 'low' },
    { title: `${TEST_PREFIX} Create new program`, description: 'Design 12-week hypertrophy program', priority: 'low' },
  ];

  for (const todo of generalTodos) {
    ownTodos.push({
      coach_id: coachId,
      client_id: null,
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      status: randomPick(['pending', 'pending', 'completed']),
      due_date: null,
    });
  }

  // Client-specific todos (pick 3 random clients)
  const selectedClients = clientIds.slice(0, 3);
  const clientTodos = [
    { title: 'Review progress photos', description: 'Analyze recent progress photos and provide feedback' },
    { title: 'Adjust training volume', description: 'Modify program based on recovery feedback' },
    { title: 'Schedule call', description: 'Set up monthly check-in call' },
  ];

  for (let i = 0; i < selectedClients.length && i < clientTodos.length; i++) {
    ownTodos.push({
      coach_id: coachId,
      client_id: selectedClients[i],
      title: `${TEST_PREFIX} ${clientTodos[i].title}`,
      description: clientTodos[i].description,
      priority: 'medium',
      status: 'pending',
      due_date: null,
    });
  }

  // Auto-generated todos
  const autoTodoTemplates = [
    { title: 'Check-in overdue', description: 'Client has not submitted weekly check-in', type: 'checkin_overdue' },
    { title: 'No training logged', description: 'Client has not logged training for 3+ days', type: 'no_training' },
    { title: 'Message unanswered', description: 'Client message needs response', type: 'message_pending' },
  ];

  for (let i = 0; i < 3 && i < clientIds.length; i++) {
    autoTodos.push({
      coach_id: coachId,
      client_id: clientIds[i],
      title: `${TEST_PREFIX} ${autoTodoTemplates[i].title}`,
      description: autoTodoTemplates[i].description,
      todo_type: autoTodoTemplates[i].type,
      status: 'pending',
      auto_generated: true,
    });
  }

  return { ownTodos, autoTodos };
}
