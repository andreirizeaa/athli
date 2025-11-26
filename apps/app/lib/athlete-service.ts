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

