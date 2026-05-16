import { apiFetch } from '@/lib/api-client';
import type { CheckInReview, CheckIn, ReorderQuestionsData, AddCheckInData, EditCheckInDetailsData, AddQuestionData, Question } from '@athli/shared-types';

export type { CheckInReview, CheckIn, ReorderQuestionsData, AddCheckInData, EditCheckInDetailsData, AddQuestionData, Question };

/**
 * Service method to get all check-ins awaiting review
 */
export const getCheckInReviews = async (): Promise<CheckInReview[]> => {
  const response = await apiFetch<{ data: { reviews: CheckInReview[] } }>('/coach/forms/check-ins/reviews');
  return response.data.reviews;
};

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

/**
 * Service method to reorder questions in a check-in
 * Acts as a "save all questions" method to ensure exact order persistence
 */
export const reorderQuestions = async (data: ReorderQuestionsData): Promise<void> => {
  const { formId, questions } = data;

  await apiFetch(`/coach/forms/check-ins/${formId}`, {
    method: 'PATCH',
    body: {
      questions: questions,
    } as any,
  });
};

/** Generate a v4 UUID. Uses crypto.randomUUID when available. */
function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Add a question to a check-in.
 * Fetches the current check-in, appends the new question, and patches the array.
 */
export const addQuestion = async (data: AddQuestionData): Promise<Question> => {
  const { formId, ...questionData } = data;

  // Get current check-in to get existing questions
  const response = await apiFetch<{ data: { checkIn: CheckIn } }>(`/coach/forms/check-ins/${formId}`);
  const currentQuestions = response.data.checkIn.questions || [];

  const newQuestion: Question = {
    ...questionData,
    id: uuid(),
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
