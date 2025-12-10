export type Contact = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isOnline?: boolean;
};

export type Message = {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  replyTo?: {
    id: string;
    text: string;
    isSent: boolean;
    pdf?: {
      name: string;
      data: string; // base64 encoded
      type: string;
      size: number;
    };
    images?: Array<{
      name: string;
      data: string; // base64 encoded
      type: string;
      size: number;
    }>;
    video?: {
      name: string;
      data: string; // base64 encoded
      type: string;
      size: number;
    };
  };
  pdf?: {
    name: string;
    data: string; // base64 encoded
    type: string;
    size: number;
  };
  images?: Array<{
    name: string;
    data: string; // base64 encoded
    type: string;
    size: number;
  }>;
  video?: {
    name: string;
    data: string; // base64 encoded
    type: string;
    size: number;
  };
};

export type Athlete = {
  id: string;
  name: string;
  avatar?: string;
  lastActivity: string;
  last7DaysTraining: string;
  last30DaysTraining: string;
  category: 'online' | 'in-person';
  connected: boolean | 'invitation-sent';
  email: string;
  phone: string;
  country: string;
  age: number;
  clientFor: number; // in days
};

export type Workout = {
  id: string;
  program: string;
  description: string;
  type: string;
  length: string;
  totalExercises: number;
  equipment: string;
  created: string; // dd-mm-yy format
};

export type Program = {
  id: string;
  program: string;
  description: string;
  type: string;
  length: string;
  totalExercises: number;
  equipment: string;
  created: string; // dd-mm-yy format
};

export type Exercise = {
  id: string;
  program: string; // Exercise name
  description: string; // Exercise instructions
  category: string;
  muscleGroup: string[]; // Array of muscle groups
  equipment: string;
  modality: string;
  created: string; // dd-mm-yy format
  videoLink?: string;
};

