/**
 * Chat and messaging types
 * Centralized from services/chats-service.ts
 */

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