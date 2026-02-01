/**
 * Coach Library Seed Data
 * Generates test data for coach library items: metrics, habits, files, check-ins,
 * questionnaires, exercises, workouts, programs, and sections
 */

import { TEST_PREFIX, generateUUID, generateExerciseInstanceId } from './utils';

/**
 * Coach Metrics - 5 test metrics
 */
export function getCoachMetrics(coachId: string) {
  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Weight`,
      unit: 'kg',
      description: 'Daily body weight measurement',
      value_kind: 'number',
      min_value: 30,
      max_value: 200,
      schedule_config: { frequency: 'daily' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Body Fat %`,
      unit: '%',
      description: 'Body fat percentage',
      value_kind: 'number',
      min_value: 5,
      max_value: 50,
      schedule_config: { frequency: 'weekly' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Waist Circumference`,
      unit: 'cm',
      description: 'Waist measurement at navel',
      value_kind: 'number',
      min_value: 50,
      max_value: 150,
      schedule_config: { frequency: 'weekly' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Chest Circumference`,
      unit: 'cm',
      description: 'Chest measurement at nipple line',
      value_kind: 'number',
      min_value: 60,
      max_value: 150,
      schedule_config: { frequency: 'weekly' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Arm Circumference`,
      unit: 'cm',
      description: 'Upper arm measurement flexed',
      value_kind: 'number',
      min_value: 20,
      max_value: 60,
      schedule_config: { frequency: 'weekly' },
    },
  ];
}

/**
 * Coach Habits - 5 test habits
 */
export function getCoachHabits(coachId: string) {
  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Water Intake`,
      description: 'Drink at least 8 glasses of water daily',
      schedule_type: 'daily',
      days_of_week: [1, 2, 3, 4, 5, 6, 0],
      schedule_config: { target: 8, unit: 'glasses' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Sleep Quality`,
      description: 'Get 7-9 hours of quality sleep',
      schedule_type: 'daily',
      days_of_week: [1, 2, 3, 4, 5, 6, 0],
      schedule_config: { target: 8, unit: 'hours' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Daily Steps`,
      description: 'Walk at least 10,000 steps',
      schedule_type: 'daily',
      days_of_week: [1, 2, 3, 4, 5, 6, 0],
      schedule_config: { target: 10000, unit: 'steps' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Meditation`,
      description: '10 minutes of mindfulness meditation',
      schedule_type: 'daily',
      days_of_week: [1, 2, 3, 4, 5, 6, 0],
      schedule_config: { target: 10, unit: 'minutes' },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Stretching`,
      description: 'Morning and evening stretching routine',
      schedule_type: 'daily',
      days_of_week: [1, 2, 3, 4, 5, 6, 0],
      schedule_config: { target: 2, unit: 'sessions' },
    },
  ];
}

/**
 * Coach Files - 3 test files
 * Note: coach_files table uses: coach_id, bucket_id, file_path, filename, mime_type, size
 * Files are stored in Supabase Storage, but for seed data we'll skip actual file uploads
 */
export function getCoachFiles(coachId: string) {
  return [
    {
      coach_id: coachId,
      bucket_id: 'coach_files',
      file_path: `${coachId}/test-meal-plan.pdf`,
      filename: `${TEST_PREFIX} Meal Plan Guide`,
      mime_type: 'application/pdf',
      size: 1024000,
    },
    {
      coach_id: coachId,
      bucket_id: 'coach_files',
      file_path: `${coachId}/test-workout-guide.pdf`,
      filename: `${TEST_PREFIX} Workout Guide`,
      mime_type: 'application/pdf',
      size: 2048000,
    },
    {
      coach_id: coachId,
      bucket_id: 'coach_files',
      file_path: `${coachId}/test-supplement-guide.pdf`,
      filename: `${TEST_PREFIX} Supplement Guide`,
      mime_type: 'application/pdf',
      size: 512000,
    },
  ];
}

/**
 * Coach Check-ins - 2 test check-ins
 * Note: coach_checkins uses: questions (array), not form_config
 */
export function getCoachCheckIns(coachId: string) {
  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Weekly Check-in`,
      description: 'Weekly progress check-in form',
      questions: [
        { id: 'q1', type: 'scale', question: 'How would you rate your energy levels this week?', min: 1, max: 10 },
        { id: 'q2', type: 'scale', question: 'How well did you follow your nutrition plan?', min: 1, max: 10 },
        { id: 'q3', type: 'text', question: 'What were your biggest wins this week?' },
        { id: 'q4', type: 'text', question: 'What challenges did you face?' },
        { id: 'q5', type: 'scale', question: 'How motivated do you feel for next week?', min: 1, max: 10 },
      ],
      num_of_questions: 5,
      schedule_config: { frequency: 'weekly', dayOfWeek: 0 },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Monthly Review`,
      description: 'Comprehensive monthly progress review',
      questions: [
        { id: 'q1', type: 'scale', question: 'Overall satisfaction with your progress this month?', min: 1, max: 10 },
        { id: 'q2', type: 'text', question: 'What goals did you achieve this month?' },
        { id: 'q3', type: 'text', question: 'What would you like to focus on next month?' },
        { id: 'q4', type: 'multiselect', question: 'Which areas need improvement?', options: ['Nutrition', 'Training', 'Sleep', 'Stress', 'Recovery'] },
        { id: 'q5', type: 'text', question: 'Any feedback or questions for your coach?' },
      ],
      num_of_questions: 5,
      schedule_config: { frequency: 'monthly', dayOfMonth: 1 },
    },
  ];
}

