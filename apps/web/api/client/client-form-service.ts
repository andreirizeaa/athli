import type { CheckIn, Questionnaire } from '@athli/shared-types';
import { apiFetch } from '@/api/api-client';

// Import shared types and re-export for backwards compatibility
export type {
  Question,
  QuestionAnswer,
  ClientCheckIn,
  ClientQuestionnaire,
  ClientQuestionnaireDetail,
  CheckInInstance,
  AssignFormScheduleData,
  AssignClientCheckInData,
  AssignClientQuestionnaireData,
  DeleteClientCheckInsData,
  DeleteClientQuestionnairesData,
  AssignFormData,
  AssignFormsToClientsData,
  AddCoachReviewData,
  UpdateCoachReviewData,
  CoachReview,
} from '@athli/shared-types';

import type {
  Question,
  QuestionAnswer,
  ClientCheckIn,
  ClientQuestionnaire,
  ClientQuestionnaireDetail as SharedClientQuestionnaireDetail,
  CheckInInstance,
  AssignFormScheduleData,
  AssignClientCheckInData,
  AssignClientQuestionnaireData,
  DeleteClientCheckInsData,
  DeleteClientQuestionnairesData,
  AssignFormData,
  AssignFormsToClientsData,
  AddCoachReviewData,
  UpdateCoachReviewData,
  CoachReview,
} from '@athli/shared-types';

type Form = CheckIn | Questionnaire;

// Mock check-ins data
const mockClientCheckIns: ClientCheckIn[] = [
  {
    id: 'checkin-1',
    name: 'Weekly Check-in',
    questionCount: 5,
    schedule: 'Every Monday',
    nextScheduledAt: new Date(2025, 11, 23),
    createdAt: new Date(2025, 9, 1),
    description: 'Weekly progress check-in form',
    status: 'live',
    submissionCount: 12,
  },
  {
    id: 'checkin-2',
    name: 'Monthly Assessment',
    questionCount: 12,
    schedule: 'First of each month',
    nextScheduledAt: new Date(2026, 0, 1),
    createdAt: new Date(2025, 8, 15),
    description: 'Comprehensive monthly assessment',
    status: 'live',
    submissionCount: 3,
  },
  {
    id: 'checkin-3',
    name: 'Daily Check-in',
    questionCount: 3,
    schedule: 'Daily',
    nextScheduledAt: new Date(2025, 11, 20),
    createdAt: new Date(2025, 10, 1),
    description: 'Quick daily check-in',
    status: 'draft',
    submissionCount: 0,
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
 */
export const getClientCheckIns = async (clientId: string, coachId: string): Promise<ClientCheckIn[]> => {
  const response = await apiFetch<{ data: { checkins: any[] } }>(`/client/forms/check-ins`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });

  return response.data.checkins.map((c: any) => {
    const questionCount = c.questions?.length || 0;
    // Status logic: draft if 0 questions, otherwise use backend status or default to 'live'
    const status = questionCount === 0 ? 'draft' : (c.status || 'live');
    return {
      id: c.id || c.assignment_id,
      name: c.name || 'Unknown Check-in',
      questionCount,
      schedule: c.schedule_config?.frequency || 'Manual',
      nextScheduledAt: new Date(c.assigned_at || c.created_at),
      createdAt: new Date(c.created_at),
      description: c.description,
      status: status as 'draft' | 'live' | 'paused',
      submissionCount: c.submission_count || 0,
    };
  });
};

/**
 * Service method to get questionnaires for a client
 */
export const getClientQuestionnaires = async (clientId: string, coachId: string): Promise<ClientQuestionnaire[]> => {
  const response = await apiFetch<{ data: { questionnaires: any[] } }>(`/client/forms/questionnaires`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });

  return response.data.questionnaires.map((q: any) => {
    const questionCount = q.questions?.length || 0;
    // Status logic: draft if 0 questions, otherwise use backend status or default to 'draft'
    const status = questionCount === 0 ? 'draft' : (q.status || 'draft');
    return {
      id: q.id || q.assignment_id,
      name: q.name || 'Unknown Questionnaire',
      questionCount,
      status: status as 'draft' | 'pending' | 'completed',
      sentAt: q.sent_at ? new Date(q.sent_at) : undefined,
      completedAt: q.completed_at ? new Date(q.completed_at) : undefined,
      description: q.description,
    };
  });
};

