import { type ChatMessage, type DocumentAttachment, type ImageAttachment, type VideoAttachment, type AudioAttachment } from './chats-service';

export interface Coach {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export interface InboxMessage extends ChatMessage {
  // Same structure as ChatMessage
  // isSent: true for client messages, false for coach messages
}

/**
 * Service method to get list of available coaches
 * This will be connected to the backend in the future
 */
export const getCoaches = async (): Promise<Coach[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock coaches - in the future, this will come from the backend
  return mockCoaches;

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/coaches', {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get coaches')
  // return await response.json()
};

/**
 * Service method to get coach information by ID
 * This will be connected to the backend in the future
 */
export const getCoach = async (coachId?: string): Promise<Coach> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // If coachId provided, find specific coach, otherwise return default
  if (coachId) {
    const coaches = await getCoaches();
    const coach = coaches.find((c) => c.id === coachId);
    if (coach) return coach;
  }

  // Return default coach data - in the future, this will come from the backend
  return {
    id: 'coach-1',
    name: 'Coach Sarah',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/coaches/${coachId}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get coach')
  // return await response.json()
};

/**
 * Service method to get messages for the inbox (client's conversation with coach)
 * This will be connected to the backend in the future
 */
export const getInboxMessages = async (coachId?: string): Promise<InboxMessage[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock messages for the inbox
  // Note: isSent: true means message from client, isSent: false means message from coach
  // If coachId is provided, filter messages for that coach (for now, all messages are for coach-1)
  return mockInboxMessages;

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/inbox/messages${coachId ? `?coachId=${coachId}` : ''}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get inbox messages')
  // const data = await response.json()
  // return data.messages.map((msg: any) => ({
  //   ...msg,
  //   timestamp: new Date(msg.timestamp),
  // }))
};

/**
 * Service method to send a message to the coach
 * This will be connected to the backend in the future
 */
export const sendInboxMessage = async (
  text: string,
  options?: {
    replyTo?: InboxMessage;
    document?: DocumentAttachment;
    images?: ImageAttachment[];
    video?: VideoAttachment;
    audio?: AudioAttachment;
  }
): Promise<InboxMessage> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/inbox/messages', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ text, ...options }),
  // })
  // if (!response.ok) throw new Error('Failed to send message')
  // const data = await response.json()
  // return {
  //   ...data,
  //   timestamp: new Date(data.timestamp),
  // }

  console.log('Sending inbox message:', { text, ...options });

  // Return a mock message
  const newMessage: InboxMessage = {
    id: `inbox-${Date.now()}`,
    text: text,
    timestamp: new Date(),
    isSent: true, // Client sent this message
    isRead: false,
    ...(options?.replyTo && { replyTo: options.replyTo }),
    ...(options?.document && { document: options.document }),
    ...(options?.images && { images: options.images }),
    ...(options?.video && { video: options.video }),
    ...(options?.audio && { audio: options.audio }),
  };

  return newMessage;
};

/**
 * Service method to archive a coach conversation
 * This will be connected to the backend in the future
 */
export const archiveCoach = async (coachId: string): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/inbox/${coachId}/archive`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to archive coach')
  // return await response.json()

  console.log('Archiving coach:', coachId);
};

/**
 * Service method to mark all inbox conversations as read
 * This will be connected to the backend in the future
 */
export const readAllInbox = async (): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/inbox/read-all', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to read all inbox')
  // return await response.json()

  console.log('Reading all inbox');
};

/**
 * Service method to mark a coach conversation as read
 * This will be connected to the backend in the future
 */
export const markCoachAsRead = async (coachId: string): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/inbox/${coachId}/read`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to mark coach as read')
  // return await response.json()

  console.log('Marking coach as read:', coachId);
};

