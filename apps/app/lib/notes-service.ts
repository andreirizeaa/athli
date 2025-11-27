export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number | null; // timestamp in milliseconds
}

export interface CreateNoteData {
  contactId: string;
  title: string;
  body: string;
}

export interface EditNoteData {
  noteId: string;
  contactId: string;
  title: string;
  body: string;
}

export interface DeleteNoteData {
  noteId: string;
  contactId: string;
}

/**
 * Dummy notes service method to create a new note
 * This will be connected to the backend in the future
 */
export const createNote = async (data: CreateNoteData): Promise<Note> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Creating note:', {
    contactId: data.contactId,
    title: data.title,
    body: data.body || '(empty body)',
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy response - in the future, this will come from the backend
  const newNote: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title: data.title,
    body: data.body,
    createdAt: Date.now(),
    updatedAt: null,
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/notes', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to create note')
  // return await response.json()

  return newNote;
};

/**
 * Dummy notes service method to edit an existing note
 * This will be connected to the backend in the future
 */
export const editNote = async (data: EditNoteData): Promise<Note> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Editing note:', {
    noteId: data.noteId,
    contactId: data.contactId,
    title: data.title,
    body: data.body || '(empty body)',
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy response - in the future, this will come from the backend
  const updatedNote: Note = {
    id: data.noteId,
    title: data.title,
    body: data.body,
    createdAt: Date.now(), // In real implementation, this would come from backend
    updatedAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/notes/${data.noteId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     contactId: data.contactId,
  //     title: data.title,
  //     body: data.body,
  //   }),
  // })
  // if (!response.ok) throw new Error('Failed to edit note')
  // return await response.json()

  return updatedNote;
};

/**
 * Dummy notes service method to delete a note
 * This will be connected to the backend in the future
 */
export const deleteNote = async (data: DeleteNoteData): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Deleting note:', {
    noteId: data.noteId,
    contactId: data.contactId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/notes/${data.noteId}`, {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ contactId: data.contactId }),
  // })
  // if (!response.ok) throw new Error('Failed to delete note')
};

/**
 * Dummy notes service method to search notes
 * This will be connected to the backend in the future
 */
export const searchNotes = async (
  contactId: string,
  query: string
): Promise<Note[]> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Searching notes:', {
    contactId,
    query,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy response - in the future, this will come from the backend
  // For now, return empty array as the filtering will be done client-side
  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/notes/search?contactId=${contactId}&query=${encodeURIComponent(query)}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to search notes')
  // return await response.json()

  return [];
};

