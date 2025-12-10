/**
 * Shared mock workout schema used across all workouts
 * This ensures consistency in mock data
 */

export const MOCK_WORKOUT_SCHEMA = {
  sections: [
    {
      id: 'sec_regular_mock',
      type: 'regular' as const,
      exercises: [
        {
          exerciseId: 'K6NnTv0',
          name: 'Bench Press',
          imageUrl: '/demo-img.png',
          equipments: ['Barbell'],
          bodyParts: ['Chest'],
          exerciseType: 'weight_reps' as const,
          targetMuscles: ['Pectoralis Major Clavicular Head'],
          secondaryMuscles: ['Deltoid Anterior', 'Pectoralis Major Clavicular Head', 'Triceps Brachii'],
          videoUrl: '/demo-video.mp4',
          keywords: ['Chest workout with barbell', 'Barbell bench press exercise'],
          overview: 'The Bench Press is a classic strength training exercise.',
          instructions: ['Grip the barbell', 'Lower to chest', 'Push back up'],
          exerciseTips: ['Keep your back flat', 'Control the weight'],
          variations: [],
          relatedExerciseIds: [],
          instanceId: 'inst_mock_1',
          sets: [
            {
              setNumber: 1,
              type: 'normal' as const,
              weight: '135',
              reps: '10',
              rest: '60',
            },
            {
              setNumber: 2,
              type: 'normal' as const,
              weight: '135',
              reps: '10',
              rest: '60',
            },
          ],
        },
        {
          exerciseId: 'ex_2',
          name: 'Squats',
          imageUrl: '/demo-img.png',
          equipments: ['Barbell'],
          bodyParts: ['Legs'],
          exerciseType: 'weight_reps' as const,
          targetMuscles: ['Quadriceps'],
          secondaryMuscles: ['Glutes', 'Hamstrings'],
          videoUrl: '/demo-video.mp4',
          keywords: ['Leg workout', 'Squat exercise'],
          overview: 'Squats are a fundamental lower body exercise.',
          instructions: ['Stand with feet shoulder-width', 'Lower down', 'Push back up'],
          exerciseTips: ['Keep knees aligned', 'Maintain proper form'],
          variations: [],
          relatedExerciseIds: [],
          instanceId: 'inst_mock_2',
          sets: [
            {
              setNumber: 1,
              type: 'normal' as const,
              weight: '185',
              reps: '12',
              rest: '90',
            },
          ],
        },
      ],
    },
  ],
};