// Mock inbox messages data
const mockInboxMessages: InboxMessage[] = [
  // Messages from 5 days ago
  {
    id: 'inbox-0-1',
    text: 'Hi Coach! I wanted to check in about my progress.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
    isSent: true, // Client message
    isRead: true,
  },
  {
    id: 'inbox-0-2',
    text: 'Hi! Great to hear from you. How are you feeling?',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000 - 45 * 60 * 1000),
    isSent: false, // Coach message
    isRead: true,
  },
  // Messages from 4 days ago
  {
    id: 'inbox-0-3',
    text: 'I feel really good! The new exercises are working great.',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-0-4',
    text: 'That\'s fantastic! Keep up the great work.',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000 - 30 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  // Messages from 3 days ago
  {
    id: 'inbox-0-5',
    text: 'I\'ve been really consistent with the program',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-0-6',
    text: 'Consistency is the most important thing. You\'re doing amazing!',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000 - 15 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  // Messages from 2 days ago
  {
    id: 'inbox-0-7',
    text: 'I can already feel the difference',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-0-8',
    text: 'That\'s exactly what we want to see! Keep up the momentum!',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000 - 30 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  // Messages from yesterday
  {
    id: 'inbox-0-9',
    text: 'I make sure to rest on the days in between',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-0-10',
    text: 'That\'s perfect! Active recovery is important.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000 - 45 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  // Today's messages
  {
    id: 'inbox-1',
    text: 'Hi Coach! I wanted to check in about my progress.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 30 * 60 * 1000), // 3.5 hours ago
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-2',
    text: 'Great to hear from you! How are you feeling?',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 25 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-3',
    text: 'I feel really good!',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 20 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-4',
    text: 'The new exercises are working great',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 18 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-5',
    text: 'I can already see some improvement',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 15 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-6',
    text: 'That\'s fantastic! Keep up the great work.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 10 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-7',
    text: 'I\'ve been following the plan exactly as you suggested',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 45 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-8',
    text: 'Perfect! Consistency is key.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 40 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-9',
    text: 'How many times per week are you training?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 38 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-10',
    text: 'I\'m doing 4 sessions per week',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 35 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-11',
    text: 'Monday, Wednesday, Friday, and Saturday',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 33 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-12',
    text: 'That\'s an excellent schedule!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 30 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-13',
    text: 'You\'re giving yourself good recovery time between sessions',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 28 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-14',
    text: 'Yes, I make sure to rest on the days in between',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 25 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-15',
    text: 'I also do some light stretching',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 23 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-16',
    text: 'That\'s perfect! Active recovery is important.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 - 50 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-17',
    text: 'Keep up the great work and let me know if you have any questions',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 - 48 * 60 * 1000),
    isSent: false,
    isRead: true,
  },
  {
    id: 'inbox-18',
    text: 'Will do! Thanks for all your help',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 - 45 * 60 * 1000),
    isSent: true,
    isRead: true,
  },
  {
    id: 'inbox-19',
    text: 'Thanks for the workout plan!',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    isSent: true,
    isRead: false,
  },
  {
    id: 'inbox-20',
    text: 'You\'re welcome! Let me know how it goes.',
    timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
    isSent: false,
    isRead: false,
    replyTo: {
      id: 'inbox-19',
      text: 'Thanks for the workout plan!',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      isSent: true,
      isRead: false,
    },
  },
  {
    id: 'inbox-21',
    text: 'I have a question about the third exercise',
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    isSent: true,
    isRead: false,
    replyTo: {
      id: 'inbox-20',
      text: 'You\'re welcome! Let me know how it goes.',
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      isSent: false,
      isRead: false,
    },
  },
];

// Mock coaches data
const mockCoaches: Coach[] = [
  {
    id: 'coach-1',
    name: 'Coach Sarah',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'You\'re welcome! Let me know how it goes.',
    lastMessageTime: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
    unreadCount: 0,
  },
  {
    id: 'coach-2',
    name: 'Coach Mike',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Great progress this week!',
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    unreadCount: 1,
  },
  {
    id: 'coach-3',
    name: 'Coach Emma',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'See you at the gym tomorrow',
    lastMessageTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    unreadCount: 0,
  },
];

