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
 * Mirrors apps/web/api/client/client-form-service.ts
 */

// Extended QuestionAnswer with format field from API response
export type QuestionAnswerWithFormat = QuestionAnswer & { format?: string };

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
    sentAt: response.data.sentAt ? new Date(response.data.sentAt) : undefined,
    completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
  };
};

/**
 * Get a single check-in for a client with full details including questions
 */
export type ClientCheckInDetail = {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  schedule?: string;
  status?: string;
};

export const getClientCheckInDetail = async (
  clientId: string,
  checkInId: string,
  coachId: string
): Promise<ClientCheckInDetail> => {
  const response = await apiFetch<{ success: boolean; data: any }>(
    `/client/forms/check-ins/${checkInId}`,
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return {
    id: response.data.id,
    name: response.data.name,
    description: response.data.description,
    questions: response.data.questions || [],
    schedule: response.data.schedule_config?.frequency || response.data.schedule,
    status: response.data.status,
  };
};

/**
 * Get a single questionnaire for a client with full details including questions
 */
export type ClientQuestionnaireFullDetail = {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  status?: string;
};

export const getClientQuestionnaireDetail = async (
  clientId: string,
  questionnaireId: string,
  coachId: string
): Promise<ClientQuestionnaireFullDetail> => {
  const response = await apiFetch<{ success: boolean; data: any }>(
    `/client/forms/questionnaires/${questionnaireId}`,
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return {
    id: response.data.id,
    name: response.data.name,
    description: response.data.description,
    questions: response.data.questions || [],
    status: response.data.status,
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

/**
 * Edit a client's check-in details
 */
export type EditClientCheckInData = {
  checkInId: string;
  clientId: string;
  coachId: string;
  name: string;
  description?: string;
};

export const editClientCheckIn = async (data: EditClientCheckInData): Promise<void> => {
  await apiFetch(`/client/forms/check-ins/${data.checkInId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });
};

/**
 * Edit a client's questionnaire details
 */
export type EditClientQuestionnaireData = {
  questionnaireId: string;
  clientId: string;
  coachId: string;
  name: string;
  description?: string;
};

export const editClientQuestionnaire = async (data: EditClientQuestionnaireData): Promise<void> => {
  await apiFetch(`/client/forms/questionnaires/${data.questionnaireId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });
};

/**
 * Save questions for a client's check-in
 */
export type SaveClientCheckInQuestionsData = {
  checkInId: string;
  clientId: string;
  coachId: string;
  questions: Question[];
};

export const saveClientCheckInQuestions = async (data: SaveClientCheckInQuestionsData): Promise<void> => {
  await apiFetch(`/client/forms/check-ins/${data.checkInId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      questions: data.questions,
    }),
  });
};

/**
 * Save questions for a client's questionnaire
 */
export type SaveClientQuestionnaireQuestionsData = {
  questionnaireId: string;
  clientId: string;
  coachId: string;
  questions: Question[];
};

export const saveClientQuestionnaireQuestions = async (data: SaveClientQuestionnaireQuestionsData): Promise<void> => {
  await apiFetch(`/client/forms/questionnaires/${data.questionnaireId}`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      questions: data.questions,
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
  const response = await apiFetch<{ success: boolean; data: { url: string } }>(
    `/client/forms/questionnaires/media-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
  );
  return response.data.url;
};

// ============================================
// Athlete Self-Access Endpoints
// ============================================

/**
 * Athlete questionnaire type for self-access
 */
export type AthleteQuestionnaire = {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  status: 'pending' | 'completed' | 'draft';
  sent_at: string;
  completed_at: string | null;
  answers?: QuestionAnswer[];
};

/**
 * Get questionnaires for the authenticated athlete (self-access)
 */
export const getMyQuestionnaires = async (clientId: string, coachId: string): Promise<AthleteQuestionnaire[]> => {
  const response = await apiFetch<{ success: boolean; data: { questionnaires: any[] } }>(
    '/client/forms/questionnaires',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return (response.data.questionnaires || []).map((q: any) => ({
    id: q.id,
    name: q.name || 'Untitled Questionnaire',
    description: q.description,
    questions: q.questions || [],
    status: q.status || 'pending',
    sent_at: q.sent_at || q.created_at,
    completed_at: q.completed_at,
    answers: q.answers || [],
  }));
};

/**
 * Submit questionnaire answers (athlete self-access)
 * Handles file uploads for images, videos, signatures, and progress photos
 */
export type SubmitQuestionnaireData = {
  questionnaireId: string;
  answers: QuestionAnswerWithFormat[];
};

/**
 * Helper to check if a string is a local file URI
 */
const isLocalFileUri = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return value.startsWith('file://') || value.startsWith('ph://') || value.startsWith('/');
};

/**
 * Helper to check if a string is a base64 data URI
 */
const isBase64DataUri = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return value.startsWith('data:');
};

/**
 * Helper to convert a local file URI to base64 data URI
 */
const convertToBase64 = async (uri: string, mimeType: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const submitMyQuestionnaire = async (data: SubmitQuestionnaireData, clientId: string, coachId: string): Promise<void> => {
  // Check if we have any video files that need FormData (too large for base64)
  // Must check ALL answers, not use some() which stops early
  const hasVideoFiles = data.answers.some((answer) => {
    if (!answer.answer) return false;
    if (answer.format === 'videos' && Array.isArray(answer.answer)) {
      return answer.answer.some(isLocalFileUri);
    }
    return false;
  });

  // Process answers - convert images and progress photos to base64
  // Use any[] since we modify answer shapes during processing
  const processedAnswers: any[] = [...data.answers];

  for (let i = 0; i < processedAnswers.length; i++) {
    const answer = processedAnswers[i];
    if (!answer.answer) continue;

    // Handle images - convert to base64
    if (answer.format === 'images' && Array.isArray(answer.answer)) {
      const base64Array: string[] = [];
      for (const uri of answer.answer) {
        if (isLocalFileUri(uri)) {
          try {
            const base64 = await convertToBase64(uri, 'image/jpeg');
            base64Array.push(base64);
          } catch (error) {
            console.error('Failed to convert image to base64:', error);
            // Skip failed conversions
          }
        } else {
          base64Array.push(uri); // Keep existing URLs
        }
      }
      processedAnswers[i] = { ...answer, answer: base64Array };
    }

    // Handle progress photos - convert to base64
    if (answer.format === 'progressPhoto' && typeof answer.answer === 'object' && answer.answer) {
      const progressAnswer = answer.answer as { front?: string; back?: string; side?: string };
      const newProgressAnswer: { front?: string; back?: string; side?: string } = {};

      for (const angle of ['front', 'back', 'side'] as const) {
        const uri = progressAnswer[angle];
        if (uri && isLocalFileUri(uri)) {
          try {
            const base64 = await convertToBase64(uri, 'image/jpeg');
            newProgressAnswer[angle] = base64;
          } catch (error) {
            console.error(`Failed to convert ${angle} photo to base64:`, error);
            // Skip failed conversions
          }
        } else if (uri) {
          newProgressAnswer[angle] = uri; // Keep existing URLs
        }
      }
      processedAnswers[i] = { ...answer, answer: newProgressAnswer };
    }
  }

  // If no video files, use simple JSON submission (images/progressPhotos are now base64)
  if (!hasVideoFiles) {
    await apiFetch(`/client/forms/questionnaires/${data.questionnaireId}/submit`, {
      method: 'POST',
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
      body: JSON.stringify({
        answers: processedAnswers,
      }),
    });
    return;
  }

  // Has video files, use FormData for videos only
  const formData = new FormData();

  for (let i = 0; i < processedAnswers.length; i++) {
    const answer = processedAnswers[i];
    if (!answer.answer) continue;

    const questionId = answer.questionId;

    // Handle videos - keep as FormData files (too large for base64)
    if (answer.format === 'videos' && Array.isArray(answer.answer)) {
      const newAnswerArray: string[] = [];
      for (let j = 0; j < answer.answer.length; j++) {
        const uri = answer.answer[j];
        if (isLocalFileUri(uri)) {
          const fieldName = `${questionId}_videos_${j}`;
          const filename = uri.split('/').pop() || `video_${j}.mp4`;
          formData.append(fieldName, {
            uri,
            type: 'video/mp4',
            name: filename,
          } as any);
          newAnswerArray.push('__FILE_UPLOAD__');
        } else {
          newAnswerArray.push(uri);
        }
      }
      processedAnswers[i] = { ...answer, answer: newAnswerArray };
    }
  }

  // Add answers JSON to FormData
  formData.append('answers', JSON.stringify(processedAnswers));

  // Submit with FormData
  await apiFetch(`/client/forms/questionnaires/${data.questionnaireId}/submit`, {
    method: 'POST',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    body: formData,
    // Don't set Content-Type header - let fetch set it with boundary for multipart
  });
};
