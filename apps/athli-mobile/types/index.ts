/**
 * Centralized type exports
 * Import types from here throughout the app
 */

// Chat types
export type {
  Chat,
  ChatMessage,
  DocumentAttachment,
  ImageAttachment,
  VideoAttachment,
  AudioAttachment,
} from './chat';

// Client types
export type { Client, AddClientData, UpdateClientData } from './client';

// Calendar types
export type {
  RepeatData,
  ScheduleSessionData,
  Weekday,
  CanonicalRepeatData,
  ScheduleSessionRequest,
  GoogleEventInsert,
  GraphEventCreate,
  CalendarProvider,
} from './calendar';

// Inbox types
export type { Coach, InboxMessage } from './inbox';

// Library types
export type {
  CreateWorkoutData,
  CreateProgramData,
  File,
  AddFileData,
  PersonalDetailsFieldType,
} from './library';

// Navigation types
export type { RootStackParamList, TabParamList, RouteParams, TabRoute } from './navigation';
