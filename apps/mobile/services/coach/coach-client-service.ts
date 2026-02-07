import { apiFetch } from '@/lib/api-client';
import type {
  Athlete,
  UpdateClientData,
  CoachingType,
} from '@athli/shared-types';

// Re-export types from shared-types for backwards compatibility
export type {
  Athlete,
  UpdateClientData,
};

// Mobile-specific AddClientData with required firstName/lastName
export interface AddClientData {
  firstName: string;
  lastName: string;
  email: string;
  coachingType: CoachingType;
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
  const clients = response.data.clients.map((client) => {
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
    };
  });
  console.log('[coach-client-service] getClients returned:', clients.length, 'clients');
  return clients;
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
export const updateClient = async (athleteId: string, data: UpdateClientData): Promise<void> => {
  const updatePayload: Record<string, any> = {
    id: athleteId,
  };

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
  if (data.avatarUrl !== undefined) {
    updatePayload.avatar_url = data.avatarUrl;
  }

  // If there's an avatar file URI, use FormData and /client endpoint (like web app)
  if (data.avatarUri) {
    const formData = new FormData();

    // Add the avatar file
    const fileExt = data.avatarUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
    formData.append('avatar', {
      uri: data.avatarUri,
      name: `avatar.${fileExt}`,
      type: mimeType,
    } as any);

    // Add other fields to FormData
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] !== undefined && updatePayload[key] !== null) {
        formData.append(key, String(updatePayload[key]));
      }
    });

    // Use /client endpoint with x-client-id header (same as web app)
    await apiFetch(`/client`, {
      method: 'PATCH',
      headers: {
        'x-client-id': athleteId,
      },
      body: formData as any,
    });
  } else {
    // No avatar file, use regular JSON request to /clients
    await apiFetch(`/clients`, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload) as any,
    });
  }
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

export interface AtRiskClient {
  id: string;
  name: string;
  avatarUrl: string;
  lastActivity: string | null;
}

/**
 * Service method to get at-risk clients (inactive for more than threshold days)
 */
export const getAtRiskClients = async (thresholdDays: number = 5): Promise<AtRiskClient[]> => {
  const response = await apiFetch<{ data: { clients: any[]; thresholdDays: number } }>('/clients/at-risk', {
    method: 'POST',
    body: JSON.stringify({ thresholdDays }) as any,
  });

  return response.data.clients.map((client) => ({
    id: client.client_id,
    name: client.full_name || '',
    avatarUrl: client.avatar_url || '',
    lastActivity: client.last_activity || null,
  }));
};
