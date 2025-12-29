import { apiFetch } from '../api-client';

export interface AthleteDetails {
  name: string;
  email: string;
  birthDate: string | null;
  category: 'online' | 'in-person' | 'hybrid';
  gender: 'male' | 'female' | 'prefer-not-to-say' | null;
  phone: string;
  country: string;
  avatarUrl?: string | null;
  avatarFile?: File | null;
}

export interface AthleteGoal {
  id: string;
  goal: string;
  target_date: string | null;
  achieved: boolean;
}

export interface AthleteInjury {
  id: string;
  injury: string;
  date: string | null;
}

/**
 * Service method to get athlete bio
 */
export const getAthleteBio = async (athleteId: string): Promise<string> => {
  const response = await apiFetch('/clients/bio', {
    headers: { 'x-client-id': athleteId },
  });
  return response.data.bio || '';
};

/**
 * Service method to save athlete bio
 */
export const saveAthleteBio = async (athleteId: string, bio: string): Promise<void> => {
  await apiFetch('/clients/bio', {
    method: 'PATCH',
    headers: { 'x-client-id': athleteId },
    body: JSON.stringify({ bio }),
  });
};

/**
 * Service method to get athlete goals
 */
export const getAthleteGoals = async (athleteId: string): Promise<AthleteGoal[]> => {
  const response = await apiFetch('/clients/goals', {
    headers: { 'x-client-id': athleteId },
  });
  return response.data.goals || [];
};

/**
 * Service method to save athlete goals
 */
export const saveAthleteGoals = async (athleteId: string, goals: Partial<AthleteGoal>[]): Promise<void> => {
  await apiFetch('/clients/goals', {
    method: 'PATCH',
    headers: { 'x-client-id': athleteId },
    body: JSON.stringify({ goals }),
  });
};

/**
 * Service method to get athlete injuries
 */
export const getAthleteInjuries = async (athleteId: string): Promise<AthleteInjury[]> => {
  const response = await apiFetch('/clients/injuries', {
    headers: { 'x-client-id': athleteId },
  });
  return response.data.injuries || [];
};

/**
 * Service method to save athlete injuries
 */
export const saveAthleteInjuries = async (athleteId: string, injuries: Partial<AthleteInjury>[]): Promise<void> => {
  await apiFetch('/clients/injuries', {
    method: 'PATCH',
    headers: { 'x-client-id': athleteId },
    body: JSON.stringify({ injuries }),
  });
};

export const getAthleteDetails = async (athleteId?: string): Promise<AthleteDetails> => {
  // Use x-client-id header if athleteId is provided (coach viewing client)
  // Otherwise fetch authenticated user's profile (client viewing own profile)
  const headers: Record<string, string> = athleteId ? { 'x-client-id': athleteId } : {};
  const response = await apiFetch('/client', { headers });
  const profile = response.data.profile;

  if (!profile) {
    throw new Error('Client not found');
  }

  // The backend client-profile controller returns a merged profile structure
  return {
    name: profile.name || '',
    email: profile.email || '',
    birthDate: profile.date_of_birth || null,
    category: profile.category || 'online',
    gender: profile.gender || null,
    phone: profile.phone || '',
    country: profile.country || '',
    avatarUrl: profile.profile_picture_url || null,
  };
};

/**
 * Service method to save athlete details
 */
