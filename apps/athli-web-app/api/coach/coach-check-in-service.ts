import { apiFetch } from '@/api/api-client';

export interface AddCheckInData {
  name: string;
  description?: string;
  cron_expression?: string;
}

export interface CheckIn {
  id: string;
  name: string;
  description?: string;
  cron_expression?: string;
  schedule_config?: {
    type: 'check-in' | 'questionnaire';
    frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    selectedDays?: string[];
    monthlyOption?: 'first' | 'last' | 'specific';
    specificDay?: number;
  };
  questions: Question[];
  created_at: string;
  updated_at: string;
}

export interface EditCheckInDetailsData {
  id: string;
  name: string;
  description?: string;
  cron_expression?: string;
  schedule_config?: Record<string, any>;
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
 * Service method to get all check-ins from coach's library
 */
export const getCheckIns = async (): Promise<CheckIn[]> => {
  const response = await apiFetch<{ data: { checkIns: CheckIn[] } }>('/coach/forms/check-ins');
  return response.data.checkIns;
};

/**
 * Service method to add a check-in to coach's library
 */
export const addCheckIn = async (data: AddCheckInData): Promise<CheckIn> => {
  const response = await apiFetch<{ data: { checkIn: CheckIn } }>('/coach/forms/check-ins', {
    method: 'POST',
    body: data as any,
  });

  return response.data.checkIn;
};

/**
 * Service method to edit check-in details in coach's library
 */
export const editCheckInDetails = async (data: EditCheckInDetailsData): Promise<CheckIn> => {
  const { id, ...updates } = data;
  const response = await apiFetch<{ data: { checkIn: CheckIn } }>(`/coach/forms/check-ins/${id}`, {
    method: 'PATCH',
    body: updates as any,
  });

  return response.data.checkIn;
};

/**
 * Service method to add a question to a check-in in coach's library
 * Since questions are stored in a JSONB column, we fetch the check-in first,
 * add the question, and then patch the entire check-in.
 */
export const addQuestion = async (data: AddQuestionData): Promise<Question> => {
  const { formId, ...questionData } = data;

  // Get current check-in to get existing questions
  const response = await apiFetch<{ data: { checkIn: CheckIn } }>(`/coach/forms/check-ins/${formId}`);
  const currentQuestions = response.data.checkIn.questions || [];

  // Generate a UUID for the new question
  const nextId = crypto.randomUUID();
  const newQuestion: Question = {
    ...questionData,
    id: nextId,
  };

  // Update check-in with new questions array
  await apiFetch(`/coach/forms/check-ins/${formId}`, {
    method: 'PATCH',
    body: {
      questions: [...currentQuestions, newQuestion],
    } as any,
  });

  return newQuestion;
};

/**
 * Service method to reorder questions in a check-in
 */
/**
 * Service method to reorder questions in a check-in
 * Now acts as a "save all questions" method to ensure exact order persistence
 */
export const reorderQuestions = async (data: ReorderQuestionsData): Promise<void> => {
  const { formId, questions } = data;

  // Update check-in with the exact provided state
  await apiFetch(`/coach/forms/check-ins/${formId}`, {
    method: 'PATCH',
    body: {
      questions: questions,
    } as any,
  });
};

/**
 * Service method to delete a question from a check-in
 */
export const deleteQuestion = async (data: DeleteQuestionData): Promise<void> => {
  const { formId, questionId } = data;

  // Get current check-in
  const response = await apiFetch<{ data: { checkIn: CheckIn } }>(`/coach/forms/check-ins/${formId}`);
  const currentQuestions = response.data.checkIn.questions || [];

  // Remove the question
  const updatedQuestions = currentQuestions
    .filter(q => q.id !== questionId);

  // Update check-in
  await apiFetch(`/coach/forms/check-ins/${formId}`, {
    method: 'PATCH',
    body: {
      questions: updatedQuestions,
    } as any,
  });
};

/**
 * Service method to delete a check-in from coach's library
 */
export const deleteCheckIn = async (id: string): Promise<void> => {
  await apiFetch(`/coach/forms/check-ins/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Duplicate a check-in in coach's library
 */
export const duplicateCheckIn = async (checkInId: string, originalCheckIn: CheckIn): Promise<CheckIn> => {
  const { id, created_at, updated_at, ...dataToCopy } = originalCheckIn;

  const response = await apiFetch<{ data: { checkIn: CheckIn } }>('/coach/forms/check-ins', {
    method: 'POST',
    body: {
      ...dataToCopy,
      name: `${originalCheckIn.name} (Copy)`,
    } as any,
  });

  return response.data.checkIn;
};
