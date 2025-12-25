export interface AddCheckInData {
  name: string;
  description?: string;
}

export interface CheckIn {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  createdAt: number;
}

export interface EditCheckInDetailsData {
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

// Mock check-ins data - in production this would come from an API
const mockCheckIns: CheckIn[] = [
  {
    id: 'checkin-1',
    name: 'Weekly Check-in',
    description: 'Weekly progress check-in form',
    questionCount: 3,
    createdAt: Date.now() - 86400000 * 3,
  },
];

/**
 * Service method to get all check-ins from coach's library
 * This will be connected to the backend in the future
 */
export const getCheckIns = async (): Promise<CheckIn[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return mockCheckIns;
};

/**
 * Service method to add a check-in to coach's library
 * This will be connected to the backend in the future
 */
export const addCheckIn = async (data: AddCheckInData): Promise<CheckIn> => {
  // TODO: Connect to backend API
  console.log('Adding check-in:', {
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const newCheckIn: CheckIn = {
    id: `checkin-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: data.name,
    description: data.description,
    questionCount: 0,
    createdAt: Date.now(),
  };

  return newCheckIn;
};

/**
 * Service method to edit check-in details in coach's library
 * This will be connected to the backend in the future
 */
export const editCheckInDetails = async (data: EditCheckInDetailsData): Promise<CheckIn> => {
  // TODO: Connect to backend API
  console.log('Editing check-in details:', {
    id: data.id,
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const updatedCheckIn: CheckIn = {
    id: data.id,
    name: data.name,
    description: data.description,
    questionCount: 0, // This would come from the backend
    createdAt: Date.now(), // This would come from the backend
  };

  return updatedCheckIn;
};

/**
 * Service method to add a question to a check-in in coach's library
 * This will be connected to the backend in the future
 */
export const addQuestion = async (data: AddQuestionData): Promise<Question> => {
  console.log('Adding question to check-in:', {
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
 * Service method to reorder questions in a check-in
 * This will be connected to the backend in the future
 */
export const reorderQuestions = async (data: ReorderQuestionsData): Promise<void> => {
  console.log('Reordering questions for check-in:', {
    formId: data.formId,
    questionIds: data.questionIds,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Duplicate a check-in in coach's library
 * @param checkInId - ID of the check-in to duplicate
 * @param originalCheckIn - Original check-in object to duplicate
 */
export const duplicateCheckIn = async (checkInId: string, originalCheckIn: CheckIn): Promise<CheckIn> => {
  // TODO: Connect to backend API
  console.log('Duplicating check-in:', { checkInId, originalCheckIn });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const duplicatedCheckIn: CheckIn = {
    ...originalCheckIn,
    id: `checkin-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalCheckIn.name} (Copy)`,
    createdAt: Date.now(),
  };

  return duplicatedCheckIn;
};

