/**
 * Messaging API Client for Web App
 * Calls backend API endpoints instead of direct Supabase access
 */

import axios from '@/lib/axios';
import type {
  Conversation,
  Message,
  MessageReaction,
  MessageType,
  ReactionEmoji,
} from '@athli/shared-types';

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
  const response = await axios.get('/api/v1/coach/messaging/conversations', {
    params: {
      includeArchived,
      limit,
    },
  });

  return response.data.data.conversations;
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
  const response = await axios.get(
    `/api/v1/coach/messaging/conversations/${conversationId}/messages`,
    {
      params: {
        limit,
        offset,
        beforeTimestamp: beforeTimestamp?.toISOString(),
      },
    },
  );

  // Convert string dates to Date objects
  const messages = response.data.data.messages.map((msg: any) => ({
    ...msg,
    sent_at: new Date(msg.sent_at),
    read_at: msg.read_at ? new Date(msg.read_at) : null,
    edited_at: msg.edited_at ? new Date(msg.edited_at) : null,
    deleted_at: msg.deleted_at ? new Date(msg.deleted_at) : null,
    created_at: new Date(msg.created_at),
    attachments: msg.attachments?.map((att: any) => ({
      ...att,
      created_at: new Date(att.created_at),
    })),
    reactions: msg.reactions?.map((react: any) => ({
      ...react,
      created_at: new Date(react.created_at),
    })),
    parent_message: msg.parent_message
      ? {
          ...msg.parent_message,
          sent_at: new Date(msg.parent_message.sent_at),
        }
      : null,
  }));

  return messages;
};

// ================================================
// SEND MESSAGE
// ================================================

type SendMessageOptions = {
  conversationId: string;
  content?: string;
  messageType?: MessageType;
  parentMessageId?: string;
};

export const sendMessage = async ({
  conversationId,
  content,
  messageType = 'text',
  parentMessageId,
}: SendMessageOptions): Promise<Message> => {
  const response = await axios.post('/api/v1/coach/messaging/messages', {
    conversationId,
    content,
    messageType,
    parentMessageId,
  });

  const msg = response.data.data.message;

  return {
    ...msg,
    sent_at: new Date(msg.sent_at),
    read_at: msg.read_at ? new Date(msg.read_at) : null,
    edited_at: msg.edited_at ? new Date(msg.edited_at) : null,
    deleted_at: msg.deleted_at ? new Date(msg.deleted_at) : null,
    created_at: new Date(msg.created_at),
  };
};

// ================================================
// REACTIONS
// ================================================

export const addReaction = async (
  messageId: string,
  conversationId: string,
  reaction: ReactionEmoji,
): Promise<MessageReaction> => {
  const response = await axios.post('/api/v1/coach/messaging/reactions', {
    messageId,
    conversationId,
    reaction,
  });

  const react = response.data.data.reaction;

  return {
    ...react,
    created_at: new Date(react.created_at),
  };
};

export const removeReaction = async (messageId: string): Promise<void> => {
  await axios.delete(`/api/v1/coach/messaging/reactions/${messageId}`);
};

// ================================================
// READ RECEIPTS
// ================================================

export const markConversationAsRead = async (conversationId: string): Promise<void> => {
  await axios.post(`/api/v1/coach/messaging/conversations/${conversationId}/read`);
};

// ================================================
// CONVERSATION MANAGEMENT
// ================================================

export const archiveConversation = async (conversationId: string): Promise<void> => {
  await axios.post(`/api/v1/coach/messaging/conversations/${conversationId}/archive`);
};

export const unarchiveConversation = async (conversationId: string): Promise<void> => {
  await axios.post(`/api/v1/coach/messaging/conversations/${conversationId}/unarchive`);
};

export const pinConversation = async (conversationId: string): Promise<void> => {
  await axios.post(`/api/v1/coach/messaging/conversations/${conversationId}/pin`);
};

export const unpinConversation = async (conversationId: string): Promise<void> => {
  await axios.post(`/api/v1/coach/messaging/conversations/${conversationId}/unpin`);
};

export const muteConversation = async (conversationId: string): Promise<void> => {
  await axios.post(`/api/v1/coach/messaging/conversations/${conversationId}/mute`);
};

export const unmuteConversation = async (conversationId: string): Promise<void> => {
  await axios.post(`/api/v1/coach/messaging/conversations/${conversationId}/unmute`);
};

// ================================================
// DELETE MESSAGE
// ================================================

export const deleteMessage = async (messageId: string): Promise<void> => {
  await axios.delete(`/api/v1/coach/messaging/messages/${messageId}`);
};
