/**
 * Service methods for exercise operations
 * These will be connected to the backend in the future
 */

export type Exercise = {
  id: string;
  program: string; // Exercise name
  description: string; // Exercise instructions
  category: string;
  muscleGroup: string[]; // Array of muscle groups
  equipment: string;
  modality: string;
  created: string; // dd-mm-yy format
  videoLink?: string;
};

/**
 * Get all exercises
 * @returns Promise<Exercise[]>
 */
export const getExercises = async (): Promise<Exercise[]> => {
  // TODO: Connect to backend API
  // This is a placeholder that returns dummy data for now
  
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy data based on the create exercise form schema
  const dummyExercises: Exercise[] = [
    {
      id: '1',
      program: 'Bench Press',
      description: 'Lie on bench, lower bar to chest, press up. Focus on controlled movement and full range of motion.',
      category: 'Weight & Reps',
      muscleGroup: ['Chest', 'Triceps', 'Shoulders'],
      equipment: 'Barbell',
      modality: 'Strength',
      created: '15-01-24',
      videoLink: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    },
    {
      id: '2',
      program: 'Pull-ups',
      description: 'Hang from bar, pull body up until chin clears bar, lower with control. Keep core engaged throughout.',
      category: 'Reps',
      muscleGroup: ['Back', 'Biceps', 'Lats'],
      equipment: 'Bodyweight',
      modality: 'Strength',
      created: '14-01-24',
      videoLink: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    },
    {
      id: '3',
      program: 'Squats',
      description: 'Stand with feet shoulder-width apart, lower hips back and down, keep knees tracking over toes, return to standing.',
      category: 'Weight & Reps',
      muscleGroup: ['Quadriceps', 'Glutes', 'Hamstrings'],
      equipment: 'Barbell',
      modality: 'Strength',
      created: '13-01-24',
      videoLink: 'https://www.youtube.com/watch?v=YaXPRqUwItQ',
    },
    {
      id: '4',
      program: 'Deadlift',
      description: 'Stand with feet hip-width apart, hinge at hips, grip bar, drive through heels to stand, keep back straight.',
      category: 'Weight & Reps',
      muscleGroup: ['Back', 'Glutes', 'Hamstrings', 'Traps'],
      equipment: 'Barbell',
      modality: 'Strength',
      created: '12-01-24',
    },
    {
      id: '5',
      program: 'Running',
      description: 'Maintain steady pace, focus on breathing rhythm, land mid-foot, keep posture upright.',
      category: 'Distance / Duration',
      muscleGroup: ['Quadriceps', 'Calves', 'Glutes'],
      equipment: 'Bodyweight',
      modality: 'Cardio',
      created: '11-01-24',
      videoLink: 'https://vimeo.com/123456789',
    },
    {
      id: '6',
      program: 'Box Jumps',
      description: 'Stand facing box, jump onto box landing softly, step down and repeat. Focus on explosive power.',
      category: 'Reps',
      muscleGroup: ['Quadriceps', 'Glutes', 'Calves'],
      equipment: 'Bodyweight',
      modality: 'Plyos',
      created: '10-01-24',
    },
    {
      id: '7',
      program: 'Shoulder Press',
      description: 'Press weight overhead, lower with control. Keep core tight and avoid arching back excessively.',
      category: 'Weight & Reps',
      muscleGroup: ['Shoulders', 'Triceps', 'Delts'],
      equipment: 'Dumbbell',
      modality: 'Strength',
      created: '09-01-24',
    },
    {
      id: '8',
      program: 'Plank',
      description: 'Hold body in straight line, support on forearms and toes, engage core, breathe normally.',
      category: 'Distance / Duration',
      muscleGroup: ['Abs', 'Obliques', 'Full Body'],
      equipment: 'Bodyweight',
      modality: 'Stability',
      created: '08-01-24',
    },
    {
      id: '9',
      program: 'Bicep Curls',
      description: 'Curl weight toward shoulders, squeeze at top, lower with control. Keep elbows stationary.',
      category: 'Weight & Reps',
      muscleGroup: ['Biceps', 'Forearms'],
      equipment: 'Dumbbell',
      modality: 'Strength',
      created: '07-01-24',
    },
    {
      id: '10',
      program: 'Yoga Flow',
      description: 'Move through poses with breath, maintain alignment, focus on flexibility and balance.',
      category: 'Distance / Duration',
      muscleGroup: ['Full Body'],
      equipment: 'Bodyweight',
      modality: 'Mobility',
      created: '06-01-24',
    },
  ];

  return dummyExercises;

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/exercises', {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to fetch exercises')
  // return await response.json()
};

