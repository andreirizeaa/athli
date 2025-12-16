export interface DocumentAttachment {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface ImageAttachment {
  uri: string;
  id: string;
}

export interface VideoAttachment {
  uri: string;
  duration: number;
  orientation: 'portrait' | 'landscape';
}

export interface AudioAttachment {
  uri: string;
  duration: number; // duration in milliseconds
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isSent: boolean; // true for user messages, false for client messages
  isRead: boolean;
  senderReaction?: string; // emoji string if sender has reacted
  recipientReaction?: string; // emoji string if recipient has reacted
  replyTo?: ChatMessage; // The message this is replying to
  document?: DocumentAttachment; // Document attachment if this message has a document
  images?: ImageAttachment[]; // Image attachments if this message has images
  video?: VideoAttachment; // Video attachment if this message has a video
  audio?: AudioAttachment; // Audio attachment if this message has audio
}

export interface Chat {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isFavourite: boolean;
  isPinned?: boolean;
}

/**
 * Service method to get all chats
 * This will be connected to the backend in the future
 */
export const getChats = async (): Promise<Chat[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock data - in the future, this will come from the backend
  return mockChats;

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/chats', {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get chats')
  // return await response.json()
};

/**
 * Service method to get archived chats
 * This will be connected to the backend in the future
 */
export const getArchivedChats = async (): Promise<Chat[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock archived chats - in the future, this will come from the backend
  return mockArchivedChats;

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/chats/archived', {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get archived chats')
  // return await response.json()
};

/**
 * Service method to get messages for a specific chat
 * This will be connected to the backend in the future
 */
export const getChatMessages = async (chatId: string): Promise<ChatMessage[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock messages for the chat
  const messages = mockMessages[chatId] || [];
  return messages;

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/chats/${chatId}/messages`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get messages')
  // return await response.json()
};

/**
 * Service method to unarchive a chat
 * This will be connected to the backend in the future
 */
export const unarchiveChat = async (chatId: string): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/chats/${chatId}/unarchive`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to unarchive chat')
  // return await response.json()

  console.log('Unarchiving chat:', chatId);
};

/**
 * Service method to delete a chat
 * This will be connected to the backend in the future
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/chats/${chatId}`, {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to delete chat')
  // return await response.json()

  console.log('Deleting chat:', chatId);
};

/**
 * Service method to read all chats (mark all as read)
 * This will be connected to the backend in the future
 */
export const readAllChats = async (): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/chats/read-all', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to read all chats')
  // return await response.json()

  console.log('Reading all chats');
};

/**
 * Service method to archive a chat
 * This will be connected to the backend in the future
 */
export const archiveChat = async (chatId: string): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/chats/${chatId}/archive`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to archive chat')
  // return await response.json()

  console.log('Archiving chat:', chatId);
};

/**
 * Service method to mark a chat as read
 * This will be connected to the backend in the future
 */
export const markChatAsRead = async (chatId: string): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/chats/${chatId}/read`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to mark chat as read')
  // return await response.json()

  console.log('Marking chat as read:', chatId);
};

/**
 * Service method to react to a message
 * This will be connected to the backend in the future
 */
export const reactTo = async (
  messageId: string,
  emoji: string,
  isSender: boolean
): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/messages/${messageId}/react`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ emoji, isSender }),
  // })
  // if (!response.ok) throw new Error('Failed to react to message')
  // return await response.json()

  console.log('Reacting to message:', messageId, emoji, isSender);
};

/**
 * Service method to remove a reaction from a message
 * This will be connected to the backend in the future
 */
export const removeReaction = async (
  messageId: string,
  isSender: boolean
): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/messages/${messageId}/remove-reaction`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ isSender }),
  // })
  // if (!response.ok) throw new Error('Failed to remove reaction')
  // return await response.json()

  console.log('Removing reaction from message:', messageId, isSender);
};

/**
 * Service method to create a new chat with a client
 * This will be connected to the backend in the future
 */