/**
 * Coach Questionnaires - 2 test questionnaires
 * Note: coach_questionnaires uses: questions (array), not form_config
 */
export function getCoachQuestionnaires(coachId: string) {
  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Onboarding Form`,
      description: 'Initial client onboarding questionnaire',
      questions: [
        { id: 'q1', type: 'text', question: 'What are your primary fitness goals?' },
        { id: 'q2', type: 'select', question: 'How many days per week can you train?', options: ['2', '3', '4', '5', '6'] },
        { id: 'q3', type: 'multiselect', question: 'What equipment do you have access to?', options: ['Gym', 'Dumbbells', 'Barbell', 'Resistance Bands', 'None'] },
        { id: 'q4', type: 'text', question: 'Do you have any injuries or limitations?' },
        { id: 'q5', type: 'select', question: 'What is your training experience level?', options: ['Beginner', 'Intermediate', 'Advanced'] },
      ],
      num_of_questions: 5,
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Fitness Assessment`,
      description: 'Comprehensive fitness assessment form',
      questions: [
        { id: 'q1', type: 'number', question: 'How many push-ups can you do in one set?' },
        { id: 'q2', type: 'number', question: 'How many pull-ups can you do in one set?' },
        { id: 'q3', type: 'number', question: 'How long can you hold a plank (seconds)?' },
        { id: 'q4', type: 'number', question: 'What is your estimated 1RM squat (kg)?' },
        { id: 'q5', type: 'number', question: 'What is your estimated 1RM bench press (kg)?' },
      ],
      num_of_questions: 5,
    },
  ];
}

/**
 * Coach Exercises - 10 test exercises
 * Note: coach_exercises uses: category, muscle_group (TEXT[] array), difficulty, video_link
 */
