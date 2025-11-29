import type { ClientData } from './csv-parser';

export interface AddClientData {
  firstName: string;
  lastName: string;
  email: string;
  coachingType: 'online' | 'in-person';
}

export interface AddClientsData {
  clients: ClientData[];
}

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  coachingType: 'online' | 'in-person';
  category?: string;
  createdAt: number; // timestamp in milliseconds
}

/**
 * Dummy athlete service method to add a single client
 * This will be connected to the backend in the future
 */
export const addClient = async (data: AddClientData): Promise<Athlete> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Adding client:', {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    coachingType: data.coachingType,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy response - in the future, this will come from the backend
  const newAthlete: Athlete = {
    id: `athlete-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    coachingType: data.coachingType,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/athletes', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to add client')
  // return await response.json()

  return newAthlete;
};

/**
 * Dummy athlete service method to add multiple clients (bulk upload)
 * This will be connected to the backend in the future
 */
export const addClients = async (data: AddClientsData): Promise<Athlete[]> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Adding clients:', {
    count: data.clients.length,
    clients: data.clients.map((client) => ({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      category: client.category,
    })),
  });

  // Simulate API call delay (longer for bulk operations)
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Dummy response - in the future, this will come from the backend
  const newAthletes: Athlete[] = data.clients.map((client) => ({
    id: `athlete-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    coachingType: 'online', // Default for bulk uploads, can be updated later
    category: client.category,
    createdAt: Date.now(),
  }));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/athletes/bulk', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to add clients')
  // return await response.json()

  return newAthletes;
};

/**
 * Dummy athlete service method to archive a user
 * This will be connected to the backend in the future
 */
export const archiveUser = async (athleteId: string): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Archiving user:', {
    athleteId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${athleteId}/archive`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to archive user')
  // return await response.json()
};

export interface TrainingCalendarSchema {
  [date: string]: Array<{
    id: string;
    program: string;
    description: string;
    type: string;
    length: string;
    totalExercises: number;
    equipment: string;
    created: string;
  }>;
}

export interface WorkoutCompletionStatus {
  workoutId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: number; // timestamp in milliseconds (only present when status is 'completed')
  startedAt?: number; // timestamp in milliseconds (only present when status is 'in_progress' or 'completed')
}

export interface SetCompletionStatus {
  workoutId: string;
  exerciseInstanceId: string;
  setNumber: number;
  status: 'not_started' | 'completed';
  completedAt?: number; // timestamp in milliseconds (only present when status is 'completed')
}

export interface SectionCompletionStatus {
  workoutId: string;
  sectionId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: number; // timestamp in milliseconds (only present when status is 'completed')
  startedAt?: number; // timestamp in milliseconds (only present when status is 'in_progress' or 'completed')
}

export interface TrainingCalendarCompletionLogs {
  workouts: WorkoutCompletionStatus[];
  sets: SetCompletionStatus[];
  sections: SectionCompletionStatus[]; // For AMRAP and timed sections
}

/**
 * Service method to get the training calendar for a client
 * This will be connected to the backend in the future
 */
export const getTrainingCalendar = async (
  clientId: string
): Promise<TrainingCalendarSchema> => {
  // TODO: Connect to backend API
  // This is a placeholder that returns mock data for John Smith

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock data for John Smith (id: '1')
  if (clientId === '1') {
    return mockJohnSmithTrainingCalendar;
  }

  // Return empty calendar for other clients
  return {};

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${clientId}/training-calendar`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get training calendar')
  // return await response.json()
};

/**
 * Service method to get training calendar completion logs for a client
 * 
 * The completion logs include:
 * - workouts: Array of workout completion status with status flag ('not_started' | 'in_progress' | 'completed')
 * - sets: Array of set completion status with status flag ('not_started' | 'completed')
 * 
 * The status flag is the primary field that determines the completion state.
 * Timestamps (completedAt, startedAt) are optional metadata.
 * 
 * This will be connected to the backend in the future
 */
export const getTrainingCalendarCompletionLogs = async (
  clientId: string
): Promise<TrainingCalendarCompletionLogs> => {
  // TODO: Connect to backend API
  // This is a placeholder that returns mock data for John Smith

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock data for John Smith (id: '1')
  if (clientId === '1') {
    return mockJohnSmithCompletionLogs;
  }

  // Return empty logs for other clients
  return { workouts: [], sets: [] };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${clientId}/training-calendar/completion-logs`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get completion logs')
  // return await response.json()
};

/**
 * Service method to update the training calendar
 * This will be connected to the backend in the future
 */
export const updateTrainingCalendar = async (
  clientId: string,
  schema: TrainingCalendarSchema
): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Updating training calendar:', {
    clientId,
    schema,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${clientId}/training-calendar`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(schema),
  // })
  // if (!response.ok) throw new Error('Failed to update training calendar')
  // return await response.json()
};

