/**
 * Messaging API Client for Web App
 * Calls backend API endpoints instead of direct Supabase access
 */

import { apiFetch } from '@/api/api-client';
import type {
  BroadcastMessageData,
  BroadcastResult,
  Conversation,
  Message,
  MessageAttachment,
  MessageReaction,
  MessageType,
  ReactionEmoji,
} from '@athli/shared-types';
import { getSignedAttachmentUrl } from './attachment-url';

// ================================================
// CONVERSATION ENDPOINTS
// ================================================

type GetConversationsOptions = {
  coachId: string;
  includeArchived?: boolean;
  limit?: number;
};

export const getConversations = async ({
  includeArchived = false,
  limit = 100,
}: Omit<GetConversationsOptions, 'coachId'>): Promise<Conversation[]> => {
  const response = await apiFetch<{ data: { conversations: Conversation[] } }>(
    '/coach/messaging/conversations',
    {
      method: 'POST',
      body: {
        includeArchived,
        limit,
      },
    }
  );

  return response.data.conversations;
};

// ================================================
// MESSAGE ENDPOINTS
// ================================================

type GetMessagesOptions = {
  conversationId: string;
  limit?: number;
  offset?: number;
  beforeTimestamp?: Date;
};

export const getMessages = async ({
  conversationId,
  limit = 50,
  offset = 0,
  beforeTimestamp,
}: GetMessagesOptions): Promise<Message[]> => {
  const response = await apiFetch<{ data: { messages: any[] } }>(
    `/coach/messaging/conversations/${conversationId}/messages`,
    {
      params: {
        limit,
        offset,
        beforeTimestamp: beforeTimestamp?.toISOString(),
      },
    }
  );

  // Convert string dates to Date objects and generate signed URLs for attachments
  const messages = await Promise.all(
    response.data.messages.map(async (msg: any) => {
      // Generate signed URLs for attachments upfront to prevent flicker
      const attachmentsWithUrls = msg.attachments
        ? await Promise.all(
            msg.attachments.map(async (att: any) => {
              let signedUrl: string | null = null;
              if (att.file_path && att.bucket_id) {
                signedUrl = await getSignedAttachmentUrl(att.bucket_id, att.file_path);
              }
              return {
                ...att,
                created_at: new Date(att.created_at),
                // Add signed URL directly to attachment for immediate use
                signed_url: signedUrl,
              };
            })
          )
        : undefined;

      return {
        ...msg,
        sent_at: new Date(msg.sent_at),
        read_at: msg.read_at ? new Date(msg.read_at) : null,
        edited_at: msg.edited_at ? new Date(msg.edited_at) : null,
        deleted_at: msg.deleted_at ? new Date(msg.deleted_at) : null,
        created_at: new Date(msg.created_at),
        attachments: attachmentsWithUrls,
        reactions: msg.reactions?.map((react: any) => ({
          ...react,
          created_at: new Date(react.created_at),
        })),
        parent_message: msg.parent_message && !Array.isArray(msg.parent_message) && msg.parent_message.id
          ? {
              ...msg.parent_message,
              sent_at: new Date(msg.parent_message.sent_at),
            }
          : null,
      };
    })
  );

  return messages;
};

// ================================================
// SEND MESSAGE (ATOMIC FLOW)
// ================================================

type SendMessageOptions = {
  conversationId: string;
  content?: string;
  messageType?: MessageType;
  parentMessageId?: string;
  attachmentCount?: number;
  /**
   * Client-provided message ID (UUID v4).
   * This becomes the real message ID in the database.
   * Enables instant deduplication: optimistic ID = real ID.
   */
  messageId: string;
  /**
   * Idempotency key to prevent duplicate messages on retry.
   * Format: {senderId}-{timestamp}-{random}
   */
  idempotencyKey: string;
};

