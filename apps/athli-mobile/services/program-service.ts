import type { CreateProgramData } from '@/types';

// Re-export for backward compatibility
export type { CreateProgramData };

export const createNewProgram = async (data: CreateProgramData): Promise<void> => {
  // Dummy implementation
  console.log('Creating new program:', data);
  // TODO: Implement actual API call
  return Promise.resolve();
};

