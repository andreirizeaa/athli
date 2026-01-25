/**
 * Inbox Service - Client View Wrapper
 * Wrapper around messaging-service.ts that auto-injects current user ID
 * (Same as chats-service but from client perspective)
 */

import { supabase } from '@/lib/supabase';
import * as MessagingService from './messaging-service';

// Re-export types
export type {
  Message,
  MessageAttachment,
  MessageReaction,
  Conversation,
  ConversationParticipant,
  ReadReceipt,
  OptimisticMessage,
  MessageStatus,
  MessageType,
} from './messaging-service';

// Type aliases for backwards compatibility during migration
export type { Conversation as Coach, Message as InboxMessage } from './messaging-service';

// ================================================
// AUTH HELPER
// ================================================

/**
 * Get current authenticated user ID
 * @throws Error if no user is authenticated
 */
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('No authenticated user found');
  }

  return user.id;
}

// ================================================
// WRAPPED FUNCTIONS (Auto-inject userId)
// ================================================

/**
 * Get all conversations for current user (client's inbox)
 */
export async function getConversations(includeArchived = false) {
  const userId = await getCurrentUserId();
  return MessagingService.getConversations({
    coachId: userId,
    includeArchived,
  });
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; offset?: number },
) {
  return MessagingService.getMessages({
    conversationId,
    ...options,
  });
}

/**
 * Send a message
 * IMPORTANT: Pass messageId and idempotencyKey to enable deduplication
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  options?: {
    messageType?: MessagingService.MessageType;
    parentMessageId?: string;
    messageId?: string;
    idempotencyKey?: string;
    attachmentCount?: number;
  },
) {
  const userId = await getCurrentUserId();
  return MessagingService.sendMessage({
    conversationId,
    senderId: userId,
    content,
    messageType: options?.messageType,
    parentMessageId: options?.parentMessageId,
    messageId: options?.messageId,
    idempotencyKey: options?.idempotencyKey,
    attachmentCount: options?.attachmentCount || 0,
  });
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
  const userId = await getCurrentUserId();
  return MessagingService.archiveConversation(conversationId, userId);
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(conversationId: string) {
  const userId = await getCurrentUserId();
  return MessagingService.unarchiveConversation(conversationId, userId);
}

/**
 * Delete a conversation
 * TODO: Implement in messaging-service.ts
 */
export async function deleteConversation(conversationId: string) {
  const userId = await getCurrentUserId();
  console.log('[deleteConversation] Not implemented yet:', conversationId, userId);
  return Promise.resolve();
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId: string) {
  const userId = await getCurrentUserId();
  return MessagingService.markConversationAsRead(conversationId, userId);
}

/**
 * Mark all conversations as read
 */
export async function markAllConversationsAsRead() {
  const userId = await getCurrentUserId();
  return MessagingService.markAllConversationsAsRead(userId);
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string) {
  const userId = await getCurrentUserId();
  return MessagingService.deleteMessage(messageId, userId);
}

/**
 * Add reaction to message
 */
export async function addReaction(
  messageId: string,
  conversationId: string,
  reaction: MessagingService.ReactionEmoji,
) {
  const userId = await getCurrentUserId();
  return MessagingService.addReaction(messageId, conversationId, userId, reaction);
}

/**
 * Remove reaction from message
 */
export async function removeReaction(messageId: string) {
  const userId = await getCurrentUserId();
  return MessagingService.removeReaction(messageId, userId);
}

// Re-export utility functions that don't need userId
export { createOptimisticMessage } from './messaging-service';

// ================================================
// LEGACY FUNCTION ALIASES (for backwards compatibility)
// ================================================

export const getCoaches = getConversations;
export const getInboxMessages = getMessages;
export const sendInboxMessage = sendMessage;
export const archiveCoach = archiveConversation;
export const markCoachAsRead = markConversationAsRead;
export const readAllInbox = markAllConversationsAsRead;

// Get single coach/conversation
export async function getCoach(coachId: string) {
  const conversations = await getConversations();
  return conversations.find((c) => c.id === coachId);
}
