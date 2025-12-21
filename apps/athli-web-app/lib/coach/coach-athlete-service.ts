import type { ClientData } from '../general/csv-parser';

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
 * Service method to add a single client to coach's roster
 * This will be connected to the backend in the future
 */
export const addClient = async (data: AddClientData): Promise<Athlete> => {
  // TODO: Connect to backend API
  console.log('Adding client:', {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    coachingType: data.coachingType,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const newAthlete: Athlete = {
    id: `athlete-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    coachingType: data.coachingType,
    createdAt: Date.now(),
  };

  return newAthlete;
};

/**
 * Service method to add multiple clients (bulk upload) to coach's roster
 * This will be connected to the backend in the future
 */
export const addClients = async (data: AddClientsData): Promise<Athlete[]> => {
  // TODO: Connect to backend API
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

  const newAthletes: Athlete[] = data.clients.map((client) => ({
    id: `athlete-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    coachingType: 'online', // Default for bulk uploads, can be updated later
    category: client.category,
    createdAt: Date.now(),
  }));

  return newAthletes;
};

/**
 * Service method to archive a user
 * This will be connected to the backend in the future
 */
export const archiveUser = async (athleteId: string): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Archiving user:', {
    athleteId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};
