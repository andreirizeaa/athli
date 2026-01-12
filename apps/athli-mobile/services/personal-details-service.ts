// Service for editing personal details
// In the future, this will make actual API calls

import type { PersonalDetailsFieldType } from '@/types';

export const editPersonalDetails = async (
  field: PersonalDetailsFieldType,
  value: string | number
): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Editing ${field} to ${value}`);
      // In the future, this will call an actual API endpoint
      // await api.put('/user/personal-details', { [field]: value });
      resolve();
    }, 500);
  });
};
