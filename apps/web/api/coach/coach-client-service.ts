import { apiFetch } from '../api-client';
import type { ClientData } from '../../lib/general/csv-parser';

// Import shared types and re-export for backwards compatibility
export type {
  Athlete,
  AddClientData,
  ClientNote,
  CreateNoteData,
  EditNoteData,
  DeleteNoteData,
  CoachingType,
  ClientStatus,
} from '@athli/shared-types';

import type {
  Athlete,
  AddClientData,
  ClientNote,
  CreateNoteData,
  EditNoteData,
  DeleteNoteData,
} from '@athli/shared-types';

export interface AddClientsData {
  clients: ClientData[];
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
      category: client.category || null,
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
      connected: (client.status === 'accepted' || client.status === 'connected') ? true : client.status === 'invited' ? 'invitation-sent' : false,
    };
  });
};


/**
 * Service method to get a single client by ID
 */
// getClient now uses the client profile endpoint with clientId param
export const getClient = async (id: string): Promise<Athlete> => {
  const response = await apiFetch<{ data: { client: any } }>(`/clients/detail`, {
    headers: { 'x-client-id': id }
  });
  const client = response.data.client;

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
    category: client.category || null,
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
    connected: (client.status === 'accepted' || client.status === 'connected') ? true : client.status === 'invited' ? 'invitation-sent' : false,
  };
};

export interface ClientMetric {
  id: string; // The metric ID (not assignment ID, based on controller logic which spreads metric props)
  name: string;
  unit: string;
  description?: string;
  assignment_id: string;
  sort_order: number;
  logs?: Array<{
    id: string;
    value: number;
    date: string;
  }>;
}

export const getClientMetrics = async (clientId: string, coachId: string): Promise<ClientMetric[]> => {
  const response = await apiFetch<{ data: { metrics: any[] } }>(`/client/metrics`, {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId
    }
  });

  return response.data.metrics.map((m: any) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    description: m.description,
    assignment_id: m.assignment_id,
    value_kind: m.value_kind,
    is_private: m.is_private,
    sort_order: 0,
    logs: m.logs || [],
  }));
};

// ... (existing helper functions)

export interface ClientHabit {
  id: string; // Habit ID
  name: string;
  description?: string;
  frequency: string;
  assignment_id: string;
  sort_order: number;
  custom_schedule?: any;
  logs?: Array<{
    id: string;
    value: number;
    status: string;
    date: string;
  }>;
}

export const getClientHabits = async (clientId: string, coachId: string): Promise<ClientHabit[]> => {
  const response = await apiFetch<{ data: { habits: any[] } }>(`/client/habits`, {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId
    }
  });

  return response.data.habits.map((h: any) => ({
    id: h.id,
    name: h.name,
    description: h.description,
    amount: h.amount,
    unit: h.unit,
    period: h.period,
    frequency: h.period === 'weekly' ? 'weekly' : 'daily',
    assignment_id: h.assignment_id,
    sort_order: h.sort_order || 0,
    custom_schedule: h.custom_schedule,
    is_private: h.is_private,
    logs: h.logs || [],
  }));
};

export const getClientFiles = async (clientId: string, coachId: string): Promise<any[]> => {
  const response = await apiFetch<{ data: { files: any[] } }>(`/client/files`, {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId
    }
  });
  return response.data.files;
};

/**
 * Service method to add a single client
 */
export const addClient = async (data: AddClientData & { fullName: string }): Promise<Athlete> => {
  const response = await apiFetch<{ data: { clients: any[] } }>('/clients/new', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email.toLowerCase().trim(),
      fullName: data.fullName.trim(),
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
    category: client.category || null,
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
    connected: (client.status === 'accepted' || client.status === 'connected') ? true : client.status === 'invited' ? 'invitation-sent' : false,
    invitationToken: client.invitation_token,
  };
};

/**
 * Service method to add multiple clients
 */