export const createNewChat = async (
  clientId: string,
  options?: { clientName?: string; clientAvatar?: string }
): Promise<Chat> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/chats', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ clientId, ...options }),
  // })
  // if (!response.ok) throw new Error('Failed to create chat')
  // return await response.json()

  console.log('Creating new chat with client:', clientId, options);

  // Return a mock chat for now
  const newChat: Chat = {
    id: `chat-${Date.now()}`,
    clientId,
    clientName: options?.clientName || 'New Client',
    clientAvatar: options?.clientAvatar,
    lastMessage: '',
    lastMessageTime: new Date(),
    unreadCount: 0,
    isFavourite: false,
  };

  return newChat;
};

/**
 * Service method to send an image message
 * This will be connected to the backend in the future
 */
export const sendImageMessage = async (
  chatId: string,
  imageBytes: Uint8Array | Uint8Array[],
  caption?: string
): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const formData = new FormData();
  // formData.append('chatId', chatId);
  // const images = Array.isArray(imageBytes) ? imageBytes : [imageBytes];
  // images.forEach((bytes, index) => {
  //   formData.append(`image${index}`, {
  //     uri: imageUri,
  //     type: 'image/jpeg',
  //     name: `photo${index}.jpg`,
  //   } as any);
  // });
  // if (caption) {
  //   formData.append('caption', caption);
  // }
  // const response = await fetch(`/api/chats/${chatId}/messages/image`, {
  //   method: 'POST',
  //   body: formData,
  // })
  // if (!response.ok) throw new Error('Failed to send image message')
  // return await response.json()

  const images = Array.isArray(imageBytes) ? imageBytes : [imageBytes];
  console.log('Sending image message:', {
    chatId,
    imageCount: images.length,
    totalSize: images.reduce((sum, bytes) => sum + bytes.length, 0),
    caption,
  });
};

/**
 * Service method to send a document message
 * This will be connected to the backend in the future
 */
export const sendDocumentMessage = async (
  chatId: string,
  documentBytes: Uint8Array,
  documentName: string,
  mimeType: string,
  caption?: string
): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const formData = new FormData();
  // formData.append('chatId', chatId);
  // formData.append('document', {
  //   uri: documentUri,
  //   type: mimeType,
  //   name: documentName,
  // } as any);
  // if (caption) {
  //   formData.append('caption', caption);
  // }
  // const response = await fetch(`/api/chats/${chatId}/messages/document`, {
  //   method: 'POST',
  //   body: formData,
  // })
  // if (!response.ok) throw new Error('Failed to send document message')
  // return await response.json()

  console.log('Sending document message:', {
    chatId,
    documentName,
    mimeType,
    size: documentBytes.length,
    caption,
  });
};

/**
 * Service method to send a video message
 * This will be connected to the backend in the future
 */
export const sendVideoMessage = async (
  chatId: string,
  videoUri: string,
  caption?: string
): Promise<void> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const formData = new FormData();
  // formData.append('chatId', chatId);
  // formData.append('video', {
  //   uri: videoUri,
  //   type: 'video/mp4',
  //   name: 'video.mp4',
  // } as any);
  // if (caption) {
  //   formData.append('caption', caption);
  // }
  // const response = await fetch(`/api/chats/${chatId}/messages/video`, {
  //   method: 'POST',
  //   body: formData,
  // })
  // if (!response.ok) throw new Error('Failed to send video message')
  // return await response.json()

  console.log('Sending video message:', {
    chatId,
    videoUri,
    caption,
  });
};