/**
 * Service method to get a single questionnaire for a client (with response data)
 */
export const getClientQuestionnaire = async (clientId: string, coachId: string, questionnaireId: string): Promise<SharedClientQuestionnaireDetail> => {
  const response = await apiFetch<{ data: SharedClientQuestionnaireDetail }>(`/client/forms/questionnaires/${questionnaireId}`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });

  return {
    ...response.data,
    sentAt: response.data.sentAt ? new Date(response.data.sentAt) : undefined,
    completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
  };
};

// ... (get single form methods are still mocked/placeholders, keeping as is for now)

// ... (get single form methods are still mocked/placeholders, keeping as is for now)

export const assignClientCheckIn = async (data: AssignClientCheckInData): Promise<void> => {
  await apiFetch(`/client/forms/check-ins`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      checkInIds: data.checkInIds,
      schedule_config: data.schedule_config,
      cron_expression: data.cron_expression,
      status: data.status,
    }),
  });
};

export const assignClientQuestionnaire = async (data: AssignClientQuestionnaireData): Promise<void> => {
  await apiFetch(`/client/forms/questionnaires`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      questionnaireIds: data.questionnaireIds,
      status: data.status,
    }),
  });
};

/**
 * Service method to delete check-ins from a client
 */
export const deleteClientCheckIns = async (data: DeleteClientCheckInsData & { coachId: string }): Promise<void> => {
  await apiFetch(`/client/forms/check-ins`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ checkInIds: data.checkInIds }),
  });
};

export const deleteClientQuestionnaires = async (data: DeleteClientQuestionnairesData & { coachId: string }): Promise<void> => {
  await apiFetch(`/client/forms/questionnaires`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ questionnaireIds: data.questionnaireIds }),
  });
};

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
/**
 * Service method to assign a form to a client with a schedule
 */
export const assignForm = async (data: AssignFormData): Promise<void> => {
  if (data.formType === 'check-in') {
    await assignClientCheckIn({
      checkInIds: [data.formId],
      clientId: data.clientId,
      coachId: data.coachId,
      schedule_config: data.scheduleData,
      cron_expression: data.cronExpression,
      status: data.status as 'draft' | 'live' | undefined,
    });
  } else {
    await assignClientQuestionnaire({
      questionnaireIds: [data.formId],
      clientId: data.clientId,
      coachId: data.coachId,
      schedule_config: data.scheduleData,
      cron_expression: data.cronExpression,
      status: data.status as 'draft' | 'pending' | undefined,
    });
  }
};

export const assignFormsToClients = async (data: AssignFormsToClientsData): Promise<void> => {
  if (data.formType === 'check-in') {
    await apiFetch(`/client/forms/check-ins`, {
      method: 'POST',
      headers: { 'x-coach-id': data.coachId },
      body: JSON.stringify({
        checkInIds: data.formIds,
        clientIds: data.clientIds,
        schedule_config: data.scheduleData,
        cron_expression: data.cronExpression
      }),
    });
  } else {
    // Questionnaires bulk assignment
    await apiFetch(`/client/forms/questionnaires`, {
      method: 'POST',
      headers: { 'x-coach-id': data.coachId },
      body: JSON.stringify({
        questionnaireIds: data.formIds,
        clientIds: data.clientIds, // Send array of client IDs
      }),
    });
  }
}

/**
 * Duplicate a form
 * @param formId - ID of the form to duplicate
 * @param originalForm - Original form object to duplicate
 */
export const duplicateForm = async (formId: string, originalForm: Form): Promise<Form> => {
  // Import the appropriate service based on form type
  const isCheckIn = formId.startsWith('checkin-');

  if (isCheckIn) {
    const { duplicateCheckIn } = await import('@/api/coach/coach-check-in-service');
    return await duplicateCheckIn(formId, originalForm as CheckIn);
  } else {
    const { duplicateQuestionnaire } = await import('@/api/coach/coach-questionnaire-service');
    return await duplicateQuestionnaire(formId, originalForm as Questionnaire);
  }
};

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

