import { apiFetch } from '@/lib/api-client';

/**
 * Client notes service
 * Mirrors apps/athli-web-app/api/coach/coach-client-service.ts notes functionality
 */

export interface ClientNote {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number | null;
  isPinned: boolean;
}

export interface CreateNoteData {
  contactId: string;
  coachId: string;
  title: string;
  body: string;
}

export interface EditNoteData {
  noteId: string;
  contactId: string;
  coachId: string;
  title: string;
  body: string;
}

export interface DeleteNoteData {
  noteId: string;
  contactId: string;
  coachId: string;
}

/**
 * Get all notes for a client
 */
export const getClientNotes = async (
  clientId: string,
  coachId: string
): Promise<ClientNote[]> => {
  const response = await apiFetch<{ data: { notes: any[] } }>('/client/notes', {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
  return (response.data.notes || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: new Date(n.created_at).getTime(),
    updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : null,
    isPinned: n.is_pinned,
  }));
};

/**
 * Create a new note for a client
 */
export const createClientNote = async (data: CreateNoteData): Promise<ClientNote> => {
  const response = await apiFetch<{ data: { note: any } }>('/client/notes', {
    method: 'POST',
    headers: {
      'x-client-id': data.contactId,
      'x-coach-id': data.coachId,
    },
    body: JSON.stringify({
      title: data.title,
      body: data.body,
      is_pinned: false,
    }),
  });
  const n = response.data.note;
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: new Date(n.created_at).getTime(),
    updatedAt: null,
    isPinned: n.is_pinned,
  };
};

/**
 * Update an existing note
 */
export const updateClientNote = async (data: EditNoteData): Promise<ClientNote> => {
  const response = await apiFetch<{ data: { note: any } }>(`/client/notes/${data.noteId}`, {
    method: 'PATCH',
    headers: {
      'x-client-id': data.contactId,
      'x-coach-id': data.coachId,
    },
    body: JSON.stringify({
      title: data.title,
      body: data.body,
    }),
  });
  const n = response.data.note;
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: new Date(n.created_at).getTime(),
    updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : null,
    isPinned: n.is_pinned,
  };
};

/**
 * Delete a note
 */
export const deleteClientNote = async (data: DeleteNoteData): Promise<void> => {
  await apiFetch(`/client/notes/${data.noteId}`, {
    method: 'DELETE',
    headers: {
      'x-client-id': data.contactId,
      'x-coach-id': data.coachId,
    },
  });
};

/**
 * Bulk delete notes
 */
export const bulkDeleteClientNotes = async (
  clientId: string,
  coachId: string,
  noteIds: string[]
): Promise<void> => {
  await apiFetch('/client/notes', {
    method: 'DELETE',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
    body: JSON.stringify({ noteIds }),
  });
};
