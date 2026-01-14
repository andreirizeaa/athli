/**
 * Messaging Utilities - Shared Business Logic
 *
 * Pure utility functions for messaging functionality that can be shared
 * across mobile app, web frontend, and API.
 */

import type {
  Message,
  MessageStatus,
  MessageType,
  OptimisticMessage,
  ReadReceipt,
} from './messaging-schema';

// ================================================
// OPTIMISTIC MESSAGE HELPERS
// ================================================

/**
 * Generate a unique temporary ID for optimistic messages
 *
 * Format: temp-{timestamp}-{random}
 *
 * @returns Unique temporary message ID
 *
 * @example
 * createOptimisticMessageId()
 * // Returns: "temp-1704067200000-0.123456789"
 */
export function createOptimisticMessageId(): string {
  return `temp-${Date.now()}-${Math.random()}`;
}

/**
 * Create an optimistic message for immediate UI updates
 *
 * @param conversationId - UUID of conversation
 * @param senderId - UUID of sender
 * @param content - Message content
 * @param messageType - Type of message (default: 'text')
 * @param parentMessageId - Optional parent message ID for threading
 * @returns Optimistic message object
 *
 * @example
 * const message = createOptimisticMessage(
 *   "conv-123",
 *   "user-456",
 *   "Hello world!",
 *   "text"
 * );
 */
export function createOptimisticMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: MessageType = 'text',
  parentMessageId?: string,
): OptimisticMessage {
  return {
    id: createOptimisticMessageId(),
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    message_type: messageType,
    parent_message_id: parentMessageId || null,
    status: 'sending',
    sent_at: new Date(),
    is_deleted: false,
  };
}

/**
 * Type guard to check if a message is optimistic
 *
 * @param message - Message to check
 * @returns True if message is optimistic (temp ID)
 *
 * @example
 * if (isOptimisticMessage(message)) {
 *   // Handle optimistic message
 * }
 */
export function isOptimisticMessage(
  message: Message | OptimisticMessage,
): message is OptimisticMessage {
  return message.id.startsWith('temp-');
}

// ================================================
// MESSAGE DEDUPLICATION & MERGING
// ================================================

/**
 * Merge and deduplicate messages from multiple sources
 *
 * Priority (highest to lowest):
 * 1. Realtime messages (most up-to-date from server)
 * 2. Saved messages (from database)
 * 3. Optimistic messages (local only, not yet confirmed)
 *
 * @param savedMessages - Messages from database
 * @param realtimeMessages - Messages from realtime subscription
 * @param optimisticMessages - Local optimistic messages
 * @returns Deduplicated and sorted messages
 *
 * @example
 * const allMessages = deduplicateMessages(
 *   dbMessages,
 *   realtimeMessages,
 *   optimisticMessages
 * );
 */
export function deduplicateMessages(
  savedMessages: Message[],
  realtimeMessages: Message[],
  optimisticMessages: OptimisticMessage[],
): Array<Message | OptimisticMessage> {
  // Use Map for O(1) deduplication
  const messageMap = new Map<string, Message | OptimisticMessage>();

  // Step 1: Add saved messages
  savedMessages.forEach((msg) => messageMap.set(msg.id, msg));

  // Step 2: Realtime messages override saved (in case of updates)
  realtimeMessages.forEach((msg) => messageMap.set(msg.id, msg));

  // Step 3: Add optimistic messages that haven't been confirmed
  optimisticMessages.forEach((msg) => {
    if (!messageMap.has(msg.id)) {
      messageMap.set(msg.id, msg);
    }
  });

  // Convert back to array and sort by sent_at (oldest first)
  return Array.from(messageMap.values()).sort(
    (a, b) => a.sent_at.getTime() - b.sent_at.getTime(),
  );
}

// ================================================
// MESSAGE STATUS CALCULATION
// ================================================

/**
 * Calculate the display status for a message based on read receipts
 *
 * Rules:
 * - For other users' messages: return message.status as-is
 * - For own messages:
 *   - If status is 'sending', 'failed', or 'sent': return as-is
 *   - Check read receipts to determine if message was read
 *   - Default to 'sent' if no read receipt found
 *
 * @param message - Message to calculate status for
 * @param readReceipts - Read receipts for the conversation
 * @param currentUserId - ID of current user
 * @returns Calculated message status
 *
 * @example
 * const status = calculateMessageStatus(message, receipts, "user-123");
 * // Returns: 'read' if recipient has read it, 'sent' otherwise
 */
export function calculateMessageStatus(
  message: Message | OptimisticMessage,
  readReceipts: ReadReceipt[],
  currentUserId: string,
): MessageStatus {
  // Only calculate status for own messages
  if (message.sender_id !== currentUserId) {
    return message.status;
  }

  // If message has explicit status, use it
  if (
    message.status === 'sending' ||
    message.status === 'failed' ||
    message.status === 'sent'
  ) {
    return message.status;
  }

  // Check if recipient has read the message
  const recipientReceipt = readReceipts.find(
    (r) => r.user_id !== currentUserId,
  );

  if (recipientReceipt) {
    if (
      recipientReceipt.last_read_at &&
      message.sent_at <= recipientReceipt.last_read_at
    ) {
      return 'read';
    }
  }

  // Default to sent if no read receipt
  return 'sent';
}

