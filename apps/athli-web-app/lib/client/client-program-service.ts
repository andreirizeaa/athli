/**
 * Client-specific program service for training calendar operations
 * This will be connected to the backend in the future
 */

export interface AssignProgramData {
  programId: string;
  clientId: string;
  startDate: string;
}

/**
 * Service method to assign a program to a client's training calendar
 * This will be connected to the backend in the future
 */
export const assignProgram = async (data: AssignProgramData): Promise<void> => {
  console.log('Assigning program to client calendar:', data);
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Service method to get client's programs from training calendar
 * This will be connected to the backend in the future
 */
export const getClientPrograms = async (clientId: string): Promise<any[]> => {
  console.log('Getting client programs:', clientId);
  await new Promise((resolve) => setTimeout(resolve, 100));
  return [];
};
