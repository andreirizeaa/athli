import { apiFetch, type ApiResponse } from '@/lib/api-client';
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
  schema?: Array<{ day: number; workouts: any[] }>;
  days?: Array<{ day: number; workouts: any[] }>; // Alternative field name
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
    type: p.type || p.program_data?.type || '',
    difficulty: p.difficulty || p.program_data?.difficulty || '',
    length: (() => {
      const weeksInt = Number(p.weeks || p.program_data?.weeks || 0);
      return `${weeksInt} week${weeksInt === 1 ? '' : 's'}`;
    })(),
    totalWorkouts: Number(p.total_workouts || 0),
    totalExercises: p.total_exercises || 0,
    equipment: Array.isArray(p.equipment) ? p.equipment.join(', ') : p.equipment || '',
    created: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    isFavourite: p.is_favourite || false,
  }));
};

/**
 * Star/Unstar programs
 */
export const starPrograms = async (programIds: string | string[], starred: boolean): Promise<void> => {
  const idsToStar = Array.isArray(programIds) ? programIds : [programIds];

  await Promise.all(
    idsToStar.map((id) =>
      apiFetch(`/coach/training/programs/${id}/toggle-favorite`, {
        method: 'PATCH',
        body: JSON.stringify({ isFavourite: starred }),
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
  // Separate metadata from program structure
  const cleanProgramData = {
    ...(programData.schema && { schema: programData.schema }),
    ...(programData.days && { days: programData.days }),
  };

  const response = await apiFetch<ApiResponse<{ program: Program }>>('/coach/training/programs', {
    method: 'POST',
    body: JSON.stringify({
      name: programData.name,
      description: programData.description,
      program_data: {
        ...cleanProgramData,
        type: programData.type,
        difficulty: programData.difficulty,
        weeks: programData.weeks,
      },
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
  // Separate metadata from program structure
  const cleanProgramData = {
    ...(programData.schema && { schema: programData.schema }),
    ...(programData.days && { days: programData.days }),
  };

  const response = await apiFetch<ApiResponse<{ program: Program }>>(`/coach/training/programs/${programId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: programData.name,
      description: programData.description,
      program_data: {
        ...cleanProgramData,
        type: programData.type,
        difficulty: programData.difficulty,
        weeks: programData.weeks,
      },
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

  // Reconstruct full program_data from separate columns and JSONB field
  const programData: ProgramData = {
    name: p.name || '',
    description: p.description || '',
    type: p.type || p.program_data?.type || '',
    difficulty: p.difficulty || p.program_data?.difficulty || '',
    weeks: p.weeks?.toString() || p.program_data?.weeks || '1',
    schema: p.program_data?.schema || p.program_data?.days || [],
  };

  return {
    id: p.id,
    program: p.name,
    description: p.description || '',
    type: p.type || p.program_data?.type || '',
    difficulty: p.difficulty || p.program_data?.difficulty || '',
    length: (() => {
      const weeksInt = Number(p.weeks || p.program_data?.weeks || 0);
      return `${weeksInt} week${weeksInt === 1 ? '' : 's'}`;
    })(),
    totalWorkouts: Number(p.total_workouts || 0),
    totalExercises: p.total_exercises || 0,
    equipment: Array.isArray(p.equipment) ? p.equipment.join(', ') : p.equipment || '',
    created: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    isFavourite: p.is_favourite || false,
    program_data: programData,
  };
};