/**
 * Star an exercise or multiple exercises
 * @param exerciseIds - Single exercise ID or array of exercise IDs
 */
export const starExercises = async (exerciseIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];
  
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Starring exercises:', { exerciseIds: ids });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/exercises/star', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ exerciseIds: ids }),
  // })
  // if (!response.ok) throw new Error('Failed to star exercises')
  // return await response.json()
};

/**
 * Archive an exercise or multiple exercises
 * @param exerciseIds - Single exercise ID or array of exercise IDs
 */
export const archiveExercises = async (exerciseIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];
  
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Archiving exercises:', { exerciseIds: ids });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/exercises/archive', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ exerciseIds: ids }),
  // })
  // if (!response.ok) throw new Error('Failed to archive exercises')
  // return await response.json()
};

/**
 * Delete an exercise or multiple exercises
 * @param exerciseIds - Single exercise ID or array of exercise IDs
 */
export const deleteExercises = async (exerciseIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];
  
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Deleting exercises:', { exerciseIds: ids });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/exercises/delete', {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ exerciseIds: ids }),
  // })
  // if (!response.ok) throw new Error('Failed to delete exercises')
  // return await response.json()
};

/**
 * Create a new exercise
 * @param exerciseData - Exercise data from the form
 */
export const createExercise = async (exerciseData: {
  name: string;
  instructions?: string;
  videoLink?: string;
  category: string;
  muscleGroups: string[];
  equipment: string;
  modality: string;
}): Promise<Exercise> => {
  // TODO: Connect to backend API
  console.log('Creating exercise:', exerciseData);

  await new Promise((resolve) => setTimeout(resolve, 200));

  // Return a mock created exercise
  const newExercise: Exercise = {
    id: Date.now().toString(),
    program: exerciseData.name,
    description: exerciseData.instructions || '',
    category: exerciseData.category,
    muscleGroup: exerciseData.muscleGroups,
    equipment: exerciseData.equipment,
    modality: exerciseData.modality,
    created: new Date().toLocaleDateString('en-GB').replace(/\//g, '-').slice(0, 8),
    videoLink: exerciseData.videoLink,
  };

  return newExercise;
};

/**
 * Update an existing exercise
 * @param exerciseId - ID of the exercise to update
 * @param exerciseData - Updated exercise data from the form
 */
export const editExercise = async (
  exerciseId: string,
  exerciseData: {
    name: string;
    instructions?: string;
    videoLink?: string;
    category: string;
    muscleGroups: string[];
    equipment: string;
    modality: string;
  }
): Promise<Exercise> => {
  // TODO: Connect to backend API
  console.log('Editing exercise:', { exerciseId, exerciseData });

  await new Promise((resolve) => setTimeout(resolve, 200));

  // Return a mock updated exercise
  const updatedExercise: Exercise = {
    id: exerciseId,
    program: exerciseData.name,
    description: exerciseData.instructions || '',
    category: exerciseData.category,
    muscleGroup: exerciseData.muscleGroups,
    equipment: exerciseData.equipment,
    modality: exerciseData.modality,
    created: new Date().toLocaleDateString('en-GB').replace(/\//g, '-').slice(0, 8), // Keep original or update?
    videoLink: exerciseData.videoLink,
  };

  return updatedExercise;
};

