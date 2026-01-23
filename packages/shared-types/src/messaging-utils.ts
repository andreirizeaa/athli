/**
 * Messaging Utilities - Shared Business Logic
 *
 * Pure utility functions for messaging functionality that can be shared
 * across mobile app, web frontend, and API.
 */

import type {
  BroadcastMessageData,
  Message,
  MessageAttachment,
  MessageReaction,
  MessageStatus,
  MessageType,
  OptimisticMessage,
  ReadReceipt,
} from './messaging-schema';

// ================================================
// UI MESSAGE TYPE (for rendering)
// ================================================

/**
 * UIMessage - Message type with computed fields for UI rendering
 *
 * This type extends the base Message with fields the UI needs:
 * - text: mapped from content (UI components expect 'text')
 * - isSent: true if current user sent this message
 * - isRead: true if message has been read
 * - replyTo: transformed parent message for threading UI
 */
export interface UIMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  parent_message_id: string | null;
  status: MessageStatus;
  sent_at: Date | string;
  read_at: Date | string | null;
  edited_at: Date | string | null;
  is_deleted: boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  attachment_count?: number;

  // UI-specific computed fields
  text: string | null;
  isSent: boolean;
  isRead: boolean;
  replyTo?: UIMessage;
}

/**
 * Transform a Message or OptimisticMessage to UIMessage for rendering
 *
 * @param msg - Message from database or optimistic message
 * @param currentUserId - ID of current user (for isSent calculation)
 * @returns UIMessage with computed fields
 */
export function transformToUIMessage(
  msg: Message | OptimisticMessage,
  currentUserId: string,
): UIMessage {
  // Defensive check: parent_message might be [] instead of null from API
  const parentMsg = (msg as Message).parent_message;
  const hasValidParent =
    parentMsg &&
    !Array.isArray(parentMsg) &&
    typeof parentMsg === 'object' &&
    'id' in parentMsg;

  return {
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    message_type: msg.message_type,
    parent_message_id: msg.parent_message_id ?? null,
    status: msg.status,
    sent_at: msg.sent_at,
    read_at: (msg as Message).read_at ?? null,
    edited_at: (msg as Message).edited_at ?? null,
    is_deleted: msg.is_deleted,
    deleted_at: (msg as Message).deleted_at ?? null,
    created_at: (msg as Message).created_at ?? msg.sent_at,
    attachments: (msg as Message).attachments,
    reactions: (msg as Message).reactions,
    attachment_count: (msg as Message).attachment_count,

    // Computed fields
    text: msg.content,
    isSent: msg.sender_id === currentUserId,
    isRead: Boolean((msg as Message).read_at),
    replyTo: hasValidParent
      ? transformToUIMessage(parentMsg as Message, currentUserId)
      : undefined,
  };
}

/**
 * Transform an array of messages to UIMessages
 * Also enriches messages that have parent_message_id but no parent_message
 * by looking up the parent from the message list.
 *
 * @param messages - Array of messages from database/realtime/optimistic
 * @param currentUserId - ID of current user
 * @returns Array of UIMessages ready for rendering
 */
export function transformMessages(
  messages: Array<Message | OptimisticMessage>,
  currentUserId: string,
): UIMessage[] {
  // Create a map for quick parent message lookup
  const messageMap = new Map<string, Message | OptimisticMessage>();
  messages.forEach((m) => messageMap.set(m.id, m));

  // Transform messages, enriching with parent data when needed
  return messages.map((m) => {
    // Check if message has parent_message_id but no valid parent_message
    const parentMsg = (m as Message).parent_message;
    const hasValidParent =
      parentMsg &&
      !Array.isArray(parentMsg) &&
      typeof parentMsg === 'object' &&
      'id' in parentMsg;

    // If no valid parent but has parent_message_id, try to look it up
    if (!hasValidParent && m.parent_message_id) {
      const parentFromMap = messageMap.get(m.parent_message_id);
      if (parentFromMap) {
        // Enrich the message with parent data for transformation
        (m as any).parent_message = {
          id: parentFromMap.id,
          content: parentFromMap.content,
          message_type: parentFromMap.message_type,
          sender_id: parentFromMap.sender_id,
          sent_at: parentFromMap.sent_at,
          is_deleted: parentFromMap.is_deleted,
          attachments: (parentFromMap as Message).attachments,
        };
      }
    }

    return transformToUIMessage(m, currentUserId);
  });
}