export const addClients = async (data: AddClientsData): Promise<Athlete[]> => {
  const payload = data.clients.map(c => ({
    email: c.email.toLowerCase().trim(),
    fullName: c.fullName.trim(),
    category: c.category.toLowerCase().trim(),
  }));

  const response = await apiFetch<{ data: { clients: any[] } }>('/clients/new', {
    method: 'POST',
    body: JSON.stringify(payload) as any,
  });

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
      category: client.category || null,
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
      connected: (client.status === 'accepted' || client.status === 'connected') ? true : client.status === 'invited' ? 'invitation-sent' : false,
    };
  });
};

/**
 * Service method to archive a user
 */
export const archiveUser = async (athleteId: string): Promise<void> => {
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
 * Service method to get all archived clients for a coach
 */
export const getArchivedClients = async (): Promise<Athlete[]> => {
  const response = await apiFetch<{ data: { clients: any[] } }>('/clients/archived');
  return response.data.clients.map((client) => {
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
      category: client.category || null,
      status: 'archived',
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
      connected: false,
    };
  });
};

/**
 * Service method to restore archived clients (bulk operation)
 */
export const restoreClient = async (clientIds: string[]): Promise<void> => {
  await apiFetch(`/clients/restore`, {
    method: 'POST',
    body: JSON.stringify({ clientIds }) as any,
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


// Local Note interface for web app (uses title/body format)
export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number | null;
  isPinned: boolean;
}

// Local web app data interfaces (uses contactId)
export interface WebCreateNoteData {
  contactId: string;
  coachId: string;
  title: string;
  body: string;
}

export interface WebEditNoteData {
  noteId: string;
  contactId: string;
  coachId: string;
  title: string;
  body: string;
}

export interface WebDeleteNoteData {
  noteId: string;
  contactId: string;
  coachId: string;
}

export const getNotes = async (contactId: string, coachId: string): Promise<Note[]> => {
  const response = await apiFetch<{ data: { notes: any[] } }>(`/client/notes`, {
    headers: {
      'x-client-id': contactId,
      'x-coach-id': coachId
    }
  });
  return response.data.notes.map((n) => {
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: new Date(n.created_at).getTime(),
      updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : null,
      isPinned: n.is_pinned
    };
  });
};

export const getClientNotes = getNotes;

export const createNote = async (data: WebCreateNoteData): Promise<Note> => {
  const response = await apiFetch<{ data: { note: any } }>(`/client/notes`, {
    method: 'POST',
    headers: {
      'x-client-id': data.contactId,
      'x-coach-id': data.coachId
    },
    body: JSON.stringify({
      title: data.title,
      body: data.body,
      is_pinned: false
    }) as any
  });
  const n = response.data.note;
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: new Date(n.created_at).getTime(),
    updatedAt: null,
    isPinned: n.is_pinned
  };
};

export const editNote = async (data: WebEditNoteData): Promise<Note> => {
  const response = await apiFetch<{ data: { note: any } }>(`/client/notes/${data.noteId}`, {
    method: 'PATCH',
    headers: {
      'x-client-id': data.contactId,
      'x-coach-id': data.coachId
    },
    body: JSON.stringify({
      title: data.title,
      body: data.body
    }) as any
  });
  const n = response.data.note;
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: new Date(n.created_at).getTime(),
    updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : null,
    isPinned: n.is_pinned
  };
};

export const deleteNote = async (data: WebDeleteNoteData): Promise<void> => {
  await apiFetch(`/client/notes/${data.noteId}`, {
    method: 'DELETE',
    headers: {
      'x-client-id': data.contactId,
      'x-coach-id': data.coachId
    }
  });
};

export const deleteNotes = async (data: { noteIds: string[]; contactId: string; coachId: string }): Promise<void> => {
  await apiFetch(`/client/notes`, {
    method: 'DELETE',
    headers: {
      'x-client-id': data.contactId,
      'x-coach-id': data.coachId
    },
    body: JSON.stringify({
      noteIds: data.noteIds,
    }) as any,
  });
};

export const searchNotes = async (contactId: string, coachId: string, query: string): Promise<Note[]> => {
  // Client-side filtering for now as search endpoint isn't implemented
  const allNotes = await getNotes(contactId, coachId);
  return allNotes.filter(n => n.body.toLowerCase().includes(query.toLowerCase()));
};

export interface AtRiskClient {
  id: string;
  name: string;
  avatarUrl: string;
  lastActivity: string | null;
}

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
