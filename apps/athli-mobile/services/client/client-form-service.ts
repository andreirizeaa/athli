import { apiFetch } from '@/lib/api-client';
import type {
  Question,
  QuestionAnswer,
  ClientCheckIn,
  ClientQuestionnaire,
  ClientQuestionnaireDetail,
  CheckInInstance,
  AssignClientCheckInData,
  AssignClientQuestionnaireData,
  DeleteClientCheckInsData,
  DeleteClientQuestionnairesData,
  AssignFormScheduleData,
  AssignFormsToClientsData,
} from '@athli/shared-types';

/**
 * Client form service for check-ins and questionnaires
 * Mirrors apps/athli-web-app/api/client/client-form-service.ts
 */

// Re-export types from shared-types for backwards compatibility
export type {
  Question,
  QuestionAnswer,
  ClientCheckIn,
  ClientQuestionnaire,
  ClientQuestionnaireDetail,
  CheckInInstance,
  AssignClientCheckInData,
  AssignClientQuestionnaireData,
  DeleteClientCheckInsData,
  DeleteClientQuestionnairesData,
  AssignFormScheduleData,
  AssignFormsToClientsData,
};

/**
 * Get check-ins for a client
 */
export const getClientCheckIns = async (
  clientId: string,
  coachId: string
): Promise<ClientCheckIn[]> => {
  const response = await apiFetch<{ success: boolean; data: { checkins: any[] } }>(
    '/client/forms/check-ins',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return response.data.checkins.map((c: any) => ({
    id: c.id || c.assignment_id,
    name: c.name || 'Unknown Check-in',
    questionCount: c.questions?.length || 0,
    schedule: c.schedule_config?.frequency || 'manual',
    nextScheduledAt: new Date(c.next_scheduled_at || c.assigned_at || c.created_at),
    createdAt: new Date(c.created_at || Date.now()),
    description: c.description,
    status: c.status || 'draft',
    submissionCount: c.submission_count || 0,
  }));
};

/**
 * Get questionnaires for a client
 */
export const getClientQuestionnaires = async (
  clientId: string,
  coachId: string
): Promise<ClientQuestionnaire[]> => {
  const response = await apiFetch<{ success: boolean; data: { questionnaires: any[] } }>(
    '/client/forms/questionnaires',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return response.data.questionnaires.map((q: any) => ({
    id: q.id || q.assignment_id,
    name: q.name || 'Unknown Questionnaire',
    questionCount: q.questions?.length || 0,
    status: q.status || 'pending',
    sentAt: new Date(q.assigned_at || q.created_at || Date.now()),
    completedAt: q.completed_at ? new Date(q.completed_at) : undefined,
    description: q.description,
  }));
};

/**
 * Get a single questionnaire for a client
 */
export const getClientQuestionnaire = async (
  clientId: string,
  questionnaireId: string,
  coachId: string
): Promise<ClientQuestionnaireDetail> => {
  const response = await apiFetch<{ success: boolean; data: ClientQuestionnaireDetail }>(
    `/client/forms/questionnaires/${questionnaireId}`,
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return {
    ...response.data,
    sentAt: new Date(response.data.sentAt),
    completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
  };
};

/**
 * Assign check-ins to a client
 */
export const assignClientCheckIn = async (data: AssignClientCheckInData): Promise<void> => {
  await apiFetch('/client/forms/check-ins', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      checkInIds: data.checkInIds,
      schedule_config: data.schedule_config,
      cron_expression: data.cron_expression,
    }),
  });
};

/**
 * Assign questionnaires to a client
 */
export const assignClientQuestionnaire = async (
  data: AssignClientQuestionnaireData
): Promise<void> => {
  await apiFetch('/client/forms/questionnaires', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      questionnaireIds: data.questionnaireIds,
    }),
  });
};

/**
 * Delete check-ins from a client
 */
export const deleteClientCheckIns = async (data: DeleteClientCheckInsData & { coachId: string }): Promise<void> => {
  await apiFetch('/client/forms/check-ins', {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ checkInIds: data.checkInIds }),
  });
};

/**
 * Update client check-in status (pause/resume)
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
 * Delete questionnaires from a client
 */
export const deleteClientQuestionnaires = async (
  data: DeleteClientQuestionnairesData & { coachId: string }
): Promise<void> => {
  await apiFetch('/client/forms/questionnaires', {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ questionnaireIds: data.questionnaireIds }),
  });
};