// Mock chats data
const mockChats: Chat[] = [
  {
    id: '1',
    clientId: '1',
    clientName: 'John Smith',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Thanks for the workout plan! ',
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    unreadCount: 2,
    isFavourite: true,
    isPinned: true,
  },
  {
    id: '2',
    clientId: '2',
    clientName: 'Sarah Johnson',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Can we schedule a session for next week?',
    lastMessageTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: '3',
    clientId: '3',
    clientName: 'Mike Wilson',
    clientAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'The new exercises are working great!',
    lastMessageTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    unreadCount: 1,
    isFavourite: true,
  },
  {
    id: '4',
    clientId: '4',
    clientName: 'Emily Davis',
    clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'See you tomorrow at 10am',
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: '5',
    clientId: '5',
    clientName: 'David Brown',
    clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'I have a question about my nutrition plan',
    lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    unreadCount: 3,
    isFavourite: false,
  },
  {
    id: '6',
    clientId: '6',
    clientName: 'Lisa Anderson',
    clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Perfect, thanks!',
    lastMessageTime: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    unreadCount: 0,
    isFavourite: true,
  },
  {
    id: '7',
    clientId: '7',
    clientName: 'Chris Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Looking forward to our next session',
    lastMessageTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: '8',
    clientId: '8',
    clientName: 'Jessica Taylor',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'The progress is amazing!',
    lastMessageTime: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: '9',
    clientId: '9',
    clientName: 'Robert Lee',
    clientAvatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Can we adjust the training schedule?',
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    unreadCount: 1,
    isFavourite: false,
  },
  {
    id: '10',
    clientId: '10',
    clientName: 'Amanda White',
    clientAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Thanks for everything!',
    lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    unreadCount: 0,
    isFavourite: false,
  },
];

// Mock archived chats data
const mockArchivedChats: Chat[] = [
  {
    id: 'archived-1',
    clientId: '11',
    clientName: 'Michael Chen',
    clientAvatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Thanks for the help!',
    lastMessageTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: 'archived-2',
    clientId: '12',
    clientName: 'Sophie Martin',
    clientAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'See you next month',
    lastMessageTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: 'archived-3',
    clientId: '13',
    clientName: 'James Thompson',
    clientAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'All done, thanks!',
    lastMessageTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: 'archived-4',
    clientId: '14',
    clientName: 'Emma Garcia',
    clientAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Great session today',
    lastMessageTime: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
    unreadCount: 0,
    isFavourite: false,
  },
  {
    id: 'archived-5',
    clientId: '15',
    clientName: 'Daniel Rodriguez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    lastMessage: 'Thanks for everything',
    lastMessageTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    unreadCount: 0,
    isFavourite: false,
  },
];

