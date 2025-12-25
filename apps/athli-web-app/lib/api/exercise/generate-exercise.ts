export type GeneratedWorkout = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  sections: any[];
};

// Dummy AI generate service returning static mock data for now.
// In the future this can call a real backend / AI endpoint.
export const generateWorkoutFromPrompt = async (
  _prompt: string,
  _pdfContent?: string | null
): Promise<GeneratedWorkout> => {
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mock: GeneratedWorkout = {
    title: 'Upper Body Strength & Conditioning',
    description:
      'A mixed upper-body strength session with supersets, dropsets, and conditioning finishers.',
    type: 'weightlifting',
    difficulty: 'all_levels',
    sections: [
      {
        id: 'sec_regular_1',
        type: 'regular',
        exercises: [
          {
            isSuperset: false,
            exercises: [
              {
                id: 'ex_bench_press',
                name: 'Barbell Bench Press',
                exerciseType: 'weight_reps',
                equipment: ['Barbell'],
                sets: [
                  {
                    setNumber: 1,
                    isDropset: false,
                    weight: 80,
                    reps: 8,
                    distance: null,
                    durationSec: null,
                    restSec: 120,
                  },
                  {
                    setNumber: 2,
                    isDropset: false,
                    weight: 85,
                    reps: 6,
                    distance: null,
                    durationSec: null,
                    restSec: 120,
                  },
                  {
                    setNumber: 3,
                    isDropset: true,
                    weightStages: [90, 70, 50],
                    repStages: [4, 5, 8],
                    weight: null,
                    reps: null,
                    distance: null,
                    durationSec: null,
                    restSec: 150,
                  },
                ],
              },
            ],
          },
          {
            isSuperset: true,
            exercises: [
              {
                id: 'ex_lat_pulldown',
                name: 'Lat Pulldown',
                exerciseType: 'weight_reps',
                equipment: ['Cable Machine'],
                sets: [
                  {
                    setNumber: 1,
                    isDropset: false,
                    weight: 60,
                    reps: 12,
                    distance: null,
                    durationSec: null,
                    restSec: 30,
                  },
                  {
                    setNumber: 2,
                    isDropset: false,
                    weight: 65,
                    reps: 10,
                    distance: null,
                    durationSec: null,
                    restSec: 30,
                  },
                  {
                    setNumber: 3,
                    isDropset: false,
                    weight: 70,
                    reps: 8,
                    distance: null,
                    durationSec: null,
                    restSec: 30,
                  },
                ],
              },
              {
                id: 'ex_pushups',
                name: 'Push Ups',
                exerciseType: 'reps',
                equipment: [],
                sets: [
                  {
                    setNumber: 1,
                    isDropset: false,
                    weight: null,
                    reps: 20,
                    distance: null,
                    durationSec: null,
                    restSec: 60,
                  },
                  {
                    setNumber: 2,
                    isDropset: false,
                    weight: null,
                    reps: 18,
                    distance: null,
                    durationSec: null,
                    restSec: 60,
                  },
                  {
                    setNumber: 3,
                    isDropset: false,
                    weight: null,
                    reps: 15,
                    distance: null,
                    durationSec: null,
                    restSec: 60,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'sec_amrap_1',
        type: 'amrap',
        roundDurationSec: 600,
        exercises: [
          {
            id: 'ex_battle_ropes',
            name: 'Battle Ropes',
            exerciseType: 'distance_duration',
            equipment: ['Battle Ropes'],
            sets: [
              {
                setNumber: 1,
                isDropset: false,
                weight: null,
                reps: null,
                distance: null,
                durationSec: 30,
                restSec: 0,
              },
            ],
          },
          {
            id: 'ex_kettlebell_swing',
            name: 'Kettlebell Swing',
            exerciseType: 'weight_reps',
            equipment: ['Kettlebell'],
            sets: [
              {
                setNumber: 1,
                isDropset: false,
                weight: 20,
                reps: 15,
                distance: null,
                durationSec: null,
                restSec: 0,
              },
            ],
          },
          {
            id: 'ex_rower',
            name: 'Rower',
            exerciseType: 'distance_duration',
            equipment: ['Rowing Machine'],
            sets: [
              {
                setNumber: 1,
                isDropset: false,
                weight: null,
                reps: null,
                distance: 200,
                durationSec: null,
                restSec: 0,
              },
            ],
          },
        ],
      },
      {
        id: 'sec_timed_1',
        type: 'timed',
        targetRounds: 4,
        exercises: [
          {
            id: 'ex_deadlift',
            name: 'Deadlift',
            exerciseType: 'weight_reps',
            equipment: ['Barbell'],
            sets: [
              {
                setNumber: 1,
                isDropset: false,
                weight: 100,
                reps: 5,
                distance: null,
                durationSec: null,
                restSec: 0,
              },
            ],
          },
          {
            id: 'ex_bike_sprint',
            name: 'Bike Sprint',
            exerciseType: 'distance_duration',
            equipment: ['Bike'],
            sets: [
              {
                setNumber: 1,
                isDropset: false,
                weight: null,
                reps: null,
                distance: null,
                durationSec: 20,
                restSec: 0,
              },
            ],
          },
          {
            id: 'ex_situps',
            name: 'Sit Ups',
            exerciseType: 'reps',
            equipment: [],
            sets: [
              {
                setNumber: 1,
                isDropset: false,
                weight: null,
                reps: 25,
                distance: null,
                durationSec: null,
                restSec: 0,
              },
            ],
          },
        ],
      },
    ],
  };

  return mock;
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
