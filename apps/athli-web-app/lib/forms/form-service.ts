export interface AddFormData {
  name: string;
  description?: string;
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
 * Service method to get all forms
 * This will be connected to the backend in the future
 */
export const getForms = async (): Promise<Form[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/forms', {
  //   method: 'GET',
  // })
  // if (!response.ok) throw new Error('Failed to get forms')
  // return await response.json()

  return mockForms;
};

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
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock form
  const newForm: Form = {
    id: `form-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: data.name,
    description: data.description,
    questionCount: 0,
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

export interface Question {
  id: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
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
}

export interface ReorderQuestionsData {
  formId: string;
  questionIds: string[];
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

/**
 * Service method to add a question to a form
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

  // Return mock question
  const newQuestion: Question = {
    id: `q${Date.now()}-${Math.random().toString(36).substring(7)}`,
    question: data.question,
    required: data.required,
    format: data.format,
    options: data.options,
    scaleFrom: data.scaleFrom,
    scaleTo: data.scaleTo,
    mediaCount: data.mediaCount,
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/forms/${data.formId}/questions`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     question: data.question,
  //     required: data.required,
  //     format: data.format,
  //     options: data.options,
  //     scaleFrom: data.scaleFrom,
  //     scaleTo: data.scaleTo,
  //     mediaCount: data.mediaCount,
  //   }),
  // })
  // if (!response.ok) throw new Error('Failed to add question')
  // return await response.json()

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

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/forms/${data.formId}/questions/reorder`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ questionIds: data.questionIds }),
  // })
  // if (!response.ok) throw new Error('Failed to reorder questions')
}

export interface ClientCheckIn {
  id: string;
  name: string;
  questionCount: number;
  schedule: string;
  nextScheduledAt: Date;
  description?: string;
}

export interface ClientQuestionnaire {
  id: string;
  name: string;
  questionCount: number;
  status: 'pending' | 'completed';
  sentAt: Date;
  completedAt?: Date;
  description?: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string | string[] | number | Date | null;
}

export interface ClientQuestionnaireDetail {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'completed';
  sentAt: Date;
  completedAt?: Date;
  questions: Question[];
  answers: QuestionAnswer[];
}

// Mock check-ins data
const mockClientCheckIns: ClientCheckIn[] = [
  {
    id: 'checkin-1',
    name: 'Weekly Check-in',
    questionCount: 5,
    schedule: 'Every Monday',
    nextScheduledAt: new Date(2025, 11, 23),
    description: 'Weekly progress check-in form',
  },
  {
    id: 'checkin-2',
    name: 'Monthly Assessment',
    questionCount: 12,
    schedule: 'First of each month',
    nextScheduledAt: new Date(2026, 0, 1),
    description: 'Comprehensive monthly assessment',
  },
  {
    id: 'checkin-3',
    name: 'Daily Check-in',
    questionCount: 3,
    schedule: 'Daily',
    nextScheduledAt: new Date(2025, 11, 20),
    description: 'Quick daily check-in',
  },
];

// Mock questionnaires data
const mockClientQuestionnaires: ClientQuestionnaire[] = [
  {
    id: 'questionnaire-1',
    name: 'Initial Assessment',
    questionCount: 8,
    status: 'completed',
    sentAt: new Date(2025, 10, 15),
    completedAt: new Date(2025, 10, 16),
    description: 'One-time initial assessment form',
  },
  {
    id: 'questionnaire-2',
    name: 'Mid-Season Evaluation',
    questionCount: 10,
    status: 'pending',
    sentAt: new Date(2025, 11, 18),
    description: 'Mid-season performance evaluation',
  },
];

/**
 * Service method to get check-ins for a client
 * This will be connected to the backend in the future
 */
export const getClientCheckIns = async (clientId: string): Promise<ClientCheckIn[]> => {
  console.log('Getting check-ins for client:', clientId);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${clientId}/check-ins`, {
  //   method: 'GET',
  // })
  // if (!response.ok) throw new Error('Failed to get client check-ins')
  // return await response.json()

  return mockClientCheckIns;
};

/**
 * Service method to get questionnaires for a client
 * This will be connected to the backend in the future
 */
export const getClientQuestionnaires = async (clientId: string): Promise<ClientQuestionnaire[]> => {
  console.log('Getting questionnaires for client:', clientId);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${clientId}/questionnaires`, {
  //   method: 'GET',
  // })
  // if (!response.ok) throw new Error('Failed to get client questionnaires')
  // return await response.json()

  return mockClientQuestionnaires;
};

/**
 * Service method to get a specific questionnaire for a client with questions and answers
 * This will be connected to the backend in the future
 */
export const getClientQuestionnaire = async (
  clientId: string,
  questionnaireId: string
): Promise<ClientQuestionnaireDetail> => {
  console.log('Getting questionnaire detail for client:', { clientId, questionnaireId });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${clientId}/questionnaires/${questionnaireId}`, {
  //   method: 'GET',
  // })
  // if (!response.ok) throw new Error('Failed to get client questionnaire')
  // return await response.json()

  // Mock data
  const mockQuestions: Question[] = [
    {
      id: 'q1',
      question: 'What is your primary fitness goal?',
      required: true,
      format: 'multipleChoice',
      options: ['Weight loss', 'Muscle gain', 'General fitness', 'Athletic performance'],
    },
    {
      id: 'q2',
      question: 'How many days per week can you commit to training?',
      required: true,
      format: 'number',
    },
    {
      id: 'q3',
      question: 'Rate your current fitness level',
      required: true,
      format: 'scale',
      scaleFrom: '1',
      scaleTo: '10',
    },
    {
      id: 'q4',
      question: 'Do you have any injuries or limitations?',
      required: true,
      format: 'yesNo',
    },
    {
      id: 'q5',
      question: 'Please describe your training experience',
      required: false,
      format: 'text',
    },
    {
      id: 'q6',
      question: 'Upload progress photos',
      required: false,
      format: 'images',
      mediaCount: 3,
    },
    {
      id: 'q7',
      question: 'When did you start training?',
      required: false,
      format: 'date',
    },
    {
      id: 'q8',
      question: 'Rate your overall satisfaction',
      required: false,
      format: 'rating',
    },
  ];

  const mockAnswers: QuestionAnswer[] = [
    { questionId: 'q1', answer: 'Muscle gain' },
    { questionId: 'q2', answer: 5 },
    { questionId: 'q3', answer: 7 },
    { questionId: 'q4', answer: 'No' },
    { questionId: 'q5', answer: 'I have been training for 3 years with focus on strength training and bodybuilding. I follow a structured program and track my progress regularly.' },
    { questionId: 'q6', answer: ['https://picsum.photos/400/600', 'https://picsum.photos/400/601', 'https://picsum.photos/400/602'] },
    { questionId: 'q7', answer: new Date(2022, 0, 15) },
    { questionId: 'q8', answer: 5 },
  ];

  return {
    id: questionnaireId,
    name: 'Initial Assessment',
    description: 'One-time initial assessment form',
    status: 'completed',
    sentAt: new Date(2025, 10, 15),
    completedAt: new Date(2025, 1, 27, 9, 45), // Feb 27, 2025 at 9:45 AM
    questions: mockQuestions,
    answers: mockAnswers,
  };
};

export interface DeleteClientCheckInsData {
  checkInIds: string[];
  clientId: string;
}

/**
 * Service method to delete check-ins from a client
 * This will be connected to the backend in the future
 */
export const deleteClientCheckIns = async (data: DeleteClientCheckInsData): Promise<void> => {
  console.log('Deleting client check-ins:', {
    checkInIds: data.checkInIds,
    clientId: data.clientId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${data.clientId}/check-ins`, {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ checkInIds: data.checkInIds }),
  // })
  // if (!response.ok) throw new Error('Failed to delete client check-ins')
}

export interface AssignFormScheduleData {
  type: 'check-in' | 'one-time';
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  selectedDays?: string[];
  monthlyOption?: 'first' | 'last' | 'specific';
  specificDay?: number;
  sendNow?: boolean;
  scheduledDate?: Date;
}

export interface AssignFormData {
  formId: string;
  clientId: string;
  cronExpression: string;
  scheduleData: AssignFormScheduleData;
}

/**
 * Converts schedule data to Supabase pg_cron expression syntax
 * Supabase uses pg_cron PostgreSQL extension which follows standard cron format:
 * minute hour day month weekday
 * 
 * Format: minute hour day month weekday
 * - minute: 0-59
 * - hour: 0-23
 * - day: 1-31
 * - month: 1-12
 * - weekday: 0-6 (0 = Sunday, 6 = Saturday)
 * 
 * Special characters supported by pg_cron:
 * - * : all possible values
 * - , : list of values (e.g., "1,3,5" for Monday, Wednesday, Friday)
 * - - : range of values (e.g., "1-5" for Monday to Friday)
 */
export const convertScheduleToCron = (scheduleData: AssignFormScheduleData): string => {
  const defaultHour = 9; // 9 AM default
  const defaultMinute = 0;

  // Day of week mapping for pg_cron (0 = Sunday, 6 = Saturday)
  const dayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  if (scheduleData.type === 'one-time') {
    if (scheduleData.sendNow) {
      // For "send now", return a cron that runs immediately (next minute)
      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60000);
      return `${nextMinute.getMinutes()} ${nextMinute.getHours()} ${nextMinute.getDate()} ${nextMinute.getMonth() + 1} ${nextMinute.getDay()}`;
    } else if (scheduleData.scheduledDate) {
      // For scheduled one-time, use the specific date/time
      const date = scheduleData.scheduledDate;
      return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} ${date.getDay()}`;
    }
    // Fallback: return a cron for next day at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${defaultMinute} ${defaultHour} ${tomorrow.getDate()} ${tomorrow.getMonth() + 1} ${tomorrow.getDay()}`;
  }

  // check-in type
  if (scheduleData.frequency === 'daily') {
    // Daily on selected days at 9 AM
    // If multiple days selected, use comma-separated list for weekdays in pg_cron
    if (scheduleData.selectedDays && scheduleData.selectedDays.length > 0) {
      const weekdays = scheduleData.selectedDays
        .map(day => dayMap[day] ?? 0)
        .sort((a, b) => a - b)
        .join(',');
      return `${defaultMinute} ${defaultHour} * * ${weekdays}`;
    }
    // If no days selected, run every day
    return `${defaultMinute} ${defaultHour} * * *`;
  } else if (scheduleData.frequency === 'weekly') {
    // Weekly on selected day at 9 AM
    const weekday = scheduleData.selectedDays && scheduleData.selectedDays.length > 0
      ? dayMap[scheduleData.selectedDays[0]] ?? 0
      : 0;
    return `${defaultMinute} ${defaultHour} * * ${weekday}`;
  } else if (scheduleData.frequency === 'biweekly') {
    // Biweekly (every 2 weeks) on selected day at 9 AM
    // Note: pg_cron doesn't support biweekly directly, so we'll use weekly
    // and handle the biweekly logic in the application layer
    const weekday = scheduleData.selectedDays && scheduleData.selectedDays.length > 0
      ? dayMap[scheduleData.selectedDays[0]] ?? 0
      : 0;
    // Return weekly cron - biweekly logic should be handled in the application
    return `${defaultMinute} ${defaultHour} * * ${weekday}`;
  } else if (scheduleData.frequency === 'monthly') {
    if (scheduleData.monthlyOption === 'first') {
      // 1st of the month at 9 AM
      return `${defaultMinute} ${defaultHour} 1 * *`;
    } else if (scheduleData.monthlyOption === 'last') {
      // Last day of the month at 9 AM
      // pg_cron doesn't support "last day" directly, so we use day 28-31
      // The application should filter to only run on the actual last day
      return `${defaultMinute} ${defaultHour} 28-31 * *`;
    } else if (scheduleData.monthlyOption === 'specific' && scheduleData.specificDay) {
      // Specific day of the month at 9 AM
      return `${defaultMinute} ${defaultHour} ${scheduleData.specificDay} * *`;
    }
    // Default to 1st of the month
    return `${defaultMinute} ${defaultHour} 1 * *`;
  }

  // Fallback: daily at 9 AM
  return `${defaultMinute} ${defaultHour} * * *`;
};

/**
 * Service method to assign a form to a client with a schedule
 * This will be connected to the backend in the future
 */
export const assignForm = async (data: AssignFormData): Promise<void> => {
  console.log('Assigning form to client:', {
    formId: data.formId,
    clientId: data.clientId,
    scheduleData: data.scheduleData,
    cronExpression: data.cronExpression,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${data.clientId}/check-ins`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     formId: data.formId,
  //     cronExpression: data.cronExpression,
  //     scheduleData: data.scheduleData,
  //   }),
  // })
  // if (!response.ok) throw new Error('Failed to assign form')
}

/**
 * Duplicate a form
 * @param formId - ID of the form to duplicate
 * @param originalForm - Original form object to duplicate
 */
export const duplicateForm = async (formId: string, originalForm: Form): Promise<Form> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now
  console.log('Duplicating form:', { formId, originalForm });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // In the future, this will:
  // 1. Fetch the full form data from the backend (including questions)
  // 2. Create a new form with the same data but name appended with " (Copy)"
  // 3. Return the new form

  // For now, create a duplicate with all properties copied and name appended with " (Copy)"
  const duplicatedForm: Form = {
    ...originalForm,
    id: `form-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalForm.name} (Copy)`,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/forms/${formId}/duplicate`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to duplicate form')
  // return await response.json()

  return duplicatedForm;
};

export interface CheckInInstance {
  id: string;
  formId: string;
  formName: string;
  scheduledDate: Date;
  status: 'assigned' | 'completed' | 'review' | 'reviewed';
  completedAt?: Date;
  questions?: Question[];
  answers?: QuestionAnswer[];
}

// Mock check-in instances data - in production this would come from an API
// Key format: `${clientId}-${checkInId}`
const mockCheckInInstances: Record<string, CheckInInstance[]> = {
  // Client ID 1 (John Smith) - Weekly Check-in
  '1-checkin-1': [
    {
      id: 'instance-1-1',
      formId: 'checkin-1',
      formName: 'Weekly Check-in',
      scheduledDate: new Date(2025, 10, 25), // Nov 25, 2025
      status: 'reviewed',
      completedAt: new Date(2025, 10, 25, 15, 20),
    },
    {
      id: 'instance-1-2',
      formId: 'checkin-1',
      formName: 'Weekly Check-in',
      scheduledDate: new Date(2025, 11, 2), // Dec 2, 2025
      status: 'reviewed',
      completedAt: new Date(2025, 11, 2, 16, 45),
    },
    {
      id: 'instance-1-3',
      formId: 'checkin-1',
      formName: 'Weekly Check-in',
      scheduledDate: new Date(2025, 11, 9), // Dec 9, 2025
      status: 'completed',
      completedAt: new Date(2025, 11, 9, 11, 30),
    },
    {
      id: 'instance-1-4',
      formId: 'checkin-1',
      formName: 'Weekly Check-in',
      scheduledDate: new Date(2025, 11, 16), // Dec 16, 2025
      status: 'review',
      completedAt: new Date(2025, 11, 16, 14, 10),
    },
    {
      id: 'instance-1-5',
      formId: 'checkin-1',
      formName: 'Weekly Check-in',
      scheduledDate: new Date(2025, 11, 23), // Dec 23, 2025
      status: 'assigned',
    },
    {
      id: 'instance-1-6',
      formId: 'checkin-1',
      formName: 'Weekly Check-in',
      scheduledDate: new Date(2025, 11, 30), // Dec 30, 2025
      status: 'assigned',
    },
    {
      id: 'instance-1-7',
      formId: 'checkin-1',
      formName: 'Weekly Check-in',
      scheduledDate: new Date(2026, 0, 6), // Jan 6, 2026
      status: 'assigned',
    },
  ],
  // Client ID 1 (John Smith) - Monthly Assessment
  '1-checkin-2': [
    {
      id: 'instance-2-1',
      formId: 'checkin-2',
      formName: 'Monthly Assessment',
      scheduledDate: new Date(2025, 9, 1), // Oct 1, 2025
      status: 'reviewed',
      completedAt: new Date(2025, 9, 2, 10, 15),
    },
    {
      id: 'instance-2-2',
      formId: 'checkin-2',
      formName: 'Monthly Assessment',
      scheduledDate: new Date(2025, 10, 1), // Nov 1, 2025
      status: 'reviewed',
      completedAt: new Date(2025, 10, 1, 18, 30),
    },
    {
      id: 'instance-2-3',
      formId: 'checkin-2',
      formName: 'Monthly Assessment',
      scheduledDate: new Date(2025, 11, 1), // Dec 1, 2025
      status: 'completed',
      completedAt: new Date(2025, 11, 1, 9, 45),
    },
    {
      id: 'instance-2-4',
      formId: 'checkin-2',
      formName: 'Monthly Assessment',
      scheduledDate: new Date(2026, 0, 1), // Jan 1, 2026
      status: 'assigned',
    },
    {
      id: 'instance-2-5',
      formId: 'checkin-2',
      formName: 'Monthly Assessment',
      scheduledDate: new Date(2026, 1, 1), // Feb 1, 2026
      status: 'assigned',
    },
  ],
  // Client ID 1 (John Smith) - Daily Check-in
  '1-checkin-3': [
    {
      id: 'instance-3-1',
      formId: 'checkin-3',
      formName: 'Daily Check-in',
      scheduledDate: new Date(2025, 11, 15), // Dec 15, 2025
      status: 'reviewed',
      completedAt: new Date(2025, 11, 15, 8, 30),
    },
    {
      id: 'instance-3-2',
      formId: 'checkin-3',
      formName: 'Daily Check-in',
      scheduledDate: new Date(2025, 11, 16), // Dec 16, 2025
      status: 'reviewed',
      completedAt: new Date(2025, 11, 16, 7, 45),
    },
    {
      id: 'instance-3-3',
      formId: 'checkin-3',
      formName: 'Daily Check-in',
      scheduledDate: new Date(2025, 11, 17), // Dec 17, 2025
      status: 'completed',
      completedAt: new Date(2025, 11, 17, 9, 15),
    },
    {
      id: 'instance-3-4',
      formId: 'checkin-3',
      formName: 'Daily Check-in',
      scheduledDate: new Date(2025, 11, 18), // Dec 18, 2025
      status: 'review',
      completedAt: new Date(2025, 11, 18, 8, 0),
    },
    {
      id: 'instance-3-5',
      formId: 'checkin-3',
      formName: 'Daily Check-in',
      scheduledDate: new Date(2025, 11, 19), // Dec 19, 2025
      status: 'assigned',
    },
    {
      id: 'instance-3-6',
      formId: 'checkin-3',
      formName: 'Daily Check-in',
      scheduledDate: new Date(2025, 11, 20), // Dec 20, 2025
      status: 'assigned',
    },
  ],
};

/**
 * Service method to get all instances of a specific check-in form for a client
 * This will be connected to the backend in the future
 */
export const getClientCheckInsForForm = async (
  clientId: string,
  checkInId: string
): Promise<CheckInInstance[]> => {
  console.log('Getting check-in instances for client and form:', { clientId, checkInId });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${clientId}/check-ins/${checkInId}/instances`, {
  //   method: 'GET',
  // })
  // if (!response.ok) throw new Error('Failed to get client check-in instances')
  // return await response.json()

  const key = `${clientId}-${checkInId}`;
  return mockCheckInInstances[key] || [];
};

/**
 * Service method to get a specific check-in instance with questions and answers
 * This will be connected to the backend in the future
 */
export const getCheckInInstance = async (
  clientId: string,
  checkInId: string,
  instanceId: string
): Promise<CheckInInstance> => {
  console.log('Getting check-in instance detail:', { clientId, checkInId, instanceId });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${clientId}/check-ins/${checkInId}/instances/${instanceId}`, {
  //   method: 'GET',
  // })
  // if (!response.ok) throw new Error('Failed to get check-in instance')
  // return await response.json()

  // Mock data
  const mockQuestions: Question[] = [
    {
      id: 'q1',
      question: 'How are you feeling this week?',
      required: true,
      format: 'scale',
      scaleFrom: '1',
      scaleTo: '10',
    },
    {
      id: 'q2',
      question: 'Did you follow your training plan?',
      required: true,
      format: 'yesNo',
    },
    {
      id: 'q3',
      question: 'Any injuries or concerns?',
      required: false,
      format: 'text',
    },
    {
      id: 'q4',
      question: 'Rate your energy levels',
      required: true,
      format: 'rating',
    },
    {
      id: 'q5',
      question: 'Progress photos (optional)',
      required: false,
      format: 'images',
      mediaCount: 3,
    },
  ];

  const mockAnswers: QuestionAnswer[] = [
    { questionId: 'q1', answer: 8 },
    { questionId: 'q2', answer: 'Yes' },
    { questionId: 'q3', answer: 'Slight knee pain after squats, but manageable. Taking extra rest days as needed.' },
    { questionId: 'q4', answer: 4 },
    { questionId: 'q5', answer: ['https://picsum.photos/400/600', 'https://picsum.photos/400/601'] },
  ];

  // Find the instance
  const key = `${clientId}-${checkInId}`;
  const instances = mockCheckInInstances[key] || [];
  const instance = instances.find((i) => i.id === instanceId);

  if (!instance) {
    throw new Error('Check-in instance not found');
  }

  return {
    ...instance,
    questions: mockQuestions,
    answers: mockAnswers,
  };
};

