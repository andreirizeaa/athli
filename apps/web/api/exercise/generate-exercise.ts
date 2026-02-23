import { streamChat, type StreamEvent } from '@/api/ai/ai-service';

export type GeneratedWorkout = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  sections: any[];
};

// The example prompt that triggers instant mock data (no backend call)
const EXAMPLE_PROMPT = `Create a full-body strength and conditioning workout for intermediate level. Include:

- 3-4 compound exercises (squats, deadlifts, bench press variations)
- 2-3 accessory movements for arms and core
- 3-4 sets per exercise
- Progressive rep ranges (8-12 reps for strength, 12-15 for hypertrophy)
- 60-90 seconds rest between sets
- Total workout duration: 45-60 minutes

Focus on proper form and progressive overload.`;

// Check if the prompt matches the example prompt (normalized comparison)
const isExamplePrompt = (prompt: string): boolean => {
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalize(prompt) === normalize(EXAMPLE_PROMPT);
};

// Mock data with correct musclewiki_ids from exercises.json
const getExampleMockData = (): GeneratedWorkout => ({
  title: 'Full-Body Strength & Conditioning',
  description:
    'A comprehensive full-body workout for intermediate level with compound exercises and accessories.',
  type: 'weightlifting',
  difficulty: 'all_levels',
  sections: [
    {
      id: 'sec_compound_1',
      type: 'regular',
      exercises: [
        {
          isSuperset: false,
          exercises: [
            {
              id: '6', // Barbell Squat
              name: 'Barbell Squat',
              exerciseType: 'weight_reps',
              equipment: ['Barbell'],
              sets: [
                { setNumber: 1, isDropset: false, weight: 60, reps: 12, distance: null, durationSec: null, restSec: 90 },
                { setNumber: 2, isDropset: false, weight: 70, reps: 10, distance: null, durationSec: null, restSec: 90 },
                { setNumber: 3, isDropset: false, weight: 80, reps: 8, distance: null, durationSec: null, restSec: 90 },
                { setNumber: 4, isDropset: false, weight: 85, reps: 8, distance: null, durationSec: null, restSec: 90 },
              ],
            },
          ],
        },
        {
          isSuperset: false,
          exercises: [
            {
              id: '31', // Barbell Deadlift
              name: 'Barbell Deadlift',
              exerciseType: 'weight_reps',
              equipment: ['Barbell'],
              sets: [
                { setNumber: 1, isDropset: false, weight: 70, reps: 10, distance: null, durationSec: null, restSec: 90 },
                { setNumber: 2, isDropset: false, weight: 80, reps: 8, distance: null, durationSec: null, restSec: 90 },
                { setNumber: 3, isDropset: false, weight: 90, reps: 8, distance: null, durationSec: null, restSec: 90 },
              ],
            },
          ],
        },
        {
          isSuperset: false,
          exercises: [
            {
              id: '3', // Barbell Bench Press
              name: 'Barbell Bench Press',
              exerciseType: 'weight_reps',
              equipment: ['Barbell'],
              sets: [
                { setNumber: 1, isDropset: false, weight: 50, reps: 12, distance: null, durationSec: null, restSec: 60 },
                { setNumber: 2, isDropset: false, weight: 60, reps: 10, distance: null, durationSec: null, restSec: 60 },
                { setNumber: 3, isDropset: false, weight: 65, reps: 8, distance: null, durationSec: null, restSec: 60 },
                { setNumber: 4, isDropset: false, weight: 70, reps: 8, distance: null, durationSec: null, restSec: 60 },
              ],
            },
          ],
        },
        {
          isSuperset: false,
          exercises: [
            {
              id: '19', // Pull Ups
              name: 'Pull Ups',
              exerciseType: 'reps',
              equipment: [],
              sets: [
                { setNumber: 1, isDropset: false, weight: null, reps: 10, distance: null, durationSec: null, restSec: 60 },
                { setNumber: 2, isDropset: false, weight: null, reps: 8, distance: null, durationSec: null, restSec: 60 },
                { setNumber: 3, isDropset: false, weight: null, reps: 8, distance: null, durationSec: null, restSec: 60 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sec_accessories_1',
      type: 'regular',
      exercises: [
        {
          isSuperset: true,
          exercises: [
            {
              id: '14', // Dumbbell Lateral Raise
              name: 'Dumbbell Lateral Raise',
              exerciseType: 'weight_reps',
              equipment: ['Dumbbells'],
              sets: [
                { setNumber: 1, isDropset: false, weight: 8, reps: 15, distance: null, durationSec: null, restSec: 30 },
                { setNumber: 2, isDropset: false, weight: 10, reps: 12, distance: null, durationSec: null, restSec: 30 },
                { setNumber: 3, isDropset: false, weight: 10, reps: 12, distance: null, durationSec: null, restSec: 30 },
              ],
            },
            {
              id: '1', // Dumbbell Curl
              name: 'Dumbbell Curl',
              exerciseType: 'weight_reps',
              equipment: ['Dumbbells'],
              sets: [
                { setNumber: 1, isDropset: false, weight: 10, reps: 15, distance: null, durationSec: null, restSec: 60 },
                { setNumber: 2, isDropset: false, weight: 12, reps: 12, distance: null, durationSec: null, restSec: 60 },
                { setNumber: 3, isDropset: false, weight: 12, reps: 12, distance: null, durationSec: null, restSec: 60 },
              ],
            },
          ],
        },
        {
          isSuperset: false,
          exercises: [
            {
              id: '29', // Crunches
              name: 'Crunches',
              exerciseType: 'reps',
              equipment: [],
              sets: [
                { setNumber: 1, isDropset: false, weight: null, reps: 20, distance: null, durationSec: null, restSec: 45 },
                { setNumber: 2, isDropset: false, weight: null, reps: 20, distance: null, durationSec: null, restSec: 45 },
                { setNumber: 3, isDropset: false, weight: null, reps: 15, distance: null, durationSec: null, restSec: 45 },
              ],
            },
          ],
        },
      ],
    },
  ],
});

// Call the AI backend to generate a workout using the existing AI service
const generateWorkoutFromAI = async (
  prompt: string,
  pdfContent?: string | null
): Promise<GeneratedWorkout | null> => {
  return new Promise((resolve) => {
    let workoutPayload: GeneratedWorkout | null = null;

    const message = pdfContent
      ? `Generate a workout based on this request and PDF content. Return a create_workout action.\n\nRequest: ${prompt}\n\nPDF Content:\n${pdfContent}`
      : `Generate a workout based on this request. Return a create_workout action.\n\nRequest: ${prompt}`;

    streamChat(
      {
        message,
        sessionId: `workout-gen-${Date.now()}`,
        context: {
          currentPage: '/library/training/workouts/new',
        },
        conversationHistory: [],
      },
      (event: StreamEvent) => {
        // Look for action events containing workout payload
        if (event.type === 'action' && event.data) {
          const actionData = event.data;
          if (actionData.type === 'create_workout' && actionData.payload) {
            workoutPayload = convertAIPayloadToWorkout(actionData.payload);
          }
        }

        // When done, resolve with the workout payload
        if (event.type === 'done') {
          resolve(workoutPayload);
        }

        // Handle errors
        if (event.type === 'error') {
          console.error('AI chat error:', event.data?.message);
          resolve(null);
        }
      }
    );
  });
};

// Convert AI payload format to GeneratedWorkout format
const convertAIPayloadToWorkout = (payload: any): GeneratedWorkout => {
  return {
    title: payload.name || 'Generated Workout',
    description: payload.description || '',
    type: payload.type || 'weightlifting',
    difficulty: payload.difficulty || 'all_levels',
    sections: (payload.sections || []).map((section: any, index: number) => ({
      id: `sec_${section.type || 'regular'}_${index + 1}`,
      type: section.type || 'regular',
      exercises: (section.exercises || []).map((ex: any) => ({
        isSuperset: false,
        exercises: [{
          id: ex.prescribedExerciseId || ex.id,
          name: ex.name,
          exerciseType: determineExerciseType(ex),
          equipment: ex.category ? [ex.category] : [],
          sets: generateSetsFromAIExercise(ex),
        }],
      })),
    })),
  };
};

// Determine exercise type based on column labels
const determineExerciseType = (ex: any): string => {
  const col1 = ex.column1Label?.toLowerCase() || '';
  const col2 = ex.column2Label?.toLowerCase() || '';

  if (col1 === 'minutes' || col1 === 'seconds' || col1 === 'km' || col1 === 'm') {
    return 'distance_duration';
  }
  if (col2 === 'kg' || col2 === 'lbs') {
    return 'weight_reps';
  }
  return 'reps';
};

// Generate sets from AI exercise data
const generateSetsFromAIExercise = (ex: any): any[] => {
  const sets = [];
  const numSets = ex.sets || 3;
  const reps = parseInt(ex.column1Value) || 10;
  const weight = ex.column2Value ? parseFloat(ex.column2Value) : null;
  const rest = ex.rest || 60;

  for (let i = 1; i <= numSets; i++) {
    sets.push({
      setNumber: i,
      isDropset: false,
      weight,
      reps,
      distance: null,
      durationSec: null,
      restSec: rest,
    });
  }
  return sets;
};

// Main function to generate workout from prompt
export const generateWorkoutFromPrompt = async (
  prompt: string,
  pdfContent?: string | null
): Promise<GeneratedWorkout | null> => {
  // Check if this is the example prompt - return instant mock data
  if (isExamplePrompt(prompt)) {
    // Minimal delay for UX feedback
    await new Promise((resolve) => setTimeout(resolve, 300));
    return getExampleMockData();
  }

  // For non-example prompts, call the AI backend
  return generateWorkoutFromAI(prompt, pdfContent);
};

// Dummy function to handle chat prompts with current workout state
// In the future this can call a real backend / AI endpoint.
export const prompt = async (workoutSchemaJson: string): Promise<void> => {
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // eslint-disable-next-line no-console
  console.log('Chat prompt called with workout schema:', workoutSchemaJson);

  // TODO: Implement actual API call to backend/AI service
};