// Mock training calendar for John Smith (id: '1')
// Creates a 4-week schedule starting from the current week
const mockJohnSmithTrainingCalendar: TrainingCalendarSchema = (() => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  const formatDateForSchema = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calendar: TrainingCalendarSchema = {};

  // Create a 4-week schedule (Monday, Wednesday, Friday pattern)
  for (let week = 0; week < 4; week++) {
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() + week * 7);

    // Monday - Strength Builder
    const mondayDate = new Date(weekStart);
    const mondayKey = formatDateForSchema(mondayDate);
    calendar[mondayKey] = [
      {
        id: `1-${mondayKey}-strength`,
        program: 'Strength Builder',
        description:
          'A comprehensive strength training program designed to build muscle mass and increase overall strength.',
        type: 'Strength',
        length: '12 weeks',
        totalExercises: 24,
        equipment: 'Barbell, Dumbbells, Bench',
        created: '15-03-24',
      },
    ];

    // Wednesday - HIIT Power
    const wednesdayDate = new Date(weekStart);
    wednesdayDate.setDate(weekStart.getDate() + 2);
    const wednesdayKey = formatDateForSchema(wednesdayDate);
    calendar[wednesdayKey] = [
      {
        id: `2-${wednesdayKey}-hiit`,
        program: 'HIIT Power',
        description:
          'High-intensity interval training program that alternates between intense bursts of activity and fixed periods of rest.',
        type: 'HIIT',
        length: '4 weeks',
        totalExercises: 12,
        equipment: 'Bodyweight, Kettlebells',
        created: '05-04-24',
      },
    ];

    // Friday - Strength Builder
    const fridayDate = new Date(weekStart);
    fridayDate.setDate(weekStart.getDate() + 4);
    const fridayKey = formatDateForSchema(fridayDate);
    calendar[fridayKey] = [
      {
        id: `3-${fridayKey}-strength`,
        program: 'Strength Builder',
        description:
          'A comprehensive strength training program designed to build muscle mass and increase overall strength.',
        type: 'Strength',
        length: '12 weeks',
        totalExercises: 24,
        equipment: 'Barbell, Dumbbells, Bench',
        created: '15-03-24',
      },
    ];
  }

  return calendar;
})();

// Mock completion logs for John Smith
const mockJohnSmithCompletionLogs: TrainingCalendarCompletionLogs = (() => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  const formatDateForSchema = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const workouts: WorkoutCompletionStatus[] = [];
  const sets: SetCompletionStatus[] = [];

  // Week 1 - All completed (past week)
  const week1Monday = new Date(monday);
  week1Monday.setDate(monday.getDate() - 7);
  const week1MondayKey = formatDateForSchema(week1Monday);
  const week1MondayWorkoutId = `1-${week1MondayKey}-strength`;
  workouts.push({
    workoutId: week1MondayWorkoutId,
    status: 'completed',
    completedAt: week1Monday.getTime() + 18 * 60 * 60 * 1000, // 6 PM
    startedAt: week1Monday.getTime() + 17 * 60 * 60 * 1000, // 5 PM
  });
  // Complete all sets for this workout
  for (let setNum = 1; setNum <= 3; setNum++) {
    sets.push({
      workoutId: week1MondayWorkoutId,
      exerciseInstanceId: 'ex-1-inst',
      setNumber: setNum,
      status: 'completed',
      completedAt: week1Monday.getTime() + 17 * 60 * 60 * 1000 + setNum * 5 * 60 * 1000,
    });
  }

  const week1Wednesday = new Date(week1Monday);
  week1Wednesday.setDate(week1Monday.getDate() + 2);
  const week1WednesdayKey = formatDateForSchema(week1Wednesday);
  const week1WednesdayWorkoutId = `2-${week1WednesdayKey}-hiit`;
  workouts.push({
    workoutId: week1WednesdayWorkoutId,
    status: 'completed',
    completedAt: week1Wednesday.getTime() + 19 * 60 * 60 * 1000, // 7 PM
    startedAt: week1Wednesday.getTime() + 18 * 60 * 60 * 1000, // 6 PM
  });

  const week1Friday = new Date(week1Monday);
  week1Friday.setDate(week1Monday.getDate() + 4);
  const week1FridayKey = formatDateForSchema(week1Friday);
  const week1FridayWorkoutId = `3-${week1FridayKey}-strength`;
  workouts.push({
    workoutId: week1FridayWorkoutId,
    status: 'completed',
    completedAt: week1Friday.getTime() + 18 * 60 * 60 * 1000, // 6 PM
    startedAt: week1Friday.getTime() + 17 * 60 * 60 * 1000, // 5 PM
  });

  // Week 2 - Current week
  const week2Monday = new Date(monday);
  const week2MondayKey = formatDateForSchema(week2Monday);
  const week2MondayWorkoutId = `1-${week2MondayKey}-strength`;
  
  // If Monday is in the past, mark as completed
  if (week2Monday < today) {
    workouts.push({
      workoutId: week2MondayWorkoutId,
      status: 'completed',
      completedAt: week2Monday.getTime() + 18 * 60 * 60 * 1000,
      startedAt: week2Monday.getTime() + 17 * 60 * 60 * 1000,
    });
    // Complete 2 out of 3 sets
    for (let setNum = 1; setNum <= 2; setNum++) {
      sets.push({
        workoutId: week2MondayWorkoutId,
        exerciseInstanceId: 'ex-1-inst',
        setNumber: setNum,
        status: 'completed',
        completedAt: week2Monday.getTime() + 17 * 60 * 60 * 1000 + setNum * 5 * 60 * 1000,
      });
    }
  }

  const week2Wednesday = new Date(monday);
  week2Wednesday.setDate(monday.getDate() + 2);
  const week2WednesdayKey = formatDateForSchema(week2Wednesday);
  const week2WednesdayWorkoutId = `2-${week2WednesdayKey}-hiit`;
  
  // If Wednesday is today or in the past, mark as in progress
  if (week2Wednesday <= today) {
    workouts.push({
      workoutId: week2WednesdayWorkoutId,
      status: 'in_progress',
      startedAt: week2Wednesday.getTime() + 18 * 60 * 60 * 1000,
    });
  }

  // Week 3 and 4 - Future weeks (not started)
  // No entries needed as they default to 'not_started'

  return { workouts, sets };
})();

