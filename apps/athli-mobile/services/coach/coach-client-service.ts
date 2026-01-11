import { apiFetch } from '@/lib/api-client';

export interface AddClientData {
  firstName: string;
  lastName: string;
  email: string;
  coachingType: 'online' | 'in-person' | 'hybrid';
}

export interface Athlete {
  id: string;
  publicId?: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  coachingType: 'online' | 'in-person' | 'hybrid';
  category: string;
  status: 'invited' | 'connected' | 'archived';
  avatarUrl: string;
  createdAt: number;
  phone: string;
  country: string;
  birthDate: string | null;
  age: number | null;
  height: string | null;
  lastActivity: string;
  last7DaysTraining: string;
  last30DaysTraining: string;
  clientFor: string;
  connected: boolean | 'invitation-sent';
  invitationToken?: string;
}

const calculateAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Service method to get all clients for a coach
 */
export const getClients = async (): Promise<Athlete[]> => {
  const response = await apiFetch<{ data: { clients: any[] } }>('/clients');
  return response.data.clients.map((client) => {
    const names = client.full_name?.split(' ') || ['', ''];
    const createdAt = new Date(client.created_at || Date.now());
    const clientForDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: client.client_id,
      publicId: client.public_id,
      name: client.full_name || '',
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || '',
      email: client.email || '',
      coachingType: (client.category as any) || 'online',
      category: client.category || 'online',
      status: client.status || 'invited',
      avatarUrl: client.avatar_url || '',
      createdAt: createdAt.getTime(),
      phone: client.phone || '',
      country: client.country || '',
      lastActivity: '',
      last7DaysTraining: '0/0',
      last30DaysTraining: '0/0',
      birthDate: client.date_of_birth || null,
      age: calculateAge(client.date_of_birth),
      height: client.height_cm || null,
      clientFor: clientForDays.toString(),
      connected: client.status === 'connected' ? true : client.status === 'invited' ? 'invitation-sent' : false,
    };
  });
};

/**
 * Service method to add a single client
 */
export const addClient = async (data: AddClientData): Promise<Athlete> => {
  const response = await apiFetch<{ data: { clients: any[] } }>('/clients/new', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      category: data.coachingType.toLowerCase().trim(),
    }) as any,
  });

  const client = response.data.clients[0];
  const names = client.full_name?.split(' ') || ['', ''];
  const createdAt = new Date(client.created_at || Date.now());
  const clientForDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: client.client_id,
    name: client.full_name || '',
    firstName: names[0] || '',
    lastName: names.slice(1).join(' ') || '',
    email: client.email || '',
    coachingType: (client.category as any) || 'online',
    category: client.category || 'online',
    status: client.status || 'invited',
    avatarUrl: client.avatar_url || '',
    createdAt: createdAt.getTime(),
    phone: client.phone || '',
    country: client.country || '',
    lastActivity: '',
    last7DaysTraining: '0/0',
    last30DaysTraining: '0/0',
    birthDate: client.date_of_birth || null,
    age: calculateAge(client.date_of_birth),
    height: client.height_cm || null,
    clientFor: clientForDays.toString(),
    connected: client.status === 'connected' ? true : client.status === 'invited' ? 'invitation-sent' : false,
    invitationToken: client.invitation_token,
  };
};

/**
 * Service method to archive a user
 */
export const archiveClient = async (athleteId: string): Promise<void> => {
  await apiFetch(`/clients`, {
    method: 'PATCH',
    body: JSON.stringify({
      id: athleteId,
      is_active: false,
      is_archived: true,
    }) as any,
  });
};

/**
 * Service method to update a client
 */
export interface UpdateClientData {
  firstName?: string;
  lastName?: string;
  email?: string;
  coachingType?: 'online' | 'in-person' | 'hybrid';
}

export const updateClient = async (athleteId: string, data: UpdateClientData): Promise<void> => {
  const updatePayload: any = {};

  if (data.firstName !== undefined) {
    updatePayload.first_name = data.firstName;
  }
  if (data.lastName !== undefined) {
    updatePayload.last_name = data.lastName;
  }
  if (data.email !== undefined) {
    updatePayload.email = data.email;
  }
  if (data.coachingType !== undefined) {
    updatePayload.category = data.coachingType;
  }

  // Add the client ID to the payload
  updatePayload.id = athleteId;

  await apiFetch(`/clients`, {
    method: 'PATCH',
    body: JSON.stringify(updatePayload) as any,
  });
};

/**
 * Service method to delete a client
 */
export const deleteClient = async (athleteId: string): Promise<void> => {
  await apiFetch(`/clients`, {
    method: 'DELETE',
    body: JSON.stringify({ id: athleteId }) as any,
  });
};
