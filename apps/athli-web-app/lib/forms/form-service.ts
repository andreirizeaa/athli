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