/**
 * Send a questionnaire to a client (changes status from draft to pending)
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
 * Create a private check-in directly for a client (not from coach library)
 */
export type AddClientCheckInData = {
  name: string;
  description?: string;
  schedule_config?: any;
  cron_expression?: string;
  clientId: string;
  coachId: string;
};

export const addClientCheckIn = async (data: AddClientCheckInData): Promise<void> => {
  await apiFetch('/client/forms/check-ins', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      schedule_config: data.schedule_config,
      cron_expression: data.cron_expression,
      // No checkInIds means create new private check-in
    }),
  });
};

/**
 * Create a private questionnaire directly for a client (not from coach library)
 */
export type AddClientQuestionnaireData = {
  name: string;
  description?: string;
  clientId: string;
  coachId: string;
};

export const addClientQuestionnaire = async (data: AddClientQuestionnaireData): Promise<void> => {
  await apiFetch('/client/forms/questionnaires', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      // No questionnaireIds means create new private questionnaire
    }),
  });
};

/**
 * Assign forms to multiple clients
 */
export const assignFormsToClients = async (data: AssignFormsToClientsData): Promise<void> => {
  if (data.formType === 'check-in') {
    await apiFetch('/client/forms/check-ins', {
      method: 'POST',
      headers: { 'x-coach-id': data.coachId },
      body: JSON.stringify({
        checkInIds: data.formIds,
        clientIds: data.clientIds,
        schedule_config: data.scheduleData,
        cron_expression: data.cronExpression,
      }),
    });
  } else {
    await apiFetch('/client/forms/questionnaires', {
      method: 'POST',
      headers: { 'x-coach-id': data.coachId },
      body: JSON.stringify({
        questionnaireIds: data.formIds,
        clientIds: data.clientIds,
      }),
    });
  }
};

/**
 * Converts schedule data to cron expression
 */
export const convertScheduleToCron = (scheduleData: AssignFormScheduleData): string => {
  const defaultHour = 9;
  const defaultMinute = 0;

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
      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60000);
      return `${nextMinute.getMinutes()} ${nextMinute.getHours()} ${nextMinute.getDate()} ${nextMinute.getMonth() + 1} ${nextMinute.getDay()}`;
    } else if (scheduleData.scheduledDate) {
      const date = scheduleData.scheduledDate;
      return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} ${date.getDay()}`;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${defaultMinute} ${defaultHour} ${tomorrow.getDate()} ${tomorrow.getMonth() + 1} ${tomorrow.getDay()}`;
  }

  if (scheduleData.frequency === 'daily') {
    if (scheduleData.selectedDays && scheduleData.selectedDays.length > 0) {
      const weekdays = scheduleData.selectedDays
        .map((day) => dayMap[day] ?? 0)
        .sort((a, b) => a - b)
        .join(',');
      return `${defaultMinute} ${defaultHour} * * ${weekdays}`;
    }
    return `${defaultMinute} ${defaultHour} * * *`;
  } else if (scheduleData.frequency === 'weekly') {
    const weekday =
      scheduleData.selectedDays && scheduleData.selectedDays.length > 0
        ? dayMap[scheduleData.selectedDays[0]] ?? 0
        : 0;
    return `${defaultMinute} ${defaultHour} * * ${weekday}`;
  } else if (scheduleData.frequency === 'biweekly') {
    const weekday =
      scheduleData.selectedDays && scheduleData.selectedDays.length > 0
        ? dayMap[scheduleData.selectedDays[0]] ?? 0
        : 0;
    return `${defaultMinute} ${defaultHour} * * ${weekday}`;
  } else if (scheduleData.frequency === 'monthly') {
    if (scheduleData.monthlyOption === 'first') {
      return `${defaultMinute} ${defaultHour} 1 * *`;
    } else if (scheduleData.monthlyOption === 'last') {
      return `${defaultMinute} ${defaultHour} 28-31 * *`;
    } else if (scheduleData.monthlyOption === 'specific' && scheduleData.specificDay) {
      return `${defaultMinute} ${defaultHour} ${scheduleData.specificDay} * *`;
    }
    return `${defaultMinute} ${defaultHour} 1 * *`;
  }

  return `${defaultMinute} ${defaultHour} * * *`;
};
