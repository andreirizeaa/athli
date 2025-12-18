export interface AddFormData {
  name: string;
  description?: string;
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  createdAt: number;
}

/**
 * Service method to add a form
 * This will be connected to the backend in the future
 */
export const addForm = async (data: AddFormData): Promise<Form> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Adding form:', {
    name: data.name,
    description: data.description,
    questionCount: data.questions?.length || 0,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock form
  const newForm: Form = {
    id: `form-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: data.name,
    description: data.description,
    questionCount: data.questions?.length || 0,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/forms', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to add form')
  // return await response.json()

  return newForm;
};

export interface EditFormDetailsData {
  id: string;
  name: string;
  description?: string;
}

/**
 * Service method to edit form details
 * This will be connected to the backend in the future
 */
export const editFormDetails = async (data: EditFormDetailsData): Promise<Form> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Editing form details:', {
    id: data.id,
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return updated form
  const updatedForm: Form = {
    id: data.id,
    name: data.name,
    description: data.description,
    questionCount: 0, // This would come from the backend
    createdAt: Date.now(), // This would come from the backend
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/forms/${data.id}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ name: data.name, description: data.description }),
  // })
  // if (!response.ok) throw new Error('Failed to edit form')
  // return await response.json()

  return updatedForm;
};