export function getCoachExercises(coachId: string) {
  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Barbell Squat`,
      description: 'Compound lower body exercise targeting quads, glutes, and hamstrings',
      category: 'strength',
      muscle_group: ['Legs'],
      difficulty: 'intermediate',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Barbell Deadlift`,
      description: 'Full body compound exercise for posterior chain development',
      category: 'strength',
      muscle_group: ['Back'],
      difficulty: 'intermediate',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Barbell Bench Press`,
      description: 'Primary chest exercise for upper body pushing strength',
      category: 'strength',
      muscle_group: ['Chest'],
      difficulty: 'intermediate',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Barbell Row`,
      description: 'Compound pulling exercise for back thickness',
      category: 'strength',
      muscle_group: ['Back'],
      difficulty: 'intermediate',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Overhead Press`,
      description: 'Vertical pressing movement for shoulder development',
      category: 'strength',
      muscle_group: ['Shoulders'],
      difficulty: 'intermediate',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Pull-ups`,
      description: 'Bodyweight vertical pulling exercise',
      category: 'strength',
      muscle_group: ['Back'],
      difficulty: 'intermediate',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Dumbbell Lunges`,
      description: 'Unilateral leg exercise for balance and strength',
      category: 'strength',
      muscle_group: ['Legs'],
      difficulty: 'beginner',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Dumbbell Shoulder Press`,
      description: 'Overhead pressing with dumbbells for shoulder development',
      category: 'strength',
      muscle_group: ['Shoulders'],
      difficulty: 'beginner',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Romanian Deadlift`,
      description: 'Hip hinge movement targeting hamstrings and glutes',
      category: 'strength',
      muscle_group: ['Legs'],
      difficulty: 'intermediate',
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Plank`,
      description: 'Isometric core exercise for stability',
      category: 'core',
      muscle_group: ['Core'],
      difficulty: 'beginner',
    },
  ];
}

/**
 * Existing exercise IDs from exercises.json for use in workouts
 * Using real exercises so workouts display properly with exercise data
 */
export const EXISTING_EXERCISE_IDS = {
  BARBELL_BENCH_PRESS: '3',
  BARBELL_SQUAT: '6',
  PULL_UPS: '19',
  BARBELL_DEADLIFT: '31',
  DUMBBELL_SEATED_OVERHEAD_PRESS: '36',
  BARBELL_BENT_OVER_ROW: '39',
};

/**
 * Coach Workouts - 5 test workouts
 * Uses existing exercise IDs from exercises.json instead of creating test exercises
 */
