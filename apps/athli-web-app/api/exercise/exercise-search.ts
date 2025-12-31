export type Exercise = {
  exerciseId: string;
  name: string;
  imageUrl: string;
  equipments: string[];
  bodyParts: string[];
  exerciseType: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  videoUrl: string;
  keywords: string[];
  overview: string;
  instructions: string[];
  exerciseTips: string[];
  variations: string[];
  relatedExerciseIds: string[];
};

const mockExercises: Exercise[] = [
  {
    exerciseId: 'K6NnTv0',
    name: 'Bench Press',
    imageUrl: '/demo-img.png',
    equipments: ['Barbell'],
    bodyParts: ['Chest'],
    exerciseType: 'weight_reps',
    targetMuscles: ['Pectoralis Major Clavicular Head'],
    secondaryMuscles: ['Deltoid Anterior', 'Pectoralis Major Clavicular Head', 'Triceps Brachii'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Chest workout with barbell',
      'Barbell bench press exercise',
      'Strength training for chest',
      'Upper body workout with barbell',
      'Barbell chest exercises',
      'Bench press for chest muscles',
      'Building chest muscles with bench press',
      'Chest strengthening with barbell',
      'Bench press workout routine',
      'Barbell exercises for chest muscle growth',
    ],
    overview:
      'The Bench Press is a classic strength training exercise that primarily targets the chest, shoulders, and triceps, contributing to upper body muscle development. It is suitable for anyone, from beginners to professional athletes, looking to improve their upper body strength and muscular endurance. Individuals may want to incorporate bench press into their routine for its effectiveness in enhancing physical performance, promoting bone health, and improving body composition.',
    instructions: [
      'Grip the barbell with your hands slightly wider than shoulder-width apart, palms facing your feet, and lift it off the rack, holding it straight over your chest with your arms fully extended.',
      'Slowly lower the barbell down to your chest while keeping your elbows at a 90-degree angle.',
      'Once the barbell touches your chest, push it back up to the starting position while keeping your back flat on the bench.',
      'Repeat this process for the desired number of repetitions, always maintaining control of the barbell and ensuring your form is correct.',
    ],
    exerciseTips: [
      'Avoid Arching Your Back: One common mistake is excessively arching the back during the lift. This can lead to lower back injuries. Your lower back should have a natural arch, but it should not be overly exaggerated. Your butt, shoulders, and head should maintain contact with the bench at all times.',
      'Controlled Movement: Avoid the temptation to lift the barbell too quickly. A controlled, steady lift is more effective and reduces the risk of injury. Lower the bar to your mid-chest slowly, pause briefly, then push it back up without locking your elbows at the top.',
      "Don't Lift Alone: Always have a spotter when lifting heavy weights to ensure safety.",
    ],
    variations: [
      'Decline Bench Press: This variation is performed on a decline bench to target the lower part of the chest.',
      'Close-Grip Bench Press: This variation focuses on the triceps and the inner part of the chest by placing the hands closer together on the bar.',
      'Dumbbell Bench Press: This variation uses dumbbells instead of a barbell, allowing for a greater range of motion and individual arm movement.',
      'Reverse-Grip Bench Press: This variation is performed by flipping your grip so that your palms face towards you, targeting the upper chest and triceps.',
    ],
    relatedExerciseIds: [
      'U0uPZBq_main',
      'QD32SbB',
      'pdm4AfV',
      'SebLXCG',
      'T3JogV7',
      'hiWPEs1',
      'Y5ppDdt',
      'C8OV7Pv',
      'r3tQt3U',
      'dCSgT7N',
    ],
  },
  {
    exerciseId: 'U0uPZBq_main',
    name: 'Squat',
    imageUrl: '/demo-img.png',
    equipments: ['Barbell'],
    bodyParts: ['Legs'],
    exerciseType: 'weight_reps',
    targetMuscles: ['Quadriceps'],
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Calves'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Leg workout with barbell',
      'Barbell squat exercise',
      'Strength training for legs',
      'Lower body workout with barbell',
      'Barbell leg exercises',
      'Squat for leg muscles',
      'Building leg muscles with squat',
      'Leg strengthening with barbell',
      'Squat workout routine',
      'Barbell exercises for leg muscle growth',
    ],
    overview:
      "The Squat is a fundamental compound exercise that targets the quadriceps, glutes, and hamstrings. It's essential for building lower body strength and improving functional movement patterns.",
    instructions: [
      'Stand with your feet shoulder-width apart, toes slightly pointed out.',
      'Hold the barbell across your upper back, keeping your chest up and core engaged.',
      'Lower your body by bending your knees and hips, as if sitting back into a chair.',
      'Descend until your thighs are parallel to the floor, then drive through your heels to return to the starting position.',
    ],
    exerciseTips: [
      'Keep your chest up and back straight throughout the movement.',
      "Ensure your knees track over your toes and don't cave inward.",
      'Drive through your heels, not your toes, when standing up.',
    ],
    variations: [
      'Front Squat: Hold the barbell in front of your shoulders.',
      'Goblet Squat: Hold a dumbbell or kettlebell at chest level.',
      'Bulgarian Split Squat: Single-leg variation with rear foot elevated.',
    ],
    relatedExerciseIds: ['K6NnTv0', 'QD32SbB', 'pdm4AfV'],
  },
  {
    exerciseId: 'QD32SbB',
    name: 'Deadlift',
    imageUrl: '/demo-img.png',
    equipments: ['Barbell'],
    bodyParts: ['Back'],
    exerciseType: 'weight_reps',
    targetMuscles: ['Erector Spinae'],
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Lats'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Back workout with barbell',
      'Barbell deadlift exercise',
      'Strength training for back',
      'Posterior chain workout',
      'Barbell back exercises',
      'Deadlift for back muscles',
      'Building back muscles with deadlift',
      'Back strengthening with barbell',
      'Deadlift workout routine',
      'Barbell exercises for back muscle growth',
    ],
    overview:
      "The Deadlift is a compound exercise that primarily targets the posterior chain, including the back, glutes, and hamstrings. It's one of the most effective exercises for building overall strength.",
    instructions: [
      'Stand with your feet hip-width apart, with the barbell over the middle of your feet.',
      'Bend at the hips and knees to grip the bar, keeping your back straight and chest up.',
      'Drive through your heels and extend your hips and knees to lift the bar.',
      'Keep the bar close to your body as you stand up, then lower it back down with control.',
    ],
    exerciseTips: [
      'Maintain a neutral spine throughout the movement.',
      'Keep the bar close to your body - it should almost drag up your legs.',
      'Engage your lats by pulling your shoulders back before lifting.',
    ],
    variations: [
      'Romanian Deadlift: Focuses more on the hamstrings with less knee bend.',
      'Sumo Deadlift: Wider stance targets inner thighs more.',
      'Trap Bar Deadlift: Uses a hexagonal bar for a more upright position.',
    ],
    relatedExerciseIds: ['K6NnTv0', 'U0uPZBq_main', 'pdm4AfV'],
  },
  {
    exerciseId: 'pdm4AfV',
    name: 'Overhead Press',
    imageUrl: '/demo-img.png',
    equipments: ['Barbell'],
    bodyParts: ['Shoulders'],
    exerciseType: 'weight_reps',
    targetMuscles: ['Deltoid Anterior'],
    secondaryMuscles: ['Triceps Brachii', 'Core'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Shoulder workout with barbell',
      'Barbell overhead press exercise',
      'Strength training for shoulders',
      'Upper body workout with barbell',
      'Barbell shoulder exercises',
      'Overhead press for shoulder muscles',
      'Building shoulder muscles with press',
      'Shoulder strengthening with barbell',
      'Overhead press workout routine',
      'Barbell exercises for shoulder muscle growth',
    ],
    overview:
      "The Overhead Press is a compound exercise that targets the shoulders and triceps while also engaging the core for stability. It's excellent for building upper body strength and improving shoulder mobility.",
    instructions: [
      'Stand with your feet shoulder-width apart, holding the barbell at shoulder height.',
      'Grip the bar slightly wider than shoulder-width, with your palms facing forward.',
      'Press the bar straight up overhead, keeping your core tight and avoiding arching your back excessively.',
      'Lower the bar back to shoulder height with control.',
    ],
    exerciseTips: [
      'Keep your core engaged throughout the movement to protect your lower back.',
      'Press the bar in a straight line, not forward or backward.',
      "Don't use leg drive - this should be a strict press.",
    ],
    variations: [
      'Push Press: Uses leg drive to help press the weight overhead.',
      'Seated Overhead Press: Removes leg drive and focuses purely on upper body.',
      'Dumbbell Overhead Press: Allows for independent arm movement.',
    ],
    relatedExerciseIds: ['K6NnTv0', 'U0uPZBq_main', 'QD32SbB'],
  },
  {
    exerciseId: 'SebLXCG',
    name: 'Pull Up',
    imageUrl: '/demo-img.png',
    equipments: ['Pull-up Bar'],
    bodyParts: ['Back'],
    exerciseType: 'reps',
    targetMuscles: ['Latissimus Dorsi'],
    secondaryMuscles: ['Biceps', 'Rhomboids', 'Rear Deltoids'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Back workout with bodyweight',
      'Pull up exercise',
      'Strength training for back',
      'Bodyweight back exercises',
      'Pull up for back muscles',
      'Building back muscles with pull ups',
      'Back strengthening with bodyweight',
      'Pull up workout routine',
      'Bodyweight exercises for back muscle growth',
    ],
    overview:
      "The Pull Up is a bodyweight exercise that primarily targets the latissimus dorsi, biceps, and upper back. It's an excellent exercise for building upper body pulling strength.",
    instructions: [
      'Hang from a pull-up bar with your palms facing away from you, hands slightly wider than shoulder-width.',
      'Pull your body up until your chin clears the bar.',
      'Lower yourself back down with control until your arms are fully extended.',
      'Repeat for the desired number of repetitions.',
    ],
    exerciseTips: [
      'Keep your core engaged and avoid swinging your legs.',
      'Focus on pulling with your back muscles, not just your arms.',
      'Full range of motion is important - go all the way up and all the way down.',
    ],
    variations: [
      'Chin Up: Palms face toward you, targets biceps more.',
      'Wide Grip Pull Up: Wider grip emphasizes the lats more.',
      'Assisted Pull Up: Use a resistance band or machine for assistance.',
    ],
    relatedExerciseIds: ['K6NnTv0', 'QD32SbB', 'T3JogV7'],
  },
  {
    exerciseId: 'T3JogV7llll',
    name: 'Running',
    imageUrl: '/demo-img.png',
    equipments: [],
    bodyParts: ['Cardio'],
    exerciseType: 'distance_duration',
    targetMuscles: ['Cardiovascular System'],
    secondaryMuscles: ['Quadriceps', 'Calves', 'Glutes'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Cardio workout',
      'Running exercise',
      'Cardiovascular training',
      'Endurance workout',
      'Running for fitness',
      'Cardio exercises',
      'Building cardiovascular endurance',
      'Cardio strengthening',
      'Running workout routine',
      'Cardio exercises for fitness',
    ],
    overview:
      'Running is a fundamental cardiovascular exercise that improves heart health, endurance, and overall fitness. It can be performed at various intensities and distances.',
    instructions: [
      'Start with a proper warm-up, including light jogging and dynamic stretches.',
      'Maintain good posture: keep your head up, shoulders relaxed, and core engaged.',
      'Land on the middle of your foot, not your heel or toes.',
      'Maintain a steady breathing rhythm that matches your pace.',
    ],
    exerciseTips: [
      'Start slow and gradually increase distance and pace.',
      'Invest in proper running shoes to prevent injury.',
      'Stay hydrated before, during, and after your run.',
    ],
    variations: [
      'Interval Running: Alternate between high and low intensity.',
      'Long Distance Running: Focus on endurance over longer distances.',
      'Sprint Training: Short bursts of maximum effort.',
    ],
    relatedExerciseIds: ['hiWPEs1', 'Y5ppDdt', 'C8OV7Pv'],
  },
  {
    exerciseId: 'T3JogV7iiii',
    name: 'Running',
    imageUrl: '/demo-img.png',
    equipments: [],
    bodyParts: ['Cardio'],
    exerciseType: 'distance_duration',
    targetMuscles: ['Cardiovascular System'],
    secondaryMuscles: ['Quadriceps', 'Calves', 'Glutes'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Cardio workout',
      'Running exercise',
      'Cardiovascular training',
      'Endurance workout',
      'Running for fitness',
      'Cardio exercises',
      'Building cardiovascular endurance',
      'Cardio strengthening',
      'Running workout routine',
      'Cardio exercises for fitness',
    ],
    overview:
      'Running is a fundamental cardiovascular exercise that improves heart health, endurance, and overall fitness. It can be performed at various intensities and distances.',
    instructions: [
      'Start with a proper warm-up, including light jogging and dynamic stretches.',
      'Maintain good posture: keep your head up, shoulders relaxed, and core engaged.',
      'Land on the middle of your foot, not your heel or toes.',
      'Maintain a steady breathing rhythm that matches your pace.',
    ],
    exerciseTips: [
      'Start slow and gradually increase distance and pace.',
      'Invest in proper running shoes to prevent injury.',
      'Stay hydrated before, during, and after your run.',
    ],
    variations: [
      'Interval Running: Alternate between high and low intensity.',
      'Long Distance Running: Focus on endurance over longer distances.',
      'Sprint Training: Short bursts of maximum effort.',
    ],
    relatedExerciseIds: ['hiWPEs1', 'Y5ppDdt', 'C8OV7Pv'],
  },
  {
    exerciseId: 'T3JogV7jjjj',
    name: 'Running',
    imageUrl: '/demo-img.png',
    equipments: [],
    bodyParts: ['Cardio'],
    exerciseType: 'distance_duration',
    targetMuscles: ['Cardiovascular System'],
    secondaryMuscles: ['Quadriceps', 'Calves', 'Glutes'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Cardio workout',
      'Running exercise',
      'Cardiovascular training',
      'Endurance workout',
      'Running for fitness',
      'Cardio exercises',
      'Building cardiovascular endurance',
      'Cardio strengthening',
      'Running workout routine',
      'Cardio exercises for fitness',
    ],
    overview:
      'Running is a fundamental cardiovascular exercise that improves heart health, endurance, and overall fitness. It can be performed at various intensities and distances.',
    instructions: [
      'Start with a proper warm-up, including light jogging and dynamic stretches.',
      'Maintain good posture: keep your head up, shoulders relaxed, and core engaged.',
      'Land on the middle of your foot, not your heel or toes.',
      'Maintain a steady breathing rhythm that matches your pace.',
    ],
    exerciseTips: [
      'Start slow and gradually increase distance and pace.',
      'Invest in proper running shoes to prevent injury.',
      'Stay hydrated before, during, and after your run.',
    ],
    variations: [
      'Interval Running: Alternate between high and low intensity.',
      'Long Distance Running: Focus on endurance over longer distances.',
      'Sprint Training: Short bursts of maximum effort.',
    ],
    relatedExerciseIds: ['hiWPEs1', 'Y5ppDdt', 'C8OV7Pv'],
  },
  {
    exerciseId: 'T3JogV7aaaa',
    name: 'Running',
    imageUrl: '/demo-img.png',
    equipments: [],
    bodyParts: ['Cardio'],
    exerciseType: 'distance_duration',
    targetMuscles: ['Cardiovascular System'],
    secondaryMuscles: ['Quadriceps', 'Calves', 'Glutes'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Cardio workout',
      'Running exercise',
      'Cardiovascular training',
      'Endurance workout',
      'Running for fitness',
      'Cardio exercises',
      'Building cardiovascular endurance',
      'Cardio strengthening',
      'Running workout routine',
      'Cardio exercises for fitness',
    ],
    overview:
      'Running is a fundamental cardiovascular exercise that improves heart health, endurance, and overall fitness. It can be performed at various intensities and distances.',
    instructions: [
      'Start with a proper warm-up, including light jogging and dynamic stretches.',
      'Maintain good posture: keep your head up, shoulders relaxed, and core engaged.',
      'Land on the middle of your foot, not your heel or toes.',
      'Maintain a steady breathing rhythm that matches your pace.',
    ],
    exerciseTips: [
      'Start slow and gradually increase distance and pace.',
      'Invest in proper running shoes to prevent injury.',
      'Stay hydrated before, during, and after your run.',
    ],
    variations: [
      'Interval Running: Alternate between high and low intensity.',
      'Long Distance Running: Focus on endurance over longer distances.',
      'Sprint Training: Short bursts of maximum effort.',
    ],
    relatedExerciseIds: ['hiWPEs1', 'Y5ppDdt', 'C8OV7Pv'],
  },
  {
    exerciseId: 'T3JogV7fff',
    name: 'Running',
    imageUrl: '/demo-img.png',
    equipments: [],
    bodyParts: ['Cardio'],
    exerciseType: 'distance_duration',
    targetMuscles: ['Cardiovascular System'],
    secondaryMuscles: ['Quadriceps', 'Calves', 'Glutes'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Cardio workout',
      'Running exercise',
      'Cardiovascular training',
      'Endurance workout',
      'Running for fitness',
      'Cardio exercises',
      'Building cardiovascular endurance',
      'Cardio strengthening',
      'Running workout routine',
      'Cardio exercises for fitness',
    ],
    overview:
      'Running is a fundamental cardiovascular exercise that improves heart health, endurance, and overall fitness. It can be performed at various intensities and distances.',
    instructions: [
      'Start with a proper warm-up, including light jogging and dynamic stretches.',
      'Maintain good posture: keep your head up, shoulders relaxed, and core engaged.',
      'Land on the middle of your foot, not your heel or toes.',
      'Maintain a steady breathing rhythm that matches your pace.',
    ],
    exerciseTips: [
      'Start slow and gradually increase distance and pace.',
      'Invest in proper running shoes to prevent injury.',
      'Stay hydrated before, during, and after your run.',
    ],
    variations: [
      'Interval Running: Alternate between high and low intensity.',
      'Long Distance Running: Focus on endurance over longer distances.',
      'Sprint Training: Short bursts of maximum effort.',
    ],
    relatedExerciseIds: ['hiWPEs1', 'Y5ppDdt', 'C8OV7Pv'],
  },
  {
    exerciseId: 'T3JogV7gggg',
    name: 'Running',
    imageUrl: '/demo-img.png',
    equipments: [],
    bodyParts: ['Cardio'],
    exerciseType: 'distance_duration',
    targetMuscles: ['Cardiovascular System'],
    secondaryMuscles: ['Quadriceps', 'Calves', 'Glutes'],
    videoUrl: '/demo-video.mp4',
    keywords: [
      'Cardio workout',
      'Running exercise',
      'Cardiovascular training',
      'Endurance workout',
      'Running for fitness',
      'Cardio exercises',
      'Building cardiovascular endurance',
      'Cardio strengthening',
      'Running workout routine',
      'Cardio exercises for fitness',
    ],
    overview:
      'Running is a fundamental cardiovascular exercise that improves heart health, endurance, and overall fitness. It can be performed at various intensities and distances.',
    instructions: [
      'Start with a proper warm-up, including light jogging and dynamic stretches.',
      'Maintain good posture: keep your head up, shoulders relaxed, and core engaged.',
      'Land on the middle of your foot, not your heel or toes.',
      'Maintain a steady breathing rhythm that matches your pace.',
    ],
    exerciseTips: [
      'Start slow and gradually increase distance and pace.',
      'Invest in proper running shoes to prevent injury.',
      'Stay hydrated before, during, and after your run.',
    ],
    variations: [
      'Interval Running: Alternate between high and low intensity.',
      'Long Distance Running: Focus on endurance over longer distances.',
      'Sprint Training: Short bursts of maximum effort.',
    ],
    relatedExerciseIds: ['hiWPEs1', 'Y5ppDdt', 'C8OV7Pv'],
  },
];

