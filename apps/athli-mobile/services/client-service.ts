export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  age: number;
  gender: 'male' | 'female' | 'prefer-not-to-say';
  type: 'online' | 'in-person' | 'hybrid';
  email: string;
  phone: string;
  country: string;
}

// Import mock data from constants
// TODO: Remove when TanStack Query is integrated
import { MOCK_CLIENTS } from '@/constants/mock-clients';

/**
 * Service method to get all clients
 * TODO: Replace with TanStack Query hook
 */
export const getClients = async (): Promise<Client[]> => {
  // Return mock data - in the future, this will come from the backend
  return MOCK_CLIENTS;

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/clients', {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get clients')
  // return await response.json()
};

export interface AddClientData {
  firstName: string;
  lastName: string;
  email: string;
  type: 'online' | 'in-person' | 'hybrid';
}

export interface UpdateClientData {
  firstName: string;
  lastName: string;
  email: string;
  type: 'online' | 'in-person' | 'hybrid';
}

/**
 * Service method to update an existing client
 * This will be connected to the backend in the future
 */
export const updateClient = async (
  clientId: string,
  data: UpdateClientData,
): Promise<Client> => {
  // Find and update client in mock data
  const clientIndex = MOCK_CLIENTS.findIndex((c) => c.id === clientId);
  if (clientIndex === -1) {
    throw new Error('Client not found');
  }

  const updatedClient: Client = {
    ...MOCK_CLIENTS[clientIndex],
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: `${data.firstName} ${data.lastName}`,
    email: data.email,
    type: data.type,
  };

  // Note: In real implementation, we would update the backend
  // For mock, we can't mutate the imported constant

  // In a real implementation, this would be:
  // const response = await fetch(`/api/clients/${clientId}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to update client')
  // return await response.json()

  return updatedClient;
};

export const addClient = async (data: AddClientData): Promise<Client> => {
  // Create new client - in the future, this will be saved to the backend
  const newClient: Client = {
    id: `mock-${Date.now()}`,
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: `${data.firstName} ${data.lastName}`,
    email: data.email,
    type: data.type,
    age: 0, // Default values for required fields
    gender: 'prefer-not-to-say',
    phone: '',
    country: '',
  };

  return newClient;
};
