/**
 * Navigation types for type-safe routing with Expo Router
 * Define all route parameters here
 */

// Root Stack
export type RootStackParamList = {
  '(tabs)': undefined;
  'camera/[mode]': { mode: 'photo' | 'video' };
  'chats/[id]': { id: string; clientName?: string; clientAvatar?: string };
  'client/[id]': { id: string };
  'client/[id]/activity': { id: string };
  'client/[id]/assistant': { id: string };
  'client/[id]/check-ins': { id: string };
  'client/[id]/files': { id: string };
  'client/[id]/goals-injuries': { id: string };
  'client/[id]/habits': { id: string };
  'client/[id]/metrics': { id: string };
  'client/[id]/notes': { id: string };
  'client/[id]/photos': { id: string };
  'client/[id]/questionaires': { id: string };
  'client/[id]/settings': { id: string };
  'client/[id]/training': { id: string };
  'client/[id]/training-calendar': { id: string };
  'inbox/[id]': { id: string; coachName?: string; coachAvatar?: string };
  'library/workout/[id]': { id: string };
  'personal-details': undefined;
  'settings/language': undefined;
  'settings/palette': undefined;
  'settings/units': undefined;

  // Modal routes
  'modals/calendar/repeat-options-modal': {
    initialData?: {
      type: 'weekly' | 'monthly';
      every?: number;
      for?: number | 'ever';
      weekdays?: string[];
      monthDays?: number[];
    };
    onSave: (data: any) => void;
  };
  'modals/calendar/select-date-modal': {
    initialDate?: Date;
    onSelect: (date: Date) => void;
  };
  'modals/client/add-client-modal': {
    onSuccess?: (clientId: string) => void;
  };
  'modals/files/add-file-modal': {
    clientId?: string;
  };
  'modals/library/add-check-in-modal': undefined;
  'modals/library/add-exercise-modal': undefined;
  'modals/library/add-habit-modal': undefined;
  'modals/library/add-metric-modal': undefined;
  'modals/library/add-questionnaire-modal': undefined;
  'modals/library/add-section-modal': undefined;
  'modals/library/add-workout-modal': undefined;
  'modals/library/habit-options-modal': {
    initialData?: any;
    onSave: (data: any) => void;
  };
  'modals/personal-details/edit-personal-details-modal': {
    field: 'name' | 'age' | 'gender' | 'height' | 'weight';
    currentValue: string | number;
    onSave: (value: string | number) => void;
  };
  'modals/settings/language-modal': undefined;
  'modals/settings/palette-modal': undefined;
  'modals/settings/units-modal': undefined;
  'modals/shared/calendar-modal': {
    clientId: string;
    clientName: string;
  };
  'modals/shared/files-modal': {
    clientId: string;
  };
  'modals/workout/schedule-session-modal': {
    clientId: string;
  };
};

// Tab Stack
export type TabParamList = {
  index: undefined;
  home: undefined;
  clients: undefined;
  chats: undefined;
  inbox: undefined;
  library: undefined;
  training: undefined;
  tasks: undefined;
  progress: undefined;
  profile: undefined;
  settings: undefined;
  'add-modal': undefined;
};

// Helper types for route props
export type RouteParams<T extends keyof RootStackParamList> = RootStackParamList[T];
export type TabRoute<T extends keyof TabParamList> = TabParamList[T];