const isFuzzyMatch = (text: string, query: string): boolean => {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return true;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }

  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
    if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
      queryIndex += 1;
    }
    textIndex += 1;
  }

  return queryIndex === normalizedQuery.length;
};

export type ExerciseFilters = {
  hideCustom?: boolean;
  muscles?: string[];
  types?: string[];
  categories?: string[];
  difficulties?: string[];
  equipments?: string[];
};

export const searchExercises = (query: string, filters?: ExerciseFilters): Exercise[] => {
  const normalizedQuery = query.trim().toLowerCase();

  let results = mockExercises;

  // Apply text search if query exists
  if (normalizedQuery) {
    results = results.filter((exercise) => {
      const matchesName = isFuzzyMatch(exercise.name, normalizedQuery);
      const matchesBodyPart = exercise.bodyParts.some((part) => isFuzzyMatch(part, normalizedQuery));
      const matchesEquipment = exercise.equipments.some((equipment) =>
        isFuzzyMatch(equipment, normalizedQuery)
      );
      const matchesTargetMuscle = exercise.targetMuscles.some((muscle) =>
        isFuzzyMatch(muscle, normalizedQuery)
      );
      const matchesKeyword = exercise.keywords.some((keyword) =>
        isFuzzyMatch(keyword, normalizedQuery)
      );

      return (
        matchesName || matchesBodyPart || matchesEquipment || matchesTargetMuscle || matchesKeyword
      );
    });
  }

  // Apply filters
  if (filters) {
    if (filters.hideCustom) {
      // Logic for hiding custom exercises - assuming all mocks are 'standard' for now
      // If we had a isCustom field, we would filter here.
    }

    if (filters.muscles && filters.muscles.length > 0) {
      results = results.filter(ex =>
        ex.targetMuscles.some(m => filters.muscles?.includes(m)) ||
        ex.bodyParts.some(bp => filters.muscles?.includes(bp))
      );
    }

    if (filters.types && filters.types.length > 0) {
      results = results.filter(ex => filters.types?.includes(ex.exerciseType));
    }

    if (filters.equipments && filters.equipments.length > 0) {
      results = results.filter(ex =>
        ex.equipments.some(eq => filters.equipments?.includes(eq))
      );
    }

    // Category and Difficulty are not currently in the mock data, 
    // but we'll include the checks for future compatibility
    if (filters.categories && filters.categories.length > 0) {
      // Mock logic: results = results.filter(ex => filters.categories.includes(ex.category));
    }

    if (filters.difficulties && filters.difficulties.length > 0) {
      // Mock logic: results = results.filter(ex => filters.difficulties.includes(ex.difficulty));
    }
  }

  return results;
};
