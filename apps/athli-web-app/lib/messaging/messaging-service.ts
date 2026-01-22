/**
 * Messaging Service - Unified Supabase Implementation (Web)
 * Handles all messaging operations for coaches
 * Ported from mobile app for consistency
 */

import { createClient } from '@/supabase/client';
import type {
  Conversation,
  Message,
  MessageReaction,
  MessageAttachment,
  ReadReceipt,
  ConversationParticipant,
  MessageType,
  ReactionEmoji,
  OptimisticMessage,
  MessageStatus,
} from '@athli/shared-types';

// Re-export types for use in components
export type {
  Conversation,
  Message,
  MessageReaction,
  MessageAttachment,
  ReadReceipt,
  ConversationParticipant,
  MessageType,
  ReactionEmoji,
  OptimisticMessage,
  MessageStatus,
} from '@athli/shared-types';

// ================================================
// CONVERSATION QUERIES
// ================================================

type GetConversationsOptions = {
  coachId: string;
  includeArchived?: boolean;
  limit?: number;
};

/**
 * Get all conversations for a coach
 * Returns conversations with computed fields (other_user_id, other_user_name, etc.)
 */
export const getConversations = async ({
  coachId,
  includeArchived = false,
  limit = 100,
}: GetConversationsOptions): Promise<Conversation[]> => {
  try {
    const supabase = createClient();

    // Query conversations where user is a participant (as coach or client)
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .or(`coach_id.eq.${coachId},client_id.eq.${coachId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (conversationsError) throw conversationsError;
    if (!conversations) return [];

    // Get participant settings
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('user_id', coachId);

    if (participantsError) throw participantsError;

    // Get read receipts for unread count
    const { data: readReceipts, error: receiptsError } = await supabase
      .from('message_read_receipts')
      .select('*')
      .eq('user_id', coachId);

    if (receiptsError) throw receiptsError;

    // Get other user IDs (client if user is coach, coach if user is client)
    const otherUserIds = conversations.map((conv) =>
      conv.coach_id === coachId ? conv.client_id : conv.coach_id,
    );

    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, name, profile_picture_url')
      .in('id', otherUserIds);

    if (profilesError) throw profilesError;

    // Transform and compute fields
    const result: Conversation[] = await Promise.all(
      conversations.map(async (conv) => {
        const isCoach = conv.coach_id === coachId;
        const otherUserId = isCoach ? conv.client_id : conv.coach_id;

        // Find participant settings
        const participantSettings = participants?.find(
          (p) => p.conversation_id === conv.id,
        );

        // Skip if archived (unless includeArchived is true)
        if (!includeArchived && participantSettings?.is_archived) {
          return null;
        }

        // Find other user's profile
        const otherProfile = profiles?.find((p) => p.id === otherUserId);

        // Calculate unread count
        const receipt = readReceipts?.find((r) => r.conversation_id === conv.id);
        const unreadCount = await getUnreadCount(conv.id, coachId, receipt);

        return {
          ...conv,
          last_message_at: conv.last_message_at
            ? new Date(conv.last_message_at)
            : null,
          created_at: new Date(conv.created_at),
          updated_at: new Date(conv.updated_at),
          other_user_id: otherUserId,
          other_user_name: otherProfile?.name || 'Unknown',
          other_user_avatar: otherProfile?.profile_picture_url,
          unread_count: unreadCount,
        } as Conversation;
      }),
    );

    // Filter out nulls (archived conversations when includeArchived=false)
    return result.filter((conv) => conv !== null) as Conversation[];
  } catch (error) {
    console.error('[MessagingService] Error getting conversations:', error);
    throw error;
  }
};

/**
 * Get archived conversations for a coach
 */
export const getArchivedConversations = async (
  coachId: string,
): Promise<Conversation[]> => {
  return getConversations({ coachId, includeArchived: true }).then((convs) =>
    convs.filter(async (conv) => {
      const supabase = createClient();
      const { data } = await supabase
        .from('conversation_participants')
        .select('is_archived')
        .eq('conversation_id', conv.id)
        .eq('user_id', coachId)
        .single();
      return data?.is_archived === true;
    }),
  );
};

/**
 * Calculate unread count for a conversation
 */
const getUnreadCount = async (
  conversationId: string,
  userId: string,
  receipt?: ReadReceipt,
): Promise<number> => {
  const supabase = createClient();

  if (!receipt || !receipt.last_read_at) {
    // No receipt = all messages are unread
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);

    return count || 0;
  }

  // Count messages sent after last read time
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .gte('sent_at', receipt.last_read_at.toISOString());

  return count || 0;
};

// ================================================
// MESSAGE QUERIES
// ================================================

type GetMessagesOptions = {
  conversationId: string;
  limit?: number;
  offset?: number;
  beforeTimestamp?: Date;
};

/**
 * Get messages for a conversation with pagination
 * Includes attachments, reactions, and parent message for replies
 */
export const getMessages = async ({
  conversationId,
  limit = 50,
  offset = 0,
  beforeTimestamp,
}: GetMessagesOptions): Promise<Message[]> => {
  try {
    const supabase = createClient();

    let query = supabase
      .from('messages')
      .select(
        `
        *,
        attachments:message_attachments(*),
        reactions:message_reactions(*),
        parent_message:messages!fk_msg_parent(id, content, message_type, sender_id, is_deleted, sent_at, attachments:message_attachments(*))
      `,
      )
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Optional: Load messages before a certain timestamp (for pagination)
    if (beforeTimestamp) {
      query = query.lt('sent_at', beforeTimestamp.toISOString());
    }

    const { data: messages, error } = await query;

    if (error) throw error;
    if (!messages) return [];

    // Transform messages with correct Date types
    return messages.map((msg) => ({
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
      parent_message: msg.parent_message && !Array.isArray(msg.parent_message) && msg.parent_message.id
        ? {
            ...msg.parent_message,
            sent_at: new Date(msg.parent_message.sent_at),
          }
        : null,
    })) as Message[];
  } catch (error) {
    console.error('[MessagingService] Error getting messages:', error);
    throw error;
  }
};

// ================================================
// SEND MESSAGE
// ================================================

type SendMessageOptions = {
  conversationId: string;
  senderId: string;
  content?: string;
  messageType?: MessageType;
  parentMessageId?: string;
};

/**
 * Send a text message
 * Returns the created message with optimistic ID replaced
 */
export const sendMessage = async ({
  conversationId,
  senderId,
  content,
  messageType = 'text',
  parentMessageId,
}: SendMessageOptions): Promise<Message> => {
  try {
    const supabase = createClient();

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
        parent_message_id: parentMessageId,
        status: 'sent',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...message,
      sent_at: new Date(message.sent_at),
      read_at: message.read_at ? new Date(message.read_at) : null,
      edited_at: message.edited_at ? new Date(message.edited_at) : null,
      deleted_at: message.deleted_at ? new Date(message.deleted_at) : null,
      created_at: new Date(message.created_at),
    } as Message;
  } catch (error) {
    console.error('[MessagingService] Error sending message:', error);
    throw error;
  }
};

/**
 * Create an optimistic message (for UI updates before server confirmation)
 * Re-exported from shared-types for convenience
 */
export { createOptimisticMessage } from '@athli/shared-types';

// ================================================
// MESSAGE ATTACHMENTS
// ================================================

/**
 * Will be implemented with file upload functionality
 * See use-file-upload.ts hook for implementation
 */
export const sendMessageWithAttachment = async (
  conversationId: string,
  senderId: string,
  attachmentFile: File,
  mimeType: string,
  caption?: string,
): Promise<{ message: Message; attachment: MessageAttachment }> => {
  // This will be implemented in the file upload section
  throw new Error('Not implemented yet - see file upload hook');
};

// ================================================
// MESSAGE REACTIONS
// ================================================

/**
 * Add a reaction to a message
 */
export const addReaction = async (
  messageId: string,
  conversationId: string,
  userId: string,
  reaction: ReactionEmoji,
): Promise<MessageReaction> => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('message_reactions')
      .upsert(
        {
          message_id: messageId,
          conversation_id: conversationId,
          user_id: userId,
          reaction,
        },
        {
          onConflict: 'message_id,user_id',
        },
      )
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      created_at: new Date(data.created_at),
    } as MessageReaction;
  } catch (error) {
    console.error('[MessagingService] Error adding reaction:', error);
    throw error;
  }
};

/**
 * Remove a reaction from a message
 */
export const removeReaction = async (
  messageId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error removing reaction:', error);
    throw error;
  }
};

// ================================================
// READ RECEIPTS
// ================================================

/**
 * Mark all messages in a conversation as read
 */
export const markConversationAsRead = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    // Get latest message in conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sent_at')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(1);

    if (messagesError) throw messagesError;
    if (!messages || messages.length === 0) return;

    const latestMessage = messages[0];

    // Update read receipt (Supabase auto-detects unique constraint)
    const { error: receiptError } = await supabase
      .from('message_read_receipts')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        last_read_message_id: latestMessage.id,
        last_read_at: new Date().toISOString(),
      });

    if (receiptError) throw receiptError;
  } catch (error) {
    console.error('[MessagingService] Error marking conversation as read:', error);
    throw error;
  }
};

/**
 * Mark all conversations as read
 */
export const markAllConversationsAsRead = async (
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    // Get all conversations for user
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`coach_id.eq.${userId},client_id.eq.${userId}`);

    if (convError) throw convError;
    if (!conversations) return;

    // Mark each conversation as read
    await Promise.all(
      conversations.map((conv) => markConversationAsRead(conv.id, userId)),
    );
  } catch (error) {
    console.error('[MessagingService] Error marking all as read:', error);
    throw error;
  }
};

// ================================================
// ARCHIVE / UNARCHIVE
// ================================================

/**
 * Archive a conversation
 */
export const archiveConversation = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error archiving conversation:', error);
    throw error;
  }
};

/**
 * Unarchive a conversation
 */
export const unarchiveConversation = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_archived: false,
        archived_at: null,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error unarchiving conversation:', error);
    throw error;
  }
};

/**
 * Unarchive all conversations
 */
export const unarchiveAllConversations = async (
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_archived: false,
        archived_at: null,
      })
      .eq('user_id', userId)
      .eq('is_archived', true);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error unarchiving all:', error);
    throw error;
  }
};

// ================================================
// DELETE MESSAGES / CONVERSATIONS
// ================================================

/**
 * Soft delete a message (for sender only)
 */
export const deleteMessage = async (
  messageId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by_sender: true,
      })
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error deleting message:', error);
    throw error;
  }
};

/**
 * Delete all messages in archived conversations
 */
export const deleteAllArchivedConversations = async (
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    // Get all archived conversations
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('is_archived', true);

    if (participantsError) throw participantsError;
    if (!participants) return;

    // Delete all conversations (CASCADE will handle messages)
    const conversationIds = participants.map((p) => p.conversation_id);
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);

    if (deleteError) throw deleteError;
  } catch (error) {
    console.error('[MessagingService] Error deleting archived conversations:', error);
    throw error;
  }
};

// ================================================
// PIN / MUTE
// ================================================

/**
 * Pin a conversation
 */
export const pinConversation = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_pinned: true,
        pinned_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error pinning conversation:', error);
    throw error;
  }
};

/**
 * Unpin a conversation
 */
export const unpinConversation = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error} = await supabase
      .from('conversation_participants')
      .update({
        is_pinned: false,
        pinned_at: null,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error unpinning conversation:', error);
    throw error;
  }
};

/**
 * Mute a conversation
 */
export const muteConversation = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_muted: true,
        muted_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error muting conversation:', error);
    throw error;
  }
};

/**
 * Unmute a conversation
 */
export const unmuteConversation = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_muted: false,
        muted_at: null,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[MessagingService] Error unmuting conversation:', error);
    throw error;
  }
};
