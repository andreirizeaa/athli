export type Contact = {
  id: string;
  publicId?: string;
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
  publicId?: string;
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
  name: string;
  description: string;
  type: string;
  difficulty: string;
  totalExercises: number;
  equipment: string | string[];
  created: string; // dd-mm-yy format
  isFavourite: boolean;
  details?: {
    description: string;
    type: string;
    difficulty: string;
    equipment: string[];
    totalExercises: number;
  };
  items?: any[];
  pre?: any;
  post?: any;
  completedSummary?: any;
};

export type Program = {
  id: string;
  program: string;
  description: string;
  type: string;
  difficulty: string;
  length: string;
  totalWorkouts: number;
  totalExercises: number;
  equipment: string;
  created: string; // dd-mm-yy format
  isFavourite: boolean;
  program_data?: any;
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
  isFavourite: boolean;
  videoLink?: string;
};