// ================================================
// ID & IDEMPOTENCY KEY GENERATORS
// ================================================

/**
 * Generate a UUID v4 for message IDs
 * Client-provided IDs ensure instant deduplication (optimistic ID = real ID)
 *
 * @returns UUID v4 string
 */
export function generateMessageId(): string {
  // Use crypto.randomUUID if available (modern browsers/Node 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate an idempotency key for message sending
 * Prevents duplicate messages on network retry
 *
 * Format: {senderId}-{timestamp}-{random}
 *
 * @param senderId - UUID of the sender
 * @returns Idempotency key string
 *
 * @example
 * generateIdempotencyKey("user-123")
 * // Returns: "user-123-1704067200000-abc123"
 */
export function generateIdempotencyKey(senderId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${senderId}-${timestamp}-${random}`;
}

/**
 * @deprecated Use generateMessageId() instead
 * Legacy function for backward compatibility
 */
export function createOptimisticMessageId(): string {
  return `temp-${Date.now()}-${Math.random()}`;
}

/**
 * Parent message data for optimistic replies
 * Contains only the fields needed for reply preview UI
 */
export interface OptimisticParentMessage {
  id: string;
  content: string | null;
  message_type: MessageType;
  sender_id: string;
  sent_at: Date | string;
  is_deleted: boolean;
  attachments?: MessageAttachment[];
}

/**
 * Create an optimistic message for immediate UI updates
 * 
 * IMPORTANT: Uses client-provided UUID so optimistic ID = real message ID.
 * This eliminates the need for complex deduplication logic.
 *
 * @param conversationId - UUID of conversation
 * @param senderId - UUID of sender
 * @param content - Message content
 * @param messageType - Type of message (default: 'text')
 * @param parentMessageId - Optional parent message ID for threading
 * @param attachments - Optional array of attachments with local_uri for optimistic display
 * @param parentMessage - Optional parent message object for reply preview
 * @param messageId - Optional pre-generated message ID (uses generateMessageId() if not provided)
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
  attachments?: Array<{ local_uri: string; mime_type: string; filename?: string; duration?: number }>,
  parentMessage?: OptimisticParentMessage,
  messageId?: string,
): OptimisticMessage {
  // Generate IDs upfront - messageId will be the REAL message ID
  const id = messageId || generateMessageId();
  const idempotencyKey = generateIdempotencyKey(senderId);

  const optimisticMessage: OptimisticMessage = {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    message_type: messageType,
    parent_message_id: parentMessageId || null,
    status: 'sending',
    sent_at: new Date(),
    is_deleted: false,
    idempotency_key: idempotencyKey,
    attachments: attachments?.map((att) => ({
      id: generateMessageId(),
      message_id: id,
      conversation_id: conversationId,
      bucket_id: 'message_attachments',
      file_path: '',
      filename: att.filename || 'attachment',
      mime_type: att.mime_type,
      size_bytes: 0,
      upload_status: 'uploading' as const,
      created_at: new Date(),
      local_uri: att.local_uri,
      duration_seconds: att.duration ? Math.round(att.duration / 1000) : undefined,
    })),
  };

  // Add parent_message if provided (for reply preview in optimistic messages)
  if (parentMessage && parentMessageId) {
    (optimisticMessage as any).parent_message = {
      id: parentMessage.id,
      content: parentMessage.content,
      message_type: parentMessage.message_type,
      sender_id: parentMessage.sender_id,
      sent_at: parentMessage.sent_at,
      is_deleted: parentMessage.is_deleted,
      attachments: parentMessage.attachments,
    };
  }

  return optimisticMessage;
}

/**
 * Type guard to check if a message is optimistic
 * 
 * With client-provided IDs, we now check the status field instead of ID prefix.
 *
 * @param message - Message to check
 * @returns True if message is optimistic (status === 'sending')
 *
 * @example
 * if (isOptimisticMessage(message)) {
 *   // Handle optimistic message
 * }
 */
export function isOptimisticMessage(
  message: Message | OptimisticMessage,
): message is OptimisticMessage {
  // Check status first (new approach with client-provided IDs)
  if (message.status === 'sending') {
    return true;
  }
  // Legacy check for old temp- prefixed IDs (backward compatibility)
  return message.id.startsWith('temp-');
}

// ================================================
// MESSAGE DEDUPLICATION & MERGING
// ================================================

/**
 * Helper to safely get timestamp from sent_at (handles both Date and string)
 */
function getTimestamp(sentAt: Date | string): number {
  if (sentAt instanceof Date) {
    return sentAt.getTime();
  }
  // sent_at might be a string if parsed from JSON
  return new Date(sentAt).getTime();
}

/**
 * Merge and deduplicate messages from multiple sources.
 *
 * SIMPLIFIED APPROACH with client-provided IDs:
 * - Optimistic messages use the SAME ID as the real message
 * - Deduplication is now trivial: same ID = same message
 * - Optimistic messages with status 'sending' win over real messages
 *
 * @param savedMessages - Messages from database (API)
 * @param realtimeMessages - Messages from realtime subscription
 * @param optimisticMessages - Local optimistic messages
 * @returns Deduplicated and sorted messages
 */
export function deduplicateMessages(
  savedMessages: Message[],
  realtimeMessages: Message[],
  optimisticMessages: OptimisticMessage[],
): Array<Message | OptimisticMessage> {
  const resultMap = new Map<string, Message | OptimisticMessage>();

  // Step 1: Build set of optimistic message IDs for quick lookup
  const optimisticIds = new Set(optimisticMessages.map((m) => m.id));

  // Step 2: Add saved messages (skip if we have optimistic version)
  savedMessages.forEach((msg) => {
    if (!optimisticIds.has(msg.id)) {
      resultMap.set(msg.id, msg);
    }
  });

  // Step 3: Add or merge realtime messages (skip if we have optimistic version)
  realtimeMessages.forEach((realtimeMsg) => {
    if (optimisticIds.has(realtimeMsg.id)) {
      // We have an optimistic version - skip realtime
      return;
    }

    const existingMsg = resultMap.get(realtimeMsg.id);
    if (existingMsg) {
      // Message exists in saved - merge realtime updates into it
      // Realtime has fresher data for: reactions, read_at, attachments
      const mergedMsg: Message = {
        ...(existingMsg as Message),
        reactions: realtimeMsg.reactions,
        attachments: realtimeMsg.attachments?.length
          ? realtimeMsg.attachments
          : (existingMsg as Message).attachments,
        read_at: realtimeMsg.read_at || (existingMsg as Message).read_at,
        // Take attachments_ready from realtime if message wasn't ready before
        attachments_ready: realtimeMsg.attachments_ready ?? (existingMsg as Message).attachments_ready,
      };
      resultMap.set(realtimeMsg.id, mergedMsg);
    } else {
      // Message doesn't exist in saved - add from realtime
      resultMap.set(realtimeMsg.id, realtimeMsg);
    }
  });

  // Step 4: Add ALL optimistic messages - they ALWAYS appear (and override by ID)
  optimisticMessages.forEach((msg) => {
    resultMap.set(msg.id, msg);
  });

  // Sort by timestamp and return
  return Array.from(resultMap.values()).sort(
    (a, b) => getTimestamp(a.sent_at) - getTimestamp(b.sent_at)
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
      getTimestamp(message.sent_at) <= getTimestamp(recipientReceipt.last_read_at)
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
    (msg) => getTimestamp(msg.sent_at) > getTimestamp(readReceipt.last_read_at),
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
  const timeSinceSent = now.getTime() - getTimestamp(message.sent_at);
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

// ================================================
// BROADCAST UTILITIES
// ================================================

/**
 * Create a broadcast payload with pre-generated IDs for optimistic updates.
 *
 * Each client gets a unique messageId and idempotencyKey to:
 * - Enable instant optimistic UI updates
 * - Prevent duplicate messages on retry
 *
 * @param clientIds - Array of client IDs to broadcast to
 * @param content - Message content
 * @param userId - ID of the sender (for idempotency key generation)
 * @param attachmentCount - Optional number of attachments
 * @returns BroadcastMessageData ready to send to API
 *
 * @example
 * const payload = createBroadcastPayload(
 *   ["client-1", "client-2", "client-3"],
 *   "Hello everyone!",
 *   "coach-123",
 *   2
 * );
 */
export function createBroadcastPayload(
  clientIds: string[],
  content: string,
  userId: string,
  attachmentCount?: number,
): BroadcastMessageData {
  return {
    clientIds,
    content,
    attachmentCount,
    messageIds: clientIds.map(() => generateMessageId()),
    idempotencyKeys: clientIds.map(() => generateIdempotencyKey(userId)),
  };
}
