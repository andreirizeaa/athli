/**
 * Form, Check-in, and Questionnaire Types
 *
 * Shared types for forms, check-ins, and questionnaires used across
 * web and mobile apps.
 */

// =============================================================================
// Core Question Types
// =============================================================================

export type QuestionFormat =
  | 'multipleChoice'
  | 'number'
  | 'scale'
  | 'yesNo'
  | 'text'
  | 'rating'
  | 'images'
  | 'videos'
  | 'date';

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
  metricName?: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string | string[] | number | Date | null;
}

// =============================================================================
// Check-in Types
// =============================================================================

export interface CheckIn {
  id: string;
  name: string;
  description?: string;
  cron_expression?: string;
  schedule_config?: {
    type: 'check-in' | 'questionnaire';
    frequency?: ScheduleFrequency;
    selectedDays?: string[];
    monthlyOption?: MonthlyOption;
    specificDay?: number;
  };
  questions: Question[];
  questionCount?: number;
  created_at: string;
  updated_at: string;
}

export interface ClientCheckIn {
  id: string;
  name: string;
  questionCount: number;
  schedule: string;
  nextScheduledAt: Date;
  createdAt: Date;
  description?: string;
  status: 'draft' | 'live' | 'paused';
  submissionCount: number;
}

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

export interface CheckInReview {
  checkin_log_id: string;
  client_id: string;
  coach_checkin_id: string;
  client_name: string;
  client_avatar?: string;
  client_email: string;
  checkin_name: string;
  checkin_description?: string;
  submission_date: string;
  created_at: string;
  status: string;
  updated_at: string;
  coach_id: string;
}

// =============================================================================
// Questionnaire Types
// =============================================================================

export interface Questionnaire {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  questionCount?: number;
  created_at: string;
  updated_at: string;
}

export interface ClientQuestionnaire {
  id: string;
  name: string;
  questionCount: number;
  status: 'draft' | 'pending' | 'completed';
  sentAt?: Date;
  completedAt?: Date;
  description?: string;
}

export interface ClientQuestionnaireDetail {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'pending' | 'completed';
  sentAt?: Date;
  completedAt?: Date;
  questions: Question[];
  answers: QuestionAnswer[];
}

// =============================================================================
// Schedule Types
// =============================================================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type MonthlyOption = 'first' | 'last' | 'specific';

export interface AssignFormScheduleData {
  type: 'check-in' | 'one-time';
  frequency?: ScheduleFrequency;
  selectedDays?: string[];
  monthlyOption?: MonthlyOption;
  specificDay?: number;
  sendNow?: boolean;
  scheduledDate?: Date;
}

// =============================================================================
// Form Template Types
// =============================================================================

export interface FormTemplateQuestion {
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
}

export interface FormTemplateSchedule {
  type: 'check-in' | 'questionnaire';
  frequency?: ScheduleFrequency;
  selectedDays?: string[];
  monthlyOption?: MonthlyOption;
  specificDay?: number;
}

export interface FormTemplate {
  name: string;
  description?: string;
  questions: FormTemplateQuestion[];
  schedule?: FormTemplateSchedule;
}

// =============================================================================
// Coach Review Types
// =============================================================================

export interface AddCoachReviewData {
  clientId: string;
  coachId: string;
  checkInId: string;
  instanceId: string;
  review: string;
}

export interface UpdateCoachReviewData {
  clientId: string;
  coachId: string;
  checkInId: string;
  instanceId: string;
  review: string;
}

export interface CoachReview {
  review: string;
  createdAt: Date;
}

// =============================================================================
// Operation Types - Check-ins
// =============================================================================

export interface AddCheckInData {
  name: string;
  description?: string;
  cron_expression?: string;
}

export interface EditCheckInDetailsData {
  id: string;
  name: string;
  description?: string;
  cron_expression?: string;
  schedule_config?: AssignFormScheduleData | Record<string, unknown>;
}

// =============================================================================
// Operation Types - Questionnaires
// =============================================================================

export interface AddQuestionnaireData {
  name: string;
  description?: string;
}

export interface EditQuestionnaireDetailsData {
  id: string;
  name: string;
  description?: string;
}

// =============================================================================
// Operation Types - Questions
// =============================================================================

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
  questionIds?: string[];
}

export interface DeleteQuestionData {
  formId: string;
  questionId: string;
}

// =============================================================================
// Operation Types - Client Assignments
// =============================================================================

export interface AssignClientCheckInData {
  checkInIds: string[];
  clientId: string;
  coachId: string;
  schedule_config?: AssignFormScheduleData | Record<string, unknown>;
  cron_expression?: string;
  status?: 'draft' | 'live';
}

export interface AssignClientQuestionnaireData {
  questionnaireIds: string[];
  clientId: string;
  coachId: string;
  schedule_config?: AssignFormScheduleData | Record<string, unknown>;
  cron_expression?: string;
  status?: 'draft' | 'pending';
}

export interface DeleteClientCheckInsData {
  checkInIds: string[];
  clientId: string;
  coachId?: string;
}

export interface DeleteClientQuestionnairesData {
  questionnaireIds: string[];
  clientId: string;
  coachId?: string;
}

export interface AssignFormData {
  formId: string;
  clientId: string;
  coachId: string;
  formType: 'check-in' | 'questionnaire';
  cronExpression: string;
  scheduleData: AssignFormScheduleData;
  status?: 'draft' | 'live' | 'pending';
}

export interface AssignFormsToClientsData {
  formIds: string[];
  clientIds: string[];
  coachId: string;
  formType: 'check-in' | 'questionnaire';
  cronExpression: string;
  scheduleData: AssignFormScheduleData;
}
