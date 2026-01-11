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

// Mock inbox messages data - CLEARED FOR TESTING
const mockInboxMessages: InboxMessage[] = [];

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