/**
 * Service method to get a coach review for a check-in instance
 * This will be connected to the backend in the future
 */
export const getCoachReview = async (
  clientId: string,
  checkInId: string,
  instanceId: string
): Promise<CoachReview | null> => {
  console.log('Getting coach review:', { clientId, checkInId, instanceId });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${clientId}/check-ins/${checkInId}/instances/${instanceId}/review`, {
  //   method: 'GET',
  // })
  // if (!response.ok) {
  //   if (response.status === 404) return null;
  //   throw new Error('Failed to get coach review')
  // }
  // return await response.json()

  // Mock: Return null to simulate no review exists
  // In production, this would check if a review exists
  return null;
};

/**
 * Service method to add a coach review to a check-in instance
 * This will be connected to the backend in the future
 */
export const addCoachReview = async (data: AddCoachReviewData): Promise<void> => {
  console.log('Adding coach review:', {
    clientId: data.clientId,
    checkInId: data.checkInId,
    instanceId: data.instanceId,
    review: data.review,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${data.clientId}/check-ins/${data.checkInId}/instances/${data.instanceId}/review`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ review: data.review }),
  // })
  // if (!response.ok) throw new Error('Failed to add coach review')
};

/**
 * Service method to update a coach review for a check-in instance
 * This will be connected to the backend in the future
 */
export const updateCoachReview = async (data: UpdateCoachReviewData): Promise<void> => {
  console.log('Updating coach review:', {
    clientId: data.clientId,
    checkInId: data.checkInId,
    instanceId: data.instanceId,
    review: data.review,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/clients/${data.clientId}/check-ins/${data.checkInId}/instances/${data.instanceId}/review`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ review: data.review }),
  // })
  // if (!response.ok) throw new Error('Failed to update coach review')
};

// Types for client-specific form creation
export type CreateClientCheckInData = {
  clientId: string;
  coachId: string;
  name: string;
  description?: string;
  questions: any[];
  scheduleConfig: Record<string, any>;
  cronExpression: string;
  status?: 'draft' | 'live';
};

export type CreateClientQuestionnaireData = {
  clientId: string;
  coachId: string;
  name: string;
  description?: string;
  questions: any[];
  status?: 'draft' | 'pending';
};

export type UpdateClientCheckInData = {
  clientId: string;
  coachId: string;
  checkInId: string;
  questions: any[];
};

export type EditClientCheckInDetailsData = {
  clientId: string;
  coachId: string;
  checkInId: string;
  name: string;
  description?: string;
  schedule_config?: Record<string, any>;
  cron_expression?: string;
};

export type UpdateClientQuestionnaireData = {
  clientId: string;
  coachId: string;
  questionnaireId: string;
  questions: any[];
};

export type EditClientQuestionnaireDetailsData = {
  clientId: string;
  coachId: string;
  questionnaireId: string;
  name: string;
  description?: string;
};

export type ClientCheckInDetail = {
  id: string;
  name: string;
  description?: string;
  questions: any[];
  scheduleConfig?: Record<string, any>;
  cronExpression?: string;
};

export type LocalClientQuestionnaireDetail = {
  id: string;
  name: string;
  description?: string;
  questions: any[];
  status?: 'draft' | 'pending' | 'completed';
  sent_at?: string;
  completed_at?: string;
};

/**
 * Create a check-in directly for a client (not in coach library)
 */
export const createClientCheckIn = async (data: CreateClientCheckInData): Promise<ClientCheckInDetail> => {
  // If no questions, set status to draft
  const status = data.questions.length === 0 ? 'draft' : (data.status || 'live');

  const response = await apiFetch<{ data: ClientCheckInDetail }>(`/client/forms/check-ins/create`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      questions: data.questions,
      schedule_config: data.scheduleConfig,
      cron_expression: data.cronExpression,
      status,
    }),
  });

  return response.data;
};

/**
 * Create a questionnaire directly for a client (not in coach library)
 */
export const createClientQuestionnaire = async (data: CreateClientQuestionnaireData): Promise<LocalClientQuestionnaireDetail> => {
  // If no questions, set status to draft
  const status = data.questions.length === 0 ? 'draft' : (data.status || 'draft');

  const response = await apiFetch<{ data: LocalClientQuestionnaireDetail }>(`/client/forms/questionnaires/create`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      questions: data.questions,
      status,
    }),
  });

  return response.data;
};

/**
 * Get a single client check-in with questions (for editing)
 */
export const getClientCheckInById = async (clientId: string, coachId: string, checkInId: string): Promise<ClientCheckInDetail> => {
  const response = await apiFetch<{ data: ClientCheckInDetail }>(`/client/forms/check-ins/${checkInId}`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });

  return response.data;
};

/**
 * Get a single client questionnaire with questions (for editing)
 */
export const getClientQuestionnaireById = async (clientId: string, coachId: string, questionnaireId: string): Promise<LocalClientQuestionnaireDetail> => {
  const response = await apiFetch<{ data: LocalClientQuestionnaireDetail }>(`/client/forms/questionnaires/${questionnaireId}`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });

  return response.data;
};

/**
 * Update client check-in questions
 */
export const updateClientCheckIn = async (data: UpdateClientCheckInData): Promise<void> => {
  await apiFetch(`/client/forms/check-ins/${data.checkInId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      questions: data.questions,
    }),
  });
};

