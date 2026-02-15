/**
 * Habit Types
 *
 * Shared types for habits used across web and mobile apps.
 */

// =============================================================================
// Core Habit Types
// =============================================================================

export type HabitPeriodType = 'daily' | 'weekly';
export type HabitLogStatus = 'completed' | 'skipped' | 'partial';
export type HabitScheduleType = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: HabitPeriodType;
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
  createdAt: number;
  clientId?: string;
  folderId?: string | null;
}

export interface HabitLog {
  id: string;
  status: HabitLogStatus;
  value?: number;
  date: string;
  created_at: string;
}

export interface HabitStreaks {
  longest_streak: number;
  current_streak: number;
}

export interface ClientHabit {
  id: string;
  assignment_id: string;
  name: string;
  description?: string;
  amount?: number;
  unit?: string;
  period: HabitPeriodType;
  custom_schedule?: unknown;
  schedule_config?: {
    amount?: number;
    unit?: string;
    duration?: number;
    reminder_message?: string;
  };
  schedule_type?: HabitScheduleType;
  times_of_day?: string[];
  days_of_week?: number[] | null;
  timezone?: string;
  start_date?: string | null;
  end_date?: string | null;
  logs?: HabitLog[];
}

export interface DBHabit {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  schedule_type: HabitScheduleType;
  days_of_week: number[] | null;
  times_of_day: string[] | null;
  timezone: string;
  start_date: string | null;
  end_date: string | null;
  schedule_config: {
    amount?: number;
    unit?: string;
    duration?: number;
    reminder_message?: string;
    [key: string]: unknown;
  };
  // Dedicated reminder columns
  reminder_enabled: boolean | null;
  reminder_time: string | null;
  reminder_message: string | null;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  folder_id: string | null;
}

// =============================================================================
// Folder Types
// =============================================================================

export interface HabitFolder {
  id: string;
  coach_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHabitFolderInput {
  name: string;
}

export interface UpdateHabitFolderInput {
  name?: string;
}

export interface MoveHabitInput {
  habitId: string;
  folderId: string | null;
}

// =============================================================================
// Operation Types - Create/Update
// =============================================================================

export interface AddHabitData {
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: HabitPeriodType;
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
  clientId?: string;
}

export interface EditHabitData extends AddHabitData {
  id: string;
}

export interface DeleteHabitData {
  id: string;
}

export interface AssignHabitData {
  habitIds?: string[];
  clientId: string;
  coachId: string;
  name?: string;
  amount?: number;
  unit?: string;
  period?: HabitPeriodType;
  description?: string;
  custom_schedule?: unknown;
}

export interface AssignHabitsToClientsData {
  habitIds: string[];
  clientIds: string[];
  coachId: string;
}

export interface DeleteClientHabitsData {
  habitIds: string[];
  clientId: string;
  coachId: string;
}

export interface LogHabitData {
  assignmentId: string;
  status: HabitLogStatus;
  value?: number;
  date: Date;
  clientId: string;
  coachId: string;
}

export interface UpdateHabitData {
  assignmentId: string;
  name?: string;
  description?: string;
  period?: HabitPeriodType;
  custom_schedule?: unknown;
  clientId: string;
  coachId: string;
}

export interface UpdateHabitLogData {
  logId: string;
  status?: HabitLogStatus;
  value?: number;
  date?: Date;
  clientId: string;
  coachId: string;
}

// =============================================================================
// Default Habit Templates
// =============================================================================

export interface DefaultHabit {
  name: string;
  amount: number;
  unit: string;
  period: HabitPeriodType;
  description?: string;
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
}

export interface HabitSection {
  label: string;
  habits: DefaultHabit[];
}
