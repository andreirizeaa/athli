export type CreateProgramData = {
  name: string;
  description?: string;
  weeks: number;
};

export const createNewProgram = async (data: CreateProgramData): Promise<void> => {
  // Dummy implementation
  console.log('Creating new program:', data);
  // TODO: Implement actual API call
  return Promise.resolve();
};