/**
 * Edit client check-in details (name, description, schedule)
 */
export const editClientCheckInDetails = async (data: EditClientCheckInDetailsData): Promise<ClientCheckInDetail> => {
  const response = await apiFetch<{ data: ClientCheckInDetail }>(`/client/forms/check-ins/${data.checkInId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      schedule_config: data.schedule_config,
      cron_expression: data.cron_expression,
    }),
  });

  return response.data;
};

/**
 * Update client questionnaire questions
 */
export const updateClientQuestionnaire = async (data: UpdateClientQuestionnaireData): Promise<void> => {
  await apiFetch(`/client/forms/questionnaires/${data.questionnaireId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      questions: data.questions,
    }),
  });
};

/**
 * Edit client questionnaire details (name, description)
 */
export const editClientQuestionnaireDetails = async (data: EditClientQuestionnaireDetailsData): Promise<LocalClientQuestionnaireDetail> => {
  const response = await apiFetch<{ data: LocalClientQuestionnaireDetail }>(`/client/forms/questionnaires/${data.questionnaireId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });

  return response.data;
};

/**
 * Send a questionnaire to a client (update status from draft to pending)
 */
export type SendClientQuestionnaireData = {
  questionnaireId: string;
  clientId: string;
  coachId: string;
};

export const sendClientQuestionnaire = async (data: SendClientQuestionnaireData): Promise<void> => {
  await apiFetch(`/client/forms/questionnaires/${data.questionnaireId}/send`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
  });
};

/**
 * Resend a questionnaire to a client (duplicate and send again)
 */
export type ResendClientQuestionnaireData = {
  questionnaireId: string;
  clientId: string;
  coachId: string;
};

export const resendClientQuestionnaire = async (data: ResendClientQuestionnaireData): Promise<void> => {
  await apiFetch(`/client/forms/questionnaires/${data.questionnaireId}/resend`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
  });
};

/**
 * Update client check-in status (publish, pause)
 */
export type UpdateClientCheckInStatusData = {
  checkInId: string;
  clientId: string;
  coachId: string;
  status: 'live' | 'paused';
};

export const updateClientCheckInStatus = async (data: UpdateClientCheckInStatusData): Promise<void> => {
  await apiFetch(`/client/forms/check-ins/${data.checkInId}/status`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      status: data.status,
    }),
  });
};

/**
 * Get a signed URL for questionnaire media (images, videos, signatures, progress photos)
 */
export const getQuestionnaireMediaUrl = async (
  bucket: 'form_files' | 'client_photos',
  path: string
): Promise<string> => {
  const response = await apiFetch<{ data: { url: string } }>(
    `/client/forms/questionnaires/media-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
  );
  return response.data.url;
};

