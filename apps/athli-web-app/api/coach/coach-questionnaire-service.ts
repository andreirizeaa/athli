import { apiFetch } from '@/api/api-client';

export interface AddQuestionnaireData {
  name: string;
  description?: string;
}

export interface Questionnaire {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  questionCount?: number;
  created_at: string;
  updated_at: string;
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
  questions: Question[];
}

export interface DeleteQuestionData {
  formId: string;
  questionId: string;
}

/**
 * Service method to get all questionnaires from coach's library
 */
export const getQuestionnaires = async (): Promise<Questionnaire[]> => {
  const response = await apiFetch<{ data: { questionnaires: Questionnaire[] } }>('/coach/forms/questionnaires');
  return response.data.questionnaires;
};

/**
 * Service method to add a questionnaire to coach's library
 */
export const addQuestionnaire = async (data: AddQuestionnaireData): Promise<Questionnaire> => {
  const response = await apiFetch<{ data: { questionnaire: Questionnaire } }>('/coach/forms/questionnaires', {
    method: 'POST',
    body: data as any,
  });

  return response.data.questionnaire;
};

/**
 * Service method to edit questionnaire details in coach's library
 */
export const editQuestionnaireDetails = async (data: EditQuestionnaireDetailsData): Promise<Questionnaire> => {
  const { id, ...updates } = data;
  const response = await apiFetch<{ data: { questionnaire: Questionnaire } }>(`/coach/forms/questionnaires/${id}`, {
    method: 'PATCH',
    body: updates as any,
  });

  return response.data.questionnaire;
};

/**
 * Service method to add a question to a questionnaire in coach's library
 * Since questions are stored in a JSONB column, we fetch the questionnaire first,
 * add the question, and then patch the entire questionnaire.
 */
export const addQuestion = async (data: AddQuestionData): Promise<Question> => {
  const { formId, ...questionData } = data;

  // Get current questionnaire
  const response = await apiFetch<{ data: { questionnaire: Questionnaire } }>(`/coach/forms/questionnaires/${formId}`);
  const currentQuestions = response.data.questionnaire.questions || [];

  // Generate a UUID for the new question
  const nextId = crypto.randomUUID();
  const newQuestion: Question = {
    ...questionData,
    id: nextId,
  };

  // Update questionnaire
  await apiFetch(`/coach/forms/questionnaires/${formId}`, {
    method: 'PATCH',
    body: {
      questions: [...currentQuestions, newQuestion],
    } as any,
  });

  return newQuestion;
};

/**
 * Service method to reorder questions in a questionnaire
 */
/**
 * Service method to reorder questions in a questionnaire
 * Now acts as a "save all questions" method to ensure exact order persistence
 */
export const reorderQuestions = async (data: ReorderQuestionsData): Promise<void> => {
  const { formId, questions } = data;

  // Update questionnaire with the exact provided state
  await apiFetch(`/coach/forms/questionnaires/${formId}`, {
    method: 'PATCH',
    body: {
      questions: questions,
    } as any,
  });
};

/**
 * Service method to delete a question from a questionnaire
 */
export const deleteQuestion = async (data: DeleteQuestionData): Promise<void> => {
  const { formId, questionId } = data;

  // Get current questionnaire
  const response = await apiFetch<{ data: { questionnaire: Questionnaire } }>(`/coach/forms/questionnaires/${formId}`);
  const currentQuestions = response.data.questionnaire.questions || [];

  // Remove the question
  const updatedQuestions = currentQuestions
    .filter(q => q.id !== questionId);

  // Update questionnaire
  await apiFetch(`/coach/forms/questionnaires/${formId}`, {
    method: 'PATCH',
    body: {
      questions: updatedQuestions,
    } as any,
  });
};

/**
 * Service method to delete a questionnaire from coach's library
 */
export const deleteQuestionnaire = async (id: string): Promise<void> => {
  await apiFetch(`/coach/forms/questionnaires/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Duplicate a questionnaire in coach's library
 */
export const duplicateQuestionnaire = async (questionnaireId: string, originalQuestionnaire: Questionnaire): Promise<Questionnaire> => {
  const { id, created_at, updated_at, ...dataToCopy } = originalQuestionnaire;

  const response = await apiFetch<{ data: { questionnaire: Questionnaire } }>('/coach/forms/questionnaires', {
    method: 'POST',
    body: {
      ...dataToCopy,
      name: `${originalQuestionnaire.name} (Copy)`,
    } as any,
  });

  return response.data.questionnaire;
};
