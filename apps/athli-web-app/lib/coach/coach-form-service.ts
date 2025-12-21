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

export interface EditFormDetailsData {
  id: string;
  name: string;
  description?: string;
}

export interface Question {
  id: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
  metricId?: string;
}

export interface AddQuestionData {
  formId: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
  metricId?: string;
}

export interface ReorderQuestionsData {
  formId: string;
  questionIds: string[];
}

// Mock forms data - in production this would come from an API
const mockForms: Form[] = [
  {
    id: 'form-1',
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment form for new clients',
    questionCount: 5,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'form-2',
    name: 'Weekly Check-in',
    description: 'Weekly progress check-in form',
    questionCount: 3,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'form-3',
    name: 'Monthly Assessment',
    description: 'Comprehensive monthly assessment',
    questionCount: 12,
    createdAt: Date.now() - 86400000 * 14,
  },
];

/**
 * Service method to get all forms from coach's library
 * This will be connected to the backend in the future
 */
export const getForms = async (): Promise<Form[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return mockForms;
};

/**
 * Service method to add a form to coach's library
 * This will be connected to the backend in the future
 */
export const addForm = async (data: AddFormData): Promise<Form> => {
  // TODO: Connect to backend API
  console.log('Adding form:', {
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const newForm: Form = {
    id: `form-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: data.name,
    description: data.description,
    questionCount: 0,
    createdAt: Date.now(),
  };

  return newForm;
};

/**
 * Service method to edit form details in coach's library
 * This will be connected to the backend in the future
 */
export const editFormDetails = async (data: EditFormDetailsData): Promise<Form> => {
  // TODO: Connect to backend API
  console.log('Editing form details:', {
    id: data.id,
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const updatedForm: Form = {
    id: data.id,
    name: data.name,
    description: data.description,
    questionCount: 0, // This would come from the backend
    createdAt: Date.now(), // This would come from the backend
  };

  return updatedForm;
};

/**
 * Service method to add a question to a form in coach's library
 * This will be connected to the backend in the future
 */
export const addQuestion = async (data: AddQuestionData): Promise<Question> => {
  console.log('Adding question to form:', {
    formId: data.formId,
    question: data.question,
    format: data.format,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const newQuestion: Question = {
    id: `q${Date.now()}-${Math.random().toString(36).substring(7)}`,
    question: data.question,
    required: data.required,
    format: data.format,
    options: data.options,
    scaleFrom: data.scaleFrom,
    scaleTo: data.scaleTo,
    mediaCount: data.mediaCount,
    metricId: data.metricId,
  };

  return newQuestion;
};

/**
 * Service method to reorder questions in a form
 * This will be connected to the backend in the future
 */
export const reorderQuestions = async (data: ReorderQuestionsData): Promise<void> => {
  console.log('Reordering questions for form:', {
    formId: data.formId,
    questionIds: data.questionIds,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Duplicate a form in coach's library
 * @param formId - ID of the form to duplicate
 * @param originalForm - Original form object to duplicate
 */
export const duplicateForm = async (formId: string, originalForm: Form): Promise<Form> => {
  // TODO: Connect to backend API
  console.log('Duplicating form:', { formId, originalForm });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const duplicatedForm: Form = {
    ...originalForm,
    id: `form-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalForm.name} (Copy)`,
    createdAt: Date.now(),
  };

  return duplicatedForm;
};
