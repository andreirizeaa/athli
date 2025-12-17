// Service for editing personal details
// In the future, this will make actual API calls

type FieldType = 'name' | 'age' | 'gender' | 'height' | 'weight';

export const editPersonalDetails = async (
  field: FieldType,
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
