/**
 * Service methods for program operations
 * These will be connected to the backend in the future
 */

import type { Program } from '@/components/app/app-shell';

export type ProgramData = {
  name: string;
  type: string;
  difficulty: string;
  weeks: string;
  description: string;
  schema?: Array<{ day: number; workouts: string[] }>;
};

/**
 * Star a program or multiple programs
 * @param programIds - Single program ID or array of program IDs
 */
export const starPrograms = async (programIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(programIds) ? programIds : [programIds];
  
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Starring programs:', { programIds: ids });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/programs/star', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ programIds: ids }),
  // })
  // if (!response.ok) throw new Error('Failed to star programs')
  // return await response.json()
};

/**
 * Archive a program or multiple programs
 * @param programIds - Single program ID or array of program IDs
 */
export const archivePrograms = async (programIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(programIds) ? programIds : [programIds];
  
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Archiving programs:', { programIds: ids });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/programs/archive', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ programIds: ids }),
  // })
  // if (!response.ok) throw new Error('Failed to archive programs')
  // return await response.json()
};

/**
 * Delete a program or multiple programs
 * @param programIds - Single program ID or array of program IDs
 */
export const deletePrograms = async (programIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(programIds) ? programIds : [programIds];
  
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Deleting programs:', { programIds: ids });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/programs/delete', {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ programIds: ids }),
  // })
  // if (!response.ok) throw new Error('Failed to delete programs')
  // return await response.json()
};

/**
 * Create a new program
 * @param programData - Program data from the form
 */
export const createProgram = async (programData: ProgramData): Promise<Program> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Creating program:', programData);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Calculate total exercises from schema (if provided)
  // For now, we'll use a default value since we don't have workout details here
  const totalExercises = 0; // This would be calculated from the workouts in the schema

  // Extract weeks number from string (e.g., "12 weeks" -> "12 weeks")
  const length = programData.weeks.includes('week') ? programData.weeks : `${programData.weeks} weeks`;

  // Return a mock created program
  const newProgram: Program = {
    id: Date.now().toString(),
    program: programData.name,
    description: programData.description,
    type: programData.type,
    length,
    totalExercises,
    equipment: 'Various', // Default, can be calculated from workouts
    created: new Date().toLocaleDateString('en-GB').replace(/\//g, '-').slice(0, 8),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/programs', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(programData),
  // })
  // if (!response.ok) throw new Error('Failed to create program')
  // return await response.json()

  return newProgram;
};

/**
 * Update an existing program
 * @param programId - ID of the program to update
 * @param programData - Updated program data from the form
 */
export const editProgram = async (
  programId: string,
  programData: ProgramData
): Promise<Program> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Editing program:', { programId, programData });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Calculate total exercises from schema (if provided)
  // For now, we'll use a default value since we don't have workout details here
  const totalExercises = 0; // This would be calculated from the workouts in the schema

  // Extract weeks number from string (e.g., "12 weeks" -> "12 weeks")
  const length = programData.weeks.includes('week') ? programData.weeks : `${programData.weeks} weeks`;

  // Return a mock updated program
  const updatedProgram: Program = {
    id: programId,
    program: programData.name,
    description: programData.description,
    type: programData.type,
    length,
    totalExercises,
    equipment: 'Various', // Default, can be calculated from workouts
    created: new Date().toLocaleDateString('en-GB').replace(/\//g, '-').slice(0, 8), // Keep original or update?
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/programs/${programId}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(programData),
  // })
  // if (!response.ok) throw new Error('Failed to update program')
  // return await response.json()

  return updatedProgram;
};
