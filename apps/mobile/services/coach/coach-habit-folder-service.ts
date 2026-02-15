import { apiFetch } from '@/lib/api-client';
import type {
  Habit,
  DBHabit,
  HabitFolder,
  CreateHabitFolderInput,
  UpdateHabitFolderInput,
} from '@athli/shared-types';
import { mapDBHabitToHabit } from './coach-habit-service';

export type { HabitFolder, CreateHabitFolderInput, UpdateHabitFolderInput };

export const getAllHabitFolders = async (): Promise<HabitFolder[]> => {
  const response = await apiFetch('/coach/habits/folders');
  return response.data.folders;
};

export const createHabitFolder = async (data: CreateHabitFolderInput): Promise<HabitFolder> => {
  const response = await apiFetch('/coach/habits/folders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

export const updateHabitFolder = async (id: string, data: UpdateHabitFolderInput): Promise<HabitFolder> => {
  const response = await apiFetch(`/coach/habits/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

export const deleteHabitFolder = async (id: string): Promise<void> => {
  await apiFetch(`/coach/habits/folders/${id}`, {
    method: 'DELETE',
  });
};

export const moveHabit = async (habitId: string, folderId: string | null): Promise<Habit> => {
  const response = await apiFetch<{ data: { habit: DBHabit } }>(`/coach/habits/${habitId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ folder_id: folderId }),
  });
  return mapDBHabitToHabit(response.data.habit);
};

export const getHabitsInFolder = async (folderId: string): Promise<Habit[]> => {
  const response = await apiFetch<{ data: { habits: DBHabit[] } }>(`/coach/habits/folders/${folderId}/habits`);
  return response.data.habits.map(mapDBHabitToHabit);
};
