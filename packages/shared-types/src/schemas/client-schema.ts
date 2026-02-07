/**
 * Client/Athlete Types
 *
 * Shared types for clients and athletes used across web and mobile apps.
 */

// =============================================================================
// Core Client Types
// =============================================================================

export type CoachingType = 'online' | 'in-person' | 'hybrid';
export type ClientStatus = 'invited' | 'accepted' | 'bounced' | 'connected' | 'archived';

export interface Athlete {
  id: string;
  publicId?: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  coachingType: CoachingType;
  category: CoachingType | string | null;
  status: ClientStatus;
  avatarUrl: string;
  createdAt: number;
  phone: string;
  country: string;
  birthDate: string | null;
  age: number | null;
  height: string | null;
  lastActivity: string;
  last7DaysTraining: string;
  last30DaysTraining: string;
  clientFor: string;
  invitationToken?: string;
}

export interface AthleteDetails {
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  birthDate?: string | null;
  category?: CoachingType;
  gender?: 'male' | 'female' | 'prefer-not-to-say' | null;
  phone?: string;
  country?: string;
  height?: string | null;
  avatarUrl?: string | null;
  avatarFile?: File | null;
  timezone?: string | null;
  status?: ClientStatus;
  createdAt?: number;
  clientFor?: string;
}

export interface AthleteGoal {
  id: string;
  goal: string;
  target_date: string | null;
  achieved: boolean;
  details?: string;
}

export interface AthleteInjury {
  id: string;
  injury: string;
  date: string | null;
  details?: string;
}

// =============================================================================
// Client Notes
// =============================================================================

export interface ClientNote {
  id: string;
  note?: string;
  title?: string;
  body?: string;
  created_at?: Date;
  updated_at?: Date;
  createdAt?: number;
  updatedAt?: number | null;
  isPinned?: boolean;
}

export interface CreateNoteData {
  clientId: string;
  coachId: string;
  note?: string;
  title?: string;
  body?: string;
}

export interface EditNoteData {
  noteId: string;
  clientId?: string;
  coachId?: string;
  note?: string;
  title?: string;
  body?: string;
}

export interface DeleteNoteData {
  noteId: string;
  clientId?: string;
  coachId?: string;
}

// =============================================================================
// Profile Types
// =============================================================================

export interface CoachProfile {
  id: string;
  email: string;
  name: string;
  profile_picture_url: string | null;
  signin_method?: 'email' | 'google' | 'apple';
  timezone?: string | null;
  is_active: boolean;
  is_archived: boolean;
  status: 'active' | 'inactive' | 'pending';
  unique_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientProfile {
  client_id: string;
  coach_id: string;
  email: string;
  name: string;
  profile_picture_url: string | null;
  signin_method?: 'email' | 'google' | 'apple';
  timezone?: string | null;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  phone: string | null;
  country: string | null;
  unit_system: 'metric' | 'imperial' | null;
  created_at: string;
  updated_at: string;
}

export type ProfileType = 'coach' | 'client' | null;

export interface CoachAssignment {
  coach_id: string;
  name: string;
  profile_picture_url: string | null;
}

export interface AuthResult {
  userId: string;
  profileType: ProfileType;
  profile: CoachProfile | ClientProfile | null;
  coachAssignments?: CoachAssignment[];
}

// =============================================================================
// Client Training Completion Status Types
// =============================================================================

export type ClientWorkoutStatusValue = 'not_started' | 'in_progress' | 'completed';
export type ClientSetStatusValue = 'not_started' | 'completed';
export type ClientSectionStatusValue = 'not_started' | 'in_progress' | 'completed';

export interface ClientWorkoutCompletionLog {
  workoutId: string;
  status: ClientWorkoutStatusValue;
  completedAt?: number;
  startedAt?: number;
}

export interface ClientSetCompletionLog {
  workoutId: string;
  exerciseInstanceId: string;
  setNumber: number;
  status: ClientSetStatusValue;
  completedAt?: number;
}

export interface ClientSectionCompletionLog {
  workoutId: string;
  sectionId: string;
  status: ClientSectionStatusValue;
  completedAt?: number;
  startedAt?: number;
}

export interface TrainingCalendarCompletionLogs {
  workouts: ClientWorkoutCompletionLog[];
  sets: ClientSetCompletionLog[];
  sections: ClientSectionCompletionLog[];
}

// =============================================================================
// Client Add/Update Operations
// =============================================================================

export interface AddClientData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  coachingType: CoachingType;
}

export interface UpdateClientData {
  firstName?: string;
  lastName?: string;
  email?: string;
  coachingType?: CoachingType;
  avatarUrl?: string;
  avatarUri?: string;
  timezone?: string | null;
}