export const saveAthleteDetails = async (athleteId: string, details: AthleteDetails): Promise<void> => {
  // Use x-client-id header if athleteId is provided (coach updating client)
  // Otherwise update authenticated user's profile (client updating own profile)
  const headers: Record<string, string> = athleteId ? { 'x-client-id': athleteId } : {};

  // Map AthleteDetails back to DB structure
  const updatePayload: any = {
    name: details.name,
    phone: details.phone,
    gender: details.gender,
    country: details.country,
    birth_date: details.birthDate,
  };

  if (details.avatarUrl) {
    updatePayload.profile_picture_url = details.avatarUrl;
  }

  let body: any = JSON.stringify(updatePayload);

  if (details.avatarFile) {
    const formData = new FormData();
    // Add file as 'avatar'
    formData.append('avatar', details.avatarFile);
    // Add other fields
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] !== undefined && updatePayload[key] !== null) {
        formData.append(key, updatePayload[key]);
      }
    });
    // Add ID to body for coach-client controller if needed (it uses req.body.id)
    if (athleteId) {
      formData.append('id', athleteId);
    }
    body = formData;
  } else {
    // If no file, but we have athleteId, we need to include it in the JSON body
    // because the backend coach-clients.controller.ts expects 'id' in req.body
    if (athleteId) {
      updatePayload.id = athleteId;
      body = JSON.stringify(updatePayload);
    }
  }

  // call /client instead of /clients/:id
  await apiFetch(`/client`, {
    method: 'PATCH',
    headers,
    body,
  });
};
export interface TrainingCalendarSchema {
  [date: string]: Array<{
    id: string;
    program: string;
    description: string;
    type: string;
    difficulty: string;
    length: string;
    totalExercises: number;
    equipment: string | string[];
    created: string;
    workout_data?: any;
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
 * Service method to get the training calendar for a client within a date range
 * Uses the backend API with optimized queries for partitioned table
 */
export const getTrainingCalendarRange = async (
  clientId: string,
  startDate: string, // YYYY-MM-DD format
  endDate: string    // YYYY-MM-DD format
): Promise<TrainingCalendarSchema> => {
  const response = await apiFetch(
    `/client/trainings/calendar`,
    {
      method: 'POST',
      headers: { 'x-client-id': clientId },
      body: JSON.stringify({ startDate, endDate }),
    }
  );
  return response.data.calendar || {};
};

/**
 * Service method to get the training calendar for a client
 * This is the legacy method that returns mock data
 * @deprecated Use getTrainingCalendarRange instead
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
  return { workouts: [], sets: [], sections: [] };

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
        difficulty: 'Intermediate',
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
        difficulty: 'Intermediate',
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
        difficulty: 'Intermediate',
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

  return { workouts, sets, sections: [] };
})();

export interface WorkoutStatistics {
  completed: number;
  inProgress: number;
  notStarted: number;
}

/**
 * Service method to get workout statistics for different time periods
 * This will be connected to the backend in the future
 */
export const getWorkoutStatistics = async (
  clientId: string,
  period: 'last7Days' | 'last30Days' | 'nextWeek'
): Promise<WorkoutStatistics> => {
  console.log('Getting workout statistics:', {
    clientId,
    period,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock data for John Smith (id: '1')
  if (clientId === '1') {
    if (period === 'last7Days') {
      return {
        completed: 4,
        inProgress: 1,
        notStarted: 2,
      };
    }
    if (period === 'last30Days') {
      return {
        completed: 12,
        inProgress: 2,
        notStarted: 10,
      };
    }
    if (period === 'nextWeek') {
      return {
        completed: 0,
        inProgress: 0,
        notStarted: 3,
      };
    }
  }

  // Return empty statistics for other clients
  return {
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${clientId}/workout-statistics?period=${period}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get workout statistics')
  // return await response.json()
};

export interface AssignedItem {
  id: string;
  type: 'program' | 'workout';
  name: string;
  description: string;
  equipment: string;
}

/**
 * Service method to get the current assigned program or workout for a client
 * This will be connected to the backend in the future
 */
export const getCurrentAssignedItem = async (clientId: string): Promise<AssignedItem | null> => {
  console.log('Getting current assigned item:', {
    clientId,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock data for John Smith (id: '1') - returns a program
  if (clientId === '1') {
    return {
      id: '1',
      type: 'program',
      name: 'Strength Builder',
      description:
        'A comprehensive strength training program designed to build muscle mass and increase overall strength. This program focuses on compound movements and progressive overload principles.',
      equipment: 'Barbell, Dumbbells, Bench',
    };
  }

  // Return null for other clients (no assigned item)
  return null;

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${clientId}/current-assigned-item`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get current assigned item')
  // const data = await response.json()
  // return data.item || null
};

export interface StrengthDataPoint {
  date: string; // Format: "MMM YY" or similar
  strength: number; // percentage points from start (0 = starting point)
}

export interface WeightDataPoint {
  date: string; // Format: "MMM YY" or similar
  weight: number; // in kg
}

/**
 * Service method to get strength overview chart data for a client
 * Strength is measured in percentage points from the starting point (0 = start)
 * This will be connected to the backend in the future
 */
export const getStrengthOverview = async (
  clientId: string
): Promise<StrengthDataPoint[]> => {
  console.log('Getting strength overview:', {
    clientId,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Import mockAthletes to get clientFor days
  const { mockAthletes } = await import('@/components/app/app-shell');
  const athlete = mockAthletes.find((a) => a.id === clientId);

  if (!athlete || !athlete.clientFor) {
    return [];
  }

  // Calculate start date (today - clientFor days)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - athlete.clientFor);

  // Generate data points from start date to today
  const dataPoints: StrengthDataPoint[] = [];
  const totalDays = athlete.clientFor;
  const numPoints = Math.min(15, Math.max(6, Math.floor(totalDays / 30))); // 6-15 points based on duration

  // Starting strength is 0 (baseline)
  let currentStrength = 0;

  for (let i = 0; i < numPoints; i++) {
    const date = new Date(startDate);
    const daysOffset = Math.floor((totalDays / (numPoints - 1)) * i);
    date.setDate(startDate.getDate() + daysOffset);

    // Format date as "MMM YY"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    const dateLabel = `${month} ${year}`;

    // Simulate strength changes (percentage points from start)
    // Create more varied patterns: ups, downs, negatives, and fluctuations
    let strengthChange;
    if (i === 0) {
      // Start at 0
      strengthChange = 0;
    } else if (i < numPoints / 3) {
      // Early period: can go negative or positive with larger swings
      strengthChange = (Math.random() - 0.5) * 30; // -15 to +15 percentage points
    } else if (i < (numPoints * 2) / 3) {
      // Middle period: more variation, can drop significantly
      strengthChange = (Math.random() - 0.4) * 25; // -15 to +10 percentage points (slight downward bias)
    } else {
      // Later period: recovery and growth, but still with some drops
      strengthChange = (Math.random() - 0.3) * 20; // -10 to +10 percentage points
    }

    currentStrength = Math.max(-100, Math.min(100, currentStrength + strengthChange));

    dataPoints.push({
      date: dateLabel,
      strength: Math.round(currentStrength * 10) / 10,
    });
  }

  return dataPoints;

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${clientId}/strength-overview`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get strength overview')
  // const data = await response.json()
  // return data.points || []
};

/**
 * Service method to get weight overview chart data for a client
 * Weight is measured in kg, centered around the starting weight
 * This will be connected to the backend in the future
 */
export const getWeightOverview = async (
  clientId: string
): Promise<WeightOverviewResult> => {
  console.log('Getting weight overview:', {
    clientId,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Import mockAthletes to get clientFor days
  const { mockAthletes } = await import('@/components/app/app-shell');
  const athlete = mockAthletes.find((a) => a.id === clientId);

  if (!athlete || !athlete.clientFor) {
    return { dataPoints: [], startingWeight: 0 };
  }

  // Calculate start date (today - clientFor days)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - athlete.clientFor);

  // Generate data points from start date to today
  const dataPoints: WeightDataPoint[] = [];
  const totalDays = athlete.clientFor;
  const numPoints = Math.min(15, Math.max(6, Math.floor(totalDays / 30))); // 6-15 points based on duration

  // Starting weight (mock - in real app, this would come from the first measurement)
  const startingWeight = 80 + Math.random() * 10; // 80-90 kg
  let currentWeight = startingWeight;

  for (let i = 0; i < numPoints; i++) {
    const date = new Date(startDate);
    const daysOffset = Math.floor((totalDays / (numPoints - 1)) * i);
    date.setDate(startDate.getDate() + daysOffset);

    // Format date as "MMM YY"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    const dateLabel = `${month} ${year}`;

    // Simulate weight changes (fluctuates around starting weight)
    const weightChange = (Math.random() - 0.5) * 3; // -1.5 to +1.5 kg per period
    currentWeight = Math.max(startingWeight - 20, Math.min(startingWeight + 20, currentWeight + weightChange));

    dataPoints.push({
      date: dateLabel,
      weight: Math.round(currentWeight * 10) / 10,
    });
  }

  return { dataPoints, startingWeight };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/athletes/${clientId}/weight-overview`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get weight overview')
  // const data = await response.json()
  // return { dataPoints: data.points || [], startingWeight: data.startingWeight || 80 }
};

export interface WeightOverviewResult {
  dataPoints: WeightDataPoint[];
  startingWeight: number;
}

export interface AddClientPhotoData {
  clientId: string;
  type: 'front' | 'back' | 'side';
  file: File;
  takenAt: Date;
}

/**
 * Service method to add a client photo
 * This will be connected to the backend in the future
 */
export const addClientPhoto = async (data: AddClientPhotoData): Promise<void> => {
  console.log('Adding client photo:', {
    clientId: data.clientId,
    type: data.type,
    fileName: data.file.name,
    fileSize: data.file.size,
    takenAt: data.takenAt,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const formData = new FormData();
  // formData.append('file', data.file);
  // formData.append('type', data.type);
  // formData.append('takenAt', data.takenAt.toISOString());
  // const response = await fetch(`/api/athletes/${data.clientId}/photos`, {
  //   method: 'POST',
  //   body: formData,
  // })
  // if (!response.ok) throw new Error('Failed to add client photo')
  // return await response.json()
};