// Mock messages data for each chat
const mockMessages: Record<string, ChatMessage[]> = {
  '1': [
    // Messages from 5 days ago
    {
      id: 'm1-0-1',
      text: 'Hey! Just wanted to say hi and see how things are going.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000), // 5 days, 2 hours ago
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-0-2',
      text: 'Hi! Things are going well, thanks for checking in.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    // Messages from 4 days ago
    {
      id: 'm1-0-3',
      text: 'How was your workout yesterday?',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-0-4',
      text: 'It was great! I felt really strong.',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000 - 30 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    // Messages from 3 days ago
    {
      id: 'm1-0-5',
      text: 'That\'s awesome to hear!',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-0-6',
      text: 'I\'ve been really consistent with the program',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000 - 15 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    // Messages from 2 days ago
    {
      id: 'm1-0-7',
      text: 'Consistency is the most important thing',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-0-8',
      text: 'I completely agree. I can already feel the difference',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000 - 30 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    // Messages from yesterday
    {
      id: 'm1-0-9',
      text: 'That\'s exactly what we want to see!',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-0-10',
      text: 'Keep up the momentum!',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    // Today's messages
    {
      id: 'm1-1',
      text: 'Hi! I wanted to check in about my progress.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 30 * 60 * 1000), // 3.5 hours ago
      isSent: false, // client message
      isRead: true,
    },
    {
      id: 'm1-2',
      text: 'Great to hear from you! How are you feeling?',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 25 * 60 * 1000),
      isSent: true, // user message
      isRead: true,
    },
    {
      id: 'm1-3',
      text: 'I feel really good!',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 20 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-4',
      text: 'The new exercises are working great',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 18 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-5',
      text: 'I can already see some improvement',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 15 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-6',
      text: 'That\'s fantastic! Keep up the great work.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 - 10 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-7',
      text: 'I\'ve been following the plan exactly as you suggested',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-8',
      text: 'Perfect! Consistency is key.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 40 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-9',
      text: 'How many times per week are you training?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 38 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-10',
      text: 'I\'m doing 4 sessions per week',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 35 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-11',
      text: 'Monday, Wednesday, Friday, and Saturday',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 33 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-12',
      text: 'That\'s an excellent schedule!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 30 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-13',
      text: 'You\'re giving yourself good recovery time between sessions',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 28 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-14',
      text: 'Yes, I make sure to rest on the days in between',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 25 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-15',
      text: 'I also do some light stretching',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 23 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-16',
      text: 'That\'s perfect! Active recovery is important.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 - 50 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-17',
      text: 'Keep up the great work and let me know if you have any questions',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 - 48 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm1-18',
      text: 'Will do! Thanks for all your help',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm1-19',
      text: 'Thanks for the workout plan!',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      isSent: false,
      isRead: false,
    },
    {
      id: 'm1-20',
      text: 'You\'re welcome! Let me know how it goes.',
      timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
      isSent: true,
      isRead: false,
      replyTo: {
        id: 'm1-19',
        text: 'Thanks for the workout plan!',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        isSent: false,
        isRead: false,
      },
    },
    {
      id: 'm1-21',
      text: 'I have a question about the third exercise',
      timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      isSent: false,
      isRead: false,
      replyTo: {
        id: 'm1-20',
        text: 'You\'re welcome! Let me know how it goes.',
        timestamp: new Date(Date.now() - 3 * 60 * 1000),
        isSent: true,
        isRead: false,
      },
    },
  ],
  '2': [
    // Messages from 3 days ago
    {
      id: 'm2-0-1',
      text: 'Hi! I was wondering if we could set up a training session',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm2-0-2',
      text: 'Of course! When were you thinking?',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    // Messages from yesterday
    {
      id: 'm2-0-3',
      text: 'Maybe sometime next week?',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm2-0-4',
      text: 'Let me check my calendar and get back to you',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000 - 30 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    // Today's messages
    {
      id: 'm2-1',
      text: 'Can we schedule a session for next week?',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      isSent: false,
      isRead: true,
    },
    {
      id: 'm2-2',
      text: 'Absolutely! What day works best for you?',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
  ],
  '3': [
    // Messages from 4 days ago
    {
      id: 'm3-0-1',
      text: 'I started the new program you sent me',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm3-0-2',
      text: 'Great! How does it feel?',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000 - 30 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    // Messages from 2 days ago
    {
      id: 'm3-0-3',
      text: 'It\'s challenging but I like it',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm3-0-4',
      text: 'That\'s the goal! Push yourself but stay safe',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    // Today's messages
    {
      id: 'm3-1',
      text: 'The new exercises are working great!',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      isSent: false,
      isRead: false,
    },
    {
      id: 'm3-2',
      text: 'I\'m really happy to hear that',
      timestamp: new Date(Date.now() - 55 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm3-3',
      text: 'Keep pushing yourself',
      timestamp: new Date(Date.now() - 54 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm3-4',
      text: 'You\'re doing amazing',
      timestamp: new Date(Date.now() - 53 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
  ],
  '4': [
    {
      id: 'm4-1',
      text: 'See you tomorrow at 10am',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
  ],
  '5': [
    // Messages from 6 days ago
    {
      id: 'm5-0-1',
      text: 'I received the nutrition plan, thank you!',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm5-0-2',
      text: 'You\'re welcome! Let me know if you have any questions',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000 - 30 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    // Messages from 3 days ago
    {
      id: 'm5-0-3',
      text: 'I\'ve been following it for a few days now',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
      isSent: false,
      isRead: true,
    },
    {
      id: 'm5-0-4',
      text: 'How is it going?',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    // Today's messages
    {
      id: 'm5-1',
      text: 'I have a question about my nutrition plan',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      isSent: false,
      isRead: false,
    },
    {
      id: 'm5-2',
      text: 'What would you like to know?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 50 * 60 * 1000),
      isSent: true,
      isRead: true,
    },
    {
      id: 'm5-3',
      text: 'I\'m not sure about the protein intake',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 45 * 60 * 1000),
      isSent: false,
      isRead: false,
    },
    {
      id: 'm5-4',
      text: 'Should I increase it?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 44 * 60 * 1000),
      isSent: false,
      isRead: false,
    },
  ],
};
