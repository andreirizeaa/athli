export interface AddQuestionnaireData {
  name: string;
  description?: string;
}

export interface Questionnaire {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  createdAt: number;
}

export interface EditQuestionnaireDetailsData {
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

// Mock questionnaires data - in production this would come from an API
const mockQuestionnaires: Questionnaire[] = [
  {
    id: 'questionnaire-1',
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment form for new clients',
    questionCount: 5,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'questionnaire-2',
    name: 'Monthly Assessment',
    description: 'Comprehensive monthly assessment',
    questionCount: 12,
    createdAt: Date.now() - 86400000 * 14,
  },
];

/**
 * Service method to get all questionnaires from coach's library
 * This will be connected to the backend in the future
 */
export const getQuestionnaires = async (): Promise<Questionnaire[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return mockQuestionnaires;
};

/**
 * Service method to add a questionnaire to coach's library
 * This will be connected to the backend in the future
 */
export const addQuestionnaire = async (data: AddQuestionnaireData): Promise<Questionnaire> => {
  // TODO: Connect to backend API
  console.log('Adding questionnaire:', {
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const newQuestionnaire: Questionnaire = {
    id: `questionnaire-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: data.name,
    description: data.description,
    questionCount: 0,
    createdAt: Date.now(),
  };

  return newQuestionnaire;
};

/**
 * Service method to edit questionnaire details in coach's library
 * This will be connected to the backend in the future
 */
export const editQuestionnaireDetails = async (data: EditQuestionnaireDetailsData): Promise<Questionnaire> => {
  // TODO: Connect to backend API
  console.log('Editing questionnaire details:', {
    id: data.id,
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const updatedQuestionnaire: Questionnaire = {
    id: data.id,
    name: data.name,
    description: data.description,
    questionCount: 0, // This would come from the backend
    createdAt: Date.now(), // This would come from the backend
  };

  return updatedQuestionnaire;
};

/**
 * Service method to add a question to a questionnaire in coach's library
 * This will be connected to the backend in the future
 */
export const addQuestion = async (data: AddQuestionData): Promise<Question> => {
  console.log('Adding question to questionnaire:', {
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
 * Service method to reorder questions in a questionnaire
 * This will be connected to the backend in the future
 */
export const reorderQuestions = async (data: ReorderQuestionsData): Promise<void> => {
  console.log('Reordering questions for questionnaire:', {
    formId: data.formId,
    questionIds: data.questionIds,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Duplicate a questionnaire in coach's library
 * @param questionnaireId - ID of the questionnaire to duplicate
 * @param originalQuestionnaire - Original questionnaire object to duplicate
 */
export const duplicateQuestionnaire = async (questionnaireId: string, originalQuestionnaire: Questionnaire): Promise<Questionnaire> => {
  // TODO: Connect to backend API
  console.log('Duplicating questionnaire:', { questionnaireId, originalQuestionnaire });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const duplicatedQuestionnaire: Questionnaire = {
    ...originalQuestionnaire,
    id: `questionnaire-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalQuestionnaire.name} (Copy)`,
    createdAt: Date.now(),
  };

  return duplicatedQuestionnaire;
};

