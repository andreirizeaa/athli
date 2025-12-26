import { apiFetch } from '@/api/api-client';

export interface AddCheckInData {
  name: string;
  description?: string;
  schedule_cron?: string;
}

export interface CheckIn {
  id: string;
  name: string;
  description?: string;
  schedule_cron?: string;
  questions: Question[];
  created_at: string;
  updated_at: string;
}

export interface EditCheckInDetailsData {
  id: string;
  name: string;
  description?: string;
  schedule_cron?: string;
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

  // Generate a sequential ID for the new question
  const nextId = (currentQuestions.length + 1).toString();
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
export const reorderQuestions = async (data: ReorderQuestionsData): Promise<void> => {
  const { formId, questionIds } = data;

  // Get current check-in
  const response = await apiFetch<{ data: { checkIn: CheckIn } }>(`/coach/forms/check-ins/${formId}`);
  const currentQuestions = response.data.checkIn.questions || [];

  // Create new ordered questions array and re-assign chronological IDs
  const reorderedQuestions = questionIds.map(id =>
    currentQuestions.find(q => q.id === id)
  ).filter(Boolean) as Question[];

  const reIdedQuestions = reorderedQuestions.map((q, index) => ({
    ...q,
    id: (index + 1).toString(),
  }));

  // Update check-in
  await apiFetch(`/coach/forms/check-ins/${formId}`, {
    method: 'PATCH',
    body: {
      questions: reIdedQuestions,
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

  // Remove the question and re-assign chronological IDs
  const updatedQuestions = currentQuestions
    .filter(q => q.id !== questionId)
    .map((q, index) => ({
      ...q,
      id: (index + 1).toString(),
    }));

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
