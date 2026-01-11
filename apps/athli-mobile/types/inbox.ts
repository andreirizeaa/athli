/**
 * Inbox (coach messaging) types
 * Centralized from services/inbox-service.ts
 */

import type { ChatMessage } from './chat';

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
