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

/**
 * Get all submission logs for a check-in assignment
 */
export const getClientCheckInsForForm = async (
  clientId: string,
  checkInId: string,
  coachId: string
): Promise<CheckInInstance[]> => {
  const response = await apiFetch<{ data: { instances: any[] } }>(`/client/forms/check-ins/${checkInId}/logs`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
  });

  return (response.data.instances || []).map((i: any) => ({
    id: i.id,
    formId: i.formId,
    formName: i.formName,
    scheduledDate: new Date(i.scheduledDate),
    status: i.status,
    completedAt: i.completedAt ? new Date(i.completedAt) : undefined,
  }));
};

/**
 * Get a single check-in log with questions and answers
 */
export const getCheckInInstance = async (
  clientId: string,
  checkInId: string,
  instanceId: string,
  coachId: string
): Promise<CheckInInstance> => {
  const response = await apiFetch<{ data: any }>(`/client/forms/check-ins/${checkInId}/logs/${instanceId}`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
  });

  const d = response.data;
  return {
    id: d.id,
    formId: d.formId,
    formName: d.formName,
    scheduledDate: new Date(d.scheduledDate),
    status: d.status,
    completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
    questions: d.questions || [],
    answers: normalizeAnswers(d.answers || []),
  };
};

/**
 * Normalize answer data into a consistent QuestionAnswer[] format.
 * Handles:
 * - Array of {questionId, answer} (keyed format from mobile submit)
 * - Array of {value} (positional format from questionnaire DB)
 * - Object with numeric keys {"0": {value}, "1": {value}} (check-in DB format)
 * - Empty object {} (DB default)
 */
const normalizeAnswers = (answers: any): QuestionAnswer[] => {
  if (!answers) return [];

  // Array format
  if (Array.isArray(answers)) {
    return answers.map((a: any) => ({
      questionId: a.questionId || a.question_id || '',
      answer: a.answer ?? a.value,
    }));
  }

  // Object with numeric keys: {"0": {value: 8}, "1": {value: true}, ...}
  if (typeof answers === 'object') {
    const keys = Object.keys(answers).sort((a, b) => Number(a) - Number(b));
    if (keys.length === 0) return [];
    return keys.map((key) => {
      const entry = answers[key];
      return {
        questionId: entry?.questionId || entry?.question_id || '',
        answer: entry?.answer ?? entry?.value,
      };
    });
  }

  return [];
};

/**
 * Get coach review from a check-in log (derived from the log data)
 */
export const getCoachReview = async (
  clientId: string,
  checkInId: string,
  instanceId: string,
  coachId: string
): Promise<CoachReview | null> => {
  const response = await apiFetch<{ data: any }>(`/client/forms/check-ins/${checkInId}/logs/${instanceId}`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
  });

  const d = response.data;
  if (d.coachComment) {
    return {
      review: d.coachComment,
      createdAt: d.reviewedAt ? new Date(d.reviewedAt) : new Date(),
    };
  }
  return null;
};

/**
 * Add a coach review to a check-in log
 */
export const addCoachReview = async (data: AddCoachReviewData): Promise<void> => {
  await apiFetch(`/client/forms/check-ins/${data.checkInId}/logs/${data.instanceId}/review`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ review: data.review }),
  });
};

/**
 * Update a coach review for a check-in log
 */
export const updateCoachReview = async (data: UpdateCoachReviewData): Promise<void> => {
  await apiFetch(`/client/forms/check-ins/${data.checkInId}/logs/${data.instanceId}/review`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ review: data.review }),
  });
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
  status?: 'draft' | 'live' | 'paused';
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