export function getCoachWorkouts(coachId: string) {
  // Helper to create a basic exercise item
  const createExerciseItem = (exerciseId: string, sets: number, reps: string, restSec: number, weight?: string) => ({
    itemType: 'exercise' as const,
    data: {
      id: generateExerciseInstanceId(exerciseId),
      prescribedExerciseId: exerciseId,
      performedExerciseId: null,
      completed: 'not_started',
      sets: Array.from({ length: sets }, (_, i) => ({
        setNumber: i + 1,
        type: 'normal' as const,
        restSec,
        completed: 'not_started',
        skipped: false,
        trackableField1: { label: 'Reps', prescribed: reps, completed: null },
        trackableField2: { label: weight ? 'kg' : 'Optional', prescribed: weight || null, completed: null },
        dropset: null,
      })),
      alternatives: [],
      notes: null,
      supersetId: null,
      eachSide: false,
      tempo: null,
      column1Label: 'Reps',
      column2Label: weight ? 'kg' : 'Optional',
    },
  });

  const { BARBELL_BENCH_PRESS, BARBELL_SQUAT, PULL_UPS, BARBELL_DEADLIFT, DUMBBELL_SEATED_OVERHEAD_PRESS, BARBELL_BENT_OVER_ROW } = EXISTING_EXERCISE_IDS;

  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Push Day`,
      description: 'Chest, shoulders, and triceps focused workout',
      type: 'strength',
      difficulty: 'intermediate',
      equipment: ['barbell', 'dumbbells', 'bench'],
      total_exercises: 3,
      workout_data: {
        items: [
          createExerciseItem(BARBELL_BENCH_PRESS, 4, '8-10', 120, '60'),
          createExerciseItem(DUMBBELL_SEATED_OVERHEAD_PRESS, 4, '8-10', 90, '20'),
          createExerciseItem(DUMBBELL_SEATED_OVERHEAD_PRESS, 3, '10-12', 90, '15'),
        ],
        pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
        post: { rating: null, intensity: null, sessionComments: null },
        completedSummary: { status: 'not_started', startedAt: null, completedAt: null, totalDurationMin: null, totalWeightLifted: null, pausedAt: null, totalPausedMs: 0 },
      },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Pull Day`,
      description: 'Back and biceps focused workout',
      type: 'strength',
      difficulty: 'intermediate',
      equipment: ['barbell', 'pull-up bar'],
      total_exercises: 3,
      workout_data: {
        items: [
          createExerciseItem(BARBELL_DEADLIFT, 4, '5', 180, '100'),
          createExerciseItem(BARBELL_BENT_OVER_ROW, 4, '8-10', 90, '60'),
          createExerciseItem(PULL_UPS, 4, '6-10', 90), // Bodyweight - no weight
        ],
        pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
        post: { rating: null, intensity: null, sessionComments: null },
        completedSummary: { status: 'not_started', startedAt: null, completedAt: null, totalDurationMin: null, totalWeightLifted: null, pausedAt: null, totalPausedMs: 0 },
      },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Leg Day`,
      description: 'Quadriceps, hamstrings, and glutes workout',
      type: 'strength',
      difficulty: 'intermediate',
      equipment: ['barbell', 'dumbbells', 'squat rack'],
      total_exercises: 2,
      workout_data: {
        items: [
          createExerciseItem(BARBELL_SQUAT, 4, '6-8', 180, '80'),
          createExerciseItem(BARBELL_DEADLIFT, 4, '10-12', 90, '70'),
        ],
        pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
        post: { rating: null, intensity: null, sessionComments: null },
        completedSummary: { status: 'not_started', startedAt: null, completedAt: null, totalDurationMin: null, totalWeightLifted: null, pausedAt: null, totalPausedMs: 0 },
      },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Full Body`,
      description: 'Complete full body workout hitting all major muscle groups',
      type: 'strength',
      difficulty: 'beginner',
      equipment: ['barbell', 'dumbbells'],
      total_exercises: 4,
      workout_data: {
        items: [
          createExerciseItem(BARBELL_SQUAT, 3, '8-10', 120, '60'),
          createExerciseItem(BARBELL_BENCH_PRESS, 3, '8-10', 120, '50'),
          createExerciseItem(BARBELL_BENT_OVER_ROW, 3, '8-10', 90, '50'),
          createExerciseItem(DUMBBELL_SEATED_OVERHEAD_PRESS, 3, '8-10', 90, '15'),
        ],
        pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
        post: { rating: null, intensity: null, sessionComments: null },
        completedSummary: { status: 'not_started', startedAt: null, completedAt: null, totalDurationMin: null, totalWeightLifted: null, pausedAt: null, totalPausedMs: 0 },
      },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Cardio & Core`,
      description: 'Cardio-focused session with core work',
      type: 'cardio',
      difficulty: 'beginner',
      equipment: [],
      total_exercises: 2,
      workout_data: {
        items: [
          createExerciseItem(BARBELL_SQUAT, 4, '15', 30, '40'),
          createExerciseItem(PULL_UPS, 3, '10', 30), // Bodyweight - no weight
        ],
        pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
        post: { rating: null, intensity: null, sessionComments: null },
        completedSummary: { status: 'not_started', startedAt: null, completedAt: null, totalDurationMin: null, totalWeightLifted: null, pausedAt: null, totalPausedMs: 0 },
      },
    },
  ];
}

/**
 * Coach Programs - 2 test programs
 */
export function getCoachPrograms(coachId: string, workoutIds: string[]) {
  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} 4-Week Strength`,
      description: 'Beginner-friendly 4-week strength building program',
      type: 'strength',
      difficulty: 'beginner',
      weeks: 4,
      program_data: {
        schema: [
          { day: 1, workouts: [workoutIds[0] || ''] }, // Push
          { day: 2, workouts: [] }, // Rest
          { day: 3, workouts: [workoutIds[1] || ''] }, // Pull
          { day: 4, workouts: [] }, // Rest
          { day: 5, workouts: [workoutIds[2] || ''] }, // Legs
          { day: 6, workouts: [workoutIds[4] || ''] }, // Cardio
          { day: 7, workouts: [] }, // Rest
        ],
      },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} 8-Week Hypertrophy`,
      description: 'Intermediate 8-week muscle building program',
      type: 'hypertrophy',
      difficulty: 'intermediate',
      weeks: 8,
      program_data: {
        schema: [
          { day: 1, workouts: [workoutIds[0] || ''] }, // Push
          { day: 2, workouts: [workoutIds[1] || ''] }, // Pull
          { day: 3, workouts: [workoutIds[2] || ''] }, // Legs
          { day: 4, workouts: [workoutIds[4] || ''] }, // Cardio
          { day: 5, workouts: [workoutIds[0] || ''] }, // Push
          { day: 6, workouts: [workoutIds[1] || ''] }, // Pull
          { day: 7, workouts: [] }, // Rest
        ],
      },
    },
  ];
}

/**
 * Coach Sections - 3 test sections
 * Note: section_type valid values are: 'regular', 'amrap', 'tabata', 'hiit', 'emom', 'circuits'
 * Uses existing exercise IDs from exercises.json
 */
export function getCoachSections(coachId: string) {
  const { BARBELL_SQUAT, PULL_UPS } = EXISTING_EXERCISE_IDS;

  return [
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Warm-up`,
      description: 'Standard warm-up routine',
      section_type: 'regular',
      section_data: {
        id: generateUUID(),
        name: `${TEST_PREFIX} Warm-up`,
        type: 'regular',
        category: 'warmup',
        exercises: [
          {
            isSuperset: false,
            exercises: [
              {
                id: generateExerciseInstanceId(BARBELL_SQUAT),
                prescribedExerciseId: BARBELL_SQUAT,
                performedExerciseId: null,
                completed: 'not_started',
                sets: [
                  {
                    setNumber: 1,
                    type: 'warmUp',
                    restSec: 30,
                    completed: 'not_started',
                    skipped: false,
                    trackableField1: { label: 'Reps', prescribed: '10', completed: null },
                    trackableField2: { label: 'kg', prescribed: '20', completed: null },
                    dropset: null,
                  },
                ],
                alternatives: [],
                notes: null,
                supersetId: null,
                eachSide: false,
                tempo: null,
                column1Label: 'Reps',
                column2Label: 'kg',
              },
            ],
          },
        ],
        notes: null,
      },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Main Workout`,
      description: 'Primary working sets',
      section_type: 'regular',
      section_data: {
        id: generateUUID(),
        name: `${TEST_PREFIX} Main Workout`,
        type: 'regular',
        exercises: [
          {
            isSuperset: false,
            exercises: [
              {
                id: generateExerciseInstanceId(BARBELL_SQUAT),
                prescribedExerciseId: BARBELL_SQUAT,
                performedExerciseId: null,
                completed: 'not_started',
                sets: [
                  {
                    setNumber: 1,
                    type: 'normal',
                    restSec: 120,
                    completed: 'not_started',
                    skipped: false,
                    trackableField1: { label: 'Reps', prescribed: '8', completed: null },
                    trackableField2: { label: 'kg', prescribed: '60', completed: null },
                    dropset: null,
                  },
                ],
                alternatives: [],
                notes: null,
                supersetId: null,
                eachSide: false,
                tempo: null,
                column1Label: 'Reps',
                column2Label: 'kg',
              },
            ],
          },
        ],
        notes: null,
      },
    },
    {
      coach_id: coachId,
      name: `${TEST_PREFIX} Cool-down`,
      description: 'Post-workout cool-down',
      section_type: 'regular',
      section_data: {
        id: generateUUID(),
        name: `${TEST_PREFIX} Cool-down`,
        type: 'regular',
        category: 'cooldown',
        exercises: [
          {
            isSuperset: false,
            exercises: [
              {
                id: generateExerciseInstanceId(PULL_UPS),
                prescribedExerciseId: PULL_UPS,
                performedExerciseId: null,
                completed: 'not_started',
                sets: [
                  {
                    setNumber: 1,
                    type: 'normal',
                    restSec: 0,
                    completed: 'not_started',
                    skipped: false,
                    trackableField1: { label: 'Reps', prescribed: '5', completed: null },
                    trackableField2: { label: 'Optional', prescribed: null, completed: null },
                    dropset: null,
                  },
                ],
                alternatives: [],
                notes: null,
                supersetId: null,
                eachSide: false,
                tempo: null,
                column1Label: 'Reps',
                column2Label: 'Optional',
              },
            ],
          },
        ],
        notes: null,
      },
    },
  ];
}