/**
 * Send a message with client-provided ID for atomic deduplication.
 * 
 * The flow is:
 * 1. Client generates messageId + idempotencyKey
 * 2. Creates optimistic message with same ID
 * 3. Sends to API with that ID
 * 4. API uses the provided ID (no ID mismatch)
 * 
 * For messages with attachments:
 * 1. Message is created with attachments_ready=false
 * 2. Attachments are uploaded with the messageId
 * 3. When all attachments complete, message is marked ready
 * 4. Database trigger broadcasts the complete message
 */
export const sendMessage = async ({
  conversationId,
  content,
  messageType = 'text',
  parentMessageId,
  attachmentCount,
  messageId,
  idempotencyKey,
}: SendMessageOptions): Promise<Message> => {
  const response = await apiFetch<{ data: { message: any } }>(
    '/coach/messaging/messages',
    {
      method: 'POST',
      body: {
        conversationId,
        content,
        messageType,
        parentMessageId,
        attachmentCount,
        messageId,
        idempotencyKey,
      },
    }
  );

  const msg = response.data.message;

  return {
    ...msg,
    sent_at: new Date(msg.sent_at),
    read_at: msg.read_at ? new Date(msg.read_at) : null,
    edited_at: msg.edited_at ? new Date(msg.edited_at) : null,
    deleted_at: msg.deleted_at ? new Date(msg.deleted_at) : null,
    created_at: new Date(msg.created_at),
  };
};

/**
 * Mark message as ready after all attachments are uploaded.
 * This triggers the realtime broadcast with complete data.
 */
export const markMessageReady = async (messageId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/messages/${messageId}/ready`, {
    method: 'POST',
  });
};

// ================================================
// REACTIONS
// ================================================

export const addReaction = async (
  messageId: string,
  conversationId: string,
  reaction: ReactionEmoji,
): Promise<MessageReaction> => {
  const response = await apiFetch<{ data: { reaction: any } }>(
    '/coach/messaging/reactions',
    {
      method: 'POST',
      body: {
        messageId,
        conversationId,
        reaction,
      },
    }
  );

  const react = response.data.reaction;

  return {
    ...react,
    created_at: new Date(react.created_at),
  };
};

export const removeReaction = async (messageId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/reactions/${messageId}`, {
    method: 'DELETE',
  });
};

// ================================================
// READ RECEIPTS
// ================================================

export const markConversationAsRead = async (conversationId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/conversations/${conversationId}/read`, {
    method: 'POST',
  });
};

// ================================================
// CONVERSATION MANAGEMENT
// ================================================

export const archiveConversation = async (conversationId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/conversations/${conversationId}/archive`, {
    method: 'POST',
  });
};

export const unarchiveConversation = async (conversationId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/conversations/${conversationId}/unarchive`, {
    method: 'POST',
  });
};

export const pinConversation = async (conversationId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/conversations/${conversationId}/pin`, {
    method: 'POST',
  });
};

export const unpinConversation = async (conversationId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/conversations/${conversationId}/unpin`, {
    method: 'POST',
  });
};

export const muteConversation = async (conversationId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/conversations/${conversationId}/mute`, {
    method: 'POST',
  });
};

export const unmuteConversation = async (conversationId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/conversations/${conversationId}/unmute`, {
    method: 'POST',
  });
};

// ================================================
// DELETE MESSAGE
// ================================================

export const deleteMessage = async (messageId: string): Promise<void> => {
  await apiFetch(`/coach/messaging/messages/${messageId}`, {
    method: 'DELETE',
  });
};

// ================================================
// BROADCAST MESSAGE
// ================================================

/**
 * Broadcast a message to multiple clients.
 * Creates a separate message in each client's conversation.
 */
export const broadcastMessage = async (
  data: BroadcastMessageData
): Promise<BroadcastResult> => {
  const response = await apiFetch<{ data: BroadcastResult }>(
    '/coach/messaging/broadcast',
    {
      method: 'POST',
      body: { ...data },
    }
  );
  return response.data;
};