// ================================================
// UNREAD COUNT CALCULATION
// ================================================

/**
 * Calculate unread message count from messages array
 *
 * Counts messages that:
 * - Were not sent by the current user
 * - Were sent after the last read time (or all if no receipt)
 * - Are not deleted
 *
 * @param messages - All messages in conversation
 * @param currentUserId - ID of current user
 * @param readReceipt - Optional read receipt for current user
 * @returns Number of unread messages
 *
 * @example
 * const unreadCount = calculateUnreadCount(messages, "user-123", receipt);
 * // Returns: 5 (5 unread messages)
 */
export function calculateUnreadCount(
  messages: Message[],
  currentUserId: string,
  readReceipt?: ReadReceipt,
): number {
  // Filter messages not sent by current user and not deleted
  const otherUserMessages = messages.filter(
    (msg) => msg.sender_id !== currentUserId && !msg.is_deleted,
  );

  // If no read receipt, all messages are unread
  if (!readReceipt || !readReceipt.last_read_at) {
    return otherUserMessages.length;
  }

  // Count messages sent after last read time
  return otherUserMessages.filter(
    (msg) => msg.sent_at > readReceipt.last_read_at,
  ).length;
}

/**
 * Check if conversation has unread messages
 *
 * @param messages - All messages in conversation
 * @param currentUserId - ID of current user
 * @param readReceipt - Optional read receipt for current user
 * @returns True if there are unread messages
 */
export function hasUnreadMessages(
  messages: Message[],
  currentUserId: string,
  readReceipt?: ReadReceipt,
): boolean {
  return calculateUnreadCount(messages, currentUserId, readReceipt) > 0;
}

// ================================================
// MESSAGE FORMATTING HELPERS
// ================================================

/**
 * Get a preview of message content for conversation list
 *
 * @param message - Message to get preview from
 * @param maxLength - Maximum length of preview (default: 100)
 * @returns Preview string
 *
 * @example
 * getMessagePreview(message, 50)
 * // Returns: "Hello, this is a long message that will..."
 */
export function getMessagePreview(
  message: Message,
  maxLength: number = 100,
): string {
  if (message.is_deleted) {
    return 'Message deleted';
  }

  if (message.message_type !== 'text') {
    const typeLabels: Record<MessageType, string> = {
      text: 'Message',
      image: '📷 Image',
      video: '🎥 Video',
      audio: '🎵 Audio',
      file: '📎 File',
    };
    return typeLabels[message.message_type];
  }

  if (!message.content) {
    return 'No content';
  }

  if (message.content.length <= maxLength) {
    return message.content;
  }

  return `${message.content.substring(0, maxLength)}...`;
}

/**
 * Check if message can be deleted by user
 *
 * @param message - Message to check
 * @param userId - ID of user attempting deletion
 * @returns True if user can delete the message
 */
export function canDeleteMessage(message: Message, userId: string): boolean {
  // Already deleted
  if (message.is_deleted) {
    return false;
  }

  // Can only delete own messages
  if (message.sender_id !== userId) {
    return false;
  }

  // Can't delete failed or sending messages (should retry or cancel instead)
  if (message.status === 'sending' || message.status === 'failed') {
    return false;
  }

  return true;
}

/**
 * Check if message can be edited by user
 *
 * @param message - Message to check
 * @param userId - ID of user attempting edit
 * @param maxEditTimeMs - Maximum time after sending to allow edits (default: 15 minutes)
 * @returns True if user can edit the message
 */
export function canEditMessage(
  message: Message,
  userId: string,
  maxEditTimeMs: number = 15 * 60 * 1000, // 15 minutes
): boolean {
  // Can't edit deleted messages
  if (message.is_deleted) {
    return false;
  }

  // Can only edit own messages
  if (message.sender_id !== userId) {
    return false;
  }

  // Can only edit text messages
  if (message.message_type !== 'text') {
    return false;
  }

  // Can't edit failed or sending messages
  if (message.status === 'sending' || message.status === 'failed') {
    return false;
  }

  // Check edit time window
  const now = new Date();
  const timeSinceSent = now.getTime() - message.sent_at.getTime();
  if (timeSinceSent > maxEditTimeMs) {
    return false;
  }

  return true;
}

/**
 * Check if user can reply to a message
 *
 * @param message - Message to check
 * @returns True if message can be replied to
 */
export function canReplyToMessage(message: Message): boolean {
  // Can't reply to deleted messages
  if (message.is_deleted) {
    return false;
  }

  // Can't reply to failed or sending messages
  if (message.status === 'sending' || message.status === 'failed') {
    return false;
  }

  return true;
}
