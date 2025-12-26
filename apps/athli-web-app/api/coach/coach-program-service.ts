import { apiFetch, type ApiResponse } from '@/api/api-client';
import type { Program } from '@/components/app/app-shell';

/**
 * Service methods for program operations
 */

export type ProgramData = {
  name: string;
  type: string;
  difficulty: string;
  weeks: string;
  description: string;
  schema?: Array<{ day: number; workouts: string[] }>;
};

/**
 * Get all programs
 */
export const getPrograms = async (): Promise<Program[]> => {
  const response = await apiFetch<ApiResponse<{ programs: any[] }>>('/coach/training/programs');
  return (response.data?.programs || []).map((p) => ({
    id: p.id,
    program: p.name,
    description: p.description || '',
    type: p.program_data?.type || '',
    length: p.program_data?.weeks ? `${p.program_data.weeks} weeks` : '0 weeks',
    totalExercises: p.total_exercises || 0,
    equipment: Array.isArray(p.equipment) ? p.equipment.join(', ') : p.equipment || '',
    created: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
  }));
};

/**
 * Star/Unstar programs
 */
export const starPrograms = async (programIds: string | string[], starred: boolean): Promise<void> => {
  const idsToStar = Array.isArray(programIds) ? programIds : [programIds];

  await Promise.all(
    idsToStar.map((id) =>
      apiFetch(`/coach/training/programs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ starred }),
      })
    )
  );
};

/**
 * Archive/Unarchive programs
 */
export const archivePrograms = async (
  programIds: string | string[],
  archived: boolean
): Promise<void> => {
  const ids = Array.isArray(programIds) ? programIds : [programIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/programs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived }),
      })
    )
  );
};

/**
 * Delete programs
 */
export const deletePrograms = async (programIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(programIds) ? programIds : [programIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/programs/${id}`, {
        method: 'DELETE',
      })
    )
  );
};

/**
 * Create a new program
 */
export const createProgram = async (programData: ProgramData): Promise<Program> => {
  const response = await apiFetch<ApiResponse<{ program: Program }>>('/coach/training/programs', {
    method: 'POST',
    body: JSON.stringify({
      name: programData.name,
      description: programData.description,
      program_data: programData,
    }),
  });
  if (!response.data) throw new Error('No program returned');
  return response.data.program;
};

/**
 * Update an existing program
 */
export const editProgram = async (
  programId: string,
  programData: ProgramData
): Promise<Program> => {
  const response = await apiFetch<ApiResponse<{ program: Program }>>(`/coach/training/programs/${programId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: programData.name,
      description: programData.description,
      program_data: programData,
    }),
  });
  if (!response.data) throw new Error('No program returned');
  return response.data.program;
};

/**
 * Update program details (metadata only)
 */
export const updateProgramDetails = async (
  programId: string,
  details: { name: string; type: string; difficulty: string; description: string }
): Promise<Program> => {
  const response = await apiFetch<ApiResponse<{ program: Program }>>(`/coach/training/programs/${programId}`, {
    method: 'PATCH',
    body: JSON.stringify(details),
  });
  if (!response.data) throw new Error('No program returned');
  return response.data.program;
};

/**
 * Duplicate a program
 */
export const duplicateProgram = async (programId: string): Promise<Program> => {
  const response = await apiFetch<ApiResponse<{ program: Program }>>(`/coach/training/programs/${programId}/duplicate`, {
    method: 'POST',
  });
  if (!response.data) throw new Error('No program returned');
  return response.data.program;
};

/**
 * Get program by ID
 */
export const getProgramById = async (programId: string): Promise<Program & { program_data: ProgramData }> => {
  const response = await apiFetch<ApiResponse<{ program: any }>>(`/coach/training/programs/${programId}`);
  if (!response.data) throw new Error('No program returned');

  const p = response.data.program;
  return {
    id: p.id,
    program: p.name,
    description: p.description || '',
    type: p.program_data?.type || '',
    length: p.program_data?.weeks ? `${p.program_data.weeks} weeks` : '0 weeks',
    totalExercises: p.total_exercises || 0,
    equipment: Array.isArray(p.equipment) ? p.equipment.join(', ') : p.equipment || '',
    created: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    program_data: p.program_data || { name: '', type: '', difficulty: '', weeks: '1', description: '', schema: [] },
  };
};
