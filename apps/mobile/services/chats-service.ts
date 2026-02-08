/**
 * Chats Service - Coach View Wrapper
 * Wrapper around messaging-service.ts that auto-injects current user ID
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
export type { Conversation as Chat, Message as ChatMessage } from './messaging-service';

// Attachment type aliases (unified MessageAttachment)
export type {
  MessageAttachment as DocumentAttachment,
  MessageAttachment as ImageAttachment,
  MessageAttachment as VideoAttachment,
  MessageAttachment as AudioAttachment,
} from './messaging-service';

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
 * Get all conversations for current user
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
  options?: { limit?: number; offset?: number; beforeTimestamp?: Date },
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
  const result = await MessagingService.sendMessage({
    conversationId,
    senderId: userId,
    content,
    messageType: options?.messageType,
    parentMessageId: options?.parentMessageId,
    messageId: options?.messageId,
    idempotencyKey: options?.idempotencyKey,
    attachmentCount: options?.attachmentCount || 0,
    senderRole: 'coach',
  });
  return result;
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
  // return MessagingService.deleteConversation(conversationId, userId);
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

export const getChats = getConversations;
export async function getArchivedChats() {
  const userId = await getCurrentUserId();
  return MessagingService.getArchivedConversations(userId);
}
export const getChatMessages = getMessages;
export const archiveChat = archiveConversation;
export const unarchiveChat = unarchiveConversation;
export const deleteChat = deleteConversation;
export const markChatAsRead = markConversationAsRead;
export const readAllChats = markAllConversationsAsRead;

// Specialized message sending functions (map to sendMessage with appropriate type)
export async function sendImageMessage(
  conversationId: string,
  imageUri: string,
  caption?: string,
) {
  // TODO: Implement with file upload hook
  const userId = await getCurrentUserId();
  return MessagingService.sendMessage({
    conversationId,
    senderId: userId,
    content: caption || '',
    messageType: 'image',
  });
}

export async function sendVideoMessage(
  conversationId: string,
  videoUri: string,
  caption?: string,
) {
  // TODO: Implement with file upload hook
  const userId = await getCurrentUserId();
  return MessagingService.sendMessage({
    conversationId,
    senderId: userId,
    content: caption || '',
    messageType: 'video',
  });
}

export async function sendDocumentMessage(
  conversationId: string,
  documentData: any, // Can be URI string or bytes array
  filename: string,
  mimeType?: string,
  caption?: string,
) {
  // TODO: Implement with file upload hook
  const userId = await getCurrentUserId();
  return MessagingService.sendMessage({
    conversationId,
    senderId: userId,
    content: caption || filename,
    messageType: 'file',
  });
}

// Create new conversation
export async function createNewChat(
  clientId: string,
  metadata?: { clientName?: string; clientAvatar?: string },
) {
  const userId = await getCurrentUserId();
  // TODO: Call get_or_create_conversation function
  // For now, check if conversation exists, otherwise return placeholder
  const conversations = await MessagingService.getConversations({ coachId: userId });
  const existing = conversations.find((c) => c.client_id === clientId);
  if (existing) return existing;

  // Return a placeholder conversation object (will be created on first message)
  return {
    id: `temp-${clientId}`,
    coach_id: userId,
    client_id: clientId,
    last_message_at: null,
    last_message_preview: null,
    last_message_type: null,
    created_at: new Date(),
    updated_at: new Date(),
    other_user_id: clientId,
    other_user_name: metadata?.clientName,
    other_user_avatar: metadata?.clientAvatar,
    unread_count: 0,
  };
}

// React to message (legacy function with different signature)
export async function reactTo(
  messageId: string,
  emoji: string,
  isSender?: boolean, // Legacy parameter, not used
) {
  const userId = await getCurrentUserId();

  // If emoji is empty, remove reaction
  if (!emoji) {
    return MessagingService.removeReaction(messageId, userId);
  }

  // Fetch message to get conversationId
  const { data: message, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('id', messageId)
    .single();

  if (error || !message) {
    throw new Error(`Failed to fetch message: ${error?.message || 'Message not found'}`);
  }

  return MessagingService.addReaction(
    messageId,
    message.conversation_id,
    userId,
    emoji as MessagingService.ReactionEmoji
  );
}
