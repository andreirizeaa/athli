/**
 * Supabase Realtime Hooks for Messaging System
 * Implements WhatsApp-like realtime messaging with optimistic updates
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type {
  Message,
  MessageReaction,
  ReadReceipt,
  Conversation,
  OptimisticMessage,
  MessageStatus,
} from '@/types/chat';
import {
  deduplicateMessages,
  calculateMessageStatus,
} from '@athli/shared-types';

// ================================================
// MESSAGE DEDUPLICATION & MERGING
// ================================================

/**
 * Merges three message sources with deduplication:
 * 1. Saved messages (from database)
 * 2. Realtime messages (from Supabase subscription)
 * 3. Optimistic messages (just sent, not confirmed yet)
 *
 * Uses shared deduplicateMessages utility from @athli/shared-types
 */
export const useMessageMerging = (
  savedMessages: Message[],
  realtimeMessages: Message[],
  optimisticMessages: OptimisticMessage[],
) => {
  const allMessages = useMemo(
    () => deduplicateMessages(savedMessages, realtimeMessages, optimisticMessages),
    [savedMessages, realtimeMessages, optimisticMessages],
  );

  return allMessages;
};

// ================================================
// REALTIME MESSAGES SUBSCRIPTION
// ================================================

type RealtimeMessagesOptions = {
  conversationId: string;
  onMessageReceived?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
};

/**
 * Subscribe to realtime message updates for a conversation
 */
export const useRealtimeMessages = ({
  conversationId,
  onMessageReceived,
  onMessageUpdated,
  onMessageDeleted,
}: RealtimeMessagesOptions) => {
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Use refs to store callbacks to avoid re-subscribing on every render
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onMessageDeletedRef = useRef(onMessageDeleted);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
    onMessageUpdatedRef.current = onMessageUpdated;
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageReceived, onMessageUpdated, onMessageDeleted]);

  useEffect(() => {
    if (!conversationId) return;

    // Create private channel for this conversation
    const newChannel = supabase.channel(`conversation:${conversationId}`, {
      config: {
        private: true, // Requires RLS policies
      },
    });

    // Subscribe to INSERT events (new messages)
    newChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMessage = payload.new as Message;

          // Convert timestamps to Date objects
          const message: Message = {
            ...newMessage,
            sent_at: new Date(newMessage.sent_at),
            read_at: newMessage.read_at ? new Date(newMessage.read_at) : null,
            edited_at: newMessage.edited_at
              ? new Date(newMessage.edited_at)
              : null,
            deleted_at: newMessage.deleted_at
              ? new Date(newMessage.deleted_at)
              : null,
            created_at: new Date(newMessage.created_at),
          };

          setRealtimeMessages((prev) => [...prev, message]);
          onMessageReceivedRef.current?.(message);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const updatedMessage = payload.new as Message;

          // Convert timestamps to Date objects
          const message: Message = {
            ...updatedMessage,
            sent_at: new Date(updatedMessage.sent_at),
            read_at: updatedMessage.read_at
              ? new Date(updatedMessage.read_at)
              : null,
            edited_at: updatedMessage.edited_at
              ? new Date(updatedMessage.edited_at)
              : null,
            deleted_at: updatedMessage.deleted_at
              ? new Date(updatedMessage.deleted_at)
              : null,
            created_at: new Date(updatedMessage.created_at),
          };

          setRealtimeMessages((prev) =>
            prev.map((m) => (m.id === message.id ? message : m)),
          );
          onMessageUpdatedRef.current?.(message);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const deletedMessageId = payload.old.id;
          setRealtimeMessages((prev) =>
            prev.filter((m) => m.id !== deletedMessageId),
          );
          onMessageDeletedRef.current?.(deletedMessageId);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          console.log('[Realtime] Subscribed to conversation:', conversationId);
        }
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
      setIsSubscribed(false);
      console.log('[Realtime] Unsubscribed from conversation:', conversationId);
    };
  }, [conversationId]); // Only re-subscribe when conversationId changes

  return { realtimeMessages, isSubscribed, channel };
};

// ================================================
// REALTIME READ RECEIPTS SUBSCRIPTION
// ================================================

type RealtimeReadReceiptsOptions = {
  conversationId: string;
  onReadReceiptUpdated?: (receipt: ReadReceipt) => void;
};

/**
 * Subscribe to realtime read receipt updates for a conversation
 */
export const useRealtimeReadReceipts = ({
  conversationId,
  onReadReceiptUpdated,
}: RealtimeReadReceiptsOptions) => {
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Use ref to store callback
  const callbackRef = useRef(onReadReceiptUpdated);

  useEffect(() => {
    callbackRef.current = onReadReceiptUpdated;
  }, [onReadReceiptUpdated]);

  useEffect(() => {
    if (!conversationId) return;

    const newChannel = supabase.channel(`receipts:${conversationId}`);

    newChannel
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT or UPDATE
          schema: 'public',
          table: 'message_read_receipts',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<ReadReceipt>) => {
          const receipt = payload.new as ReadReceipt;

          // Convert timestamps to Date objects
          const readReceipt: ReadReceipt = {
            ...receipt,
            last_read_at: new Date(receipt.last_read_at),
            updated_at: new Date(receipt.updated_at),
          };

          setReadReceipts((prev) => {
            const existing = prev.find((r) => r.user_id === readReceipt.user_id);
            if (existing) {
              return prev.map((r) =>
                r.user_id === readReceipt.user_id ? readReceipt : r,
              );
            }
            return [...prev, readReceipt];
          });

          callbackRef.current?.(readReceipt);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to read receipts:', conversationId);
        }
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [conversationId]); // Only re-subscribe when conversationId changes

  return { readReceipts, channel };
};

// ================================================
// REALTIME REACTIONS SUBSCRIPTION
// ================================================

type RealtimeReactionsOptions = {
  conversationId: string;
  onReactionAdded?: (reaction: MessageReaction) => void;
  onReactionRemoved?: (reactionId: string) => void;
};

/**
 * Subscribe to realtime reaction updates for a conversation
 */
export const useRealtimeReactions = ({
  conversationId,
  onReactionAdded,
  onReactionRemoved,
}: RealtimeReactionsOptions) => {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Use refs to store callbacks
  const onReactionAddedRef = useRef(onReactionAdded);
  const onReactionRemovedRef = useRef(onReactionRemoved);

  useEffect(() => {
    onReactionAddedRef.current = onReactionAdded;
    onReactionRemovedRef.current = onReactionRemoved;
  }, [onReactionAdded, onReactionRemoved]);

  useEffect(() => {
    if (!conversationId) return;

    const newChannel = supabase.channel(`reactions:${conversationId}`);

    newChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessageReaction>) => {
          const reaction = payload.new as MessageReaction;

          // Convert timestamp to Date object
          const messageReaction: MessageReaction = {
            ...reaction,
            created_at: new Date(reaction.created_at),
          };

          setReactions((prev) => [...prev, messageReaction]);
          onReactionAddedRef.current?.(messageReaction);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessageReaction>) => {
          const deletedReactionId = payload.old.id;
          setReactions((prev) =>
            prev.filter((r) => r.id !== deletedReactionId),
          );
          onReactionRemovedRef.current?.(deletedReactionId);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to reactions:', conversationId);
        }
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [conversationId]); // Only re-subscribe when conversationId changes

  return { reactions, channel };
};

// ================================================
// AUTO-SYNC READ RECEIPT ON SCREEN FOCUS
// ================================================

type SyncReadReceiptOptions = {
  conversationId: string;
  userId: string;
  enabled?: boolean; // Enable/disable syncing
};

/**
 * Automatically update read receipt when screen is focused
 * Debounced to avoid excessive updates
 */
export const useSyncReadReceipt = ({
  conversationId,
  userId,
  enabled = true,
}: SyncReadReceiptOptions) => {
  const isFocused = useIsFocused();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncReadReceipt = useCallback(async () => {
    if (!enabled || isSyncing) return;

    setIsSyncing(true);

    try {
      // Get latest message in conversation
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, sent_at')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .limit(1);

      if (messagesError) throw messagesError;
      if (!messages || messages.length === 0) {
        setIsSyncing(false);
        return;
      }

      const latestMessage = messages[0];

      // Update read receipt
      const { error: receiptError } = await supabase
        .from('message_read_receipts')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: userId,
            last_read_message_id: latestMessage.id,
            last_read_at: new Date().toISOString(),
          },
          {
            onConflict: 'conversation_id,user_id',
          },
        );

      if (receiptError) throw receiptError;

      console.log('[ReadReceipt] Synced for conversation:', conversationId);
    } catch (error) {
      console.error('[ReadReceipt] Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [conversationId, userId, enabled, isSyncing]);

  useEffect(() => {
    if (!isFocused || !enabled) return;

    // Debounce: update read receipt after 500ms of screen focus
    const timer = setTimeout(() => {
      syncReadReceipt();
    }, 500);

    return () => clearTimeout(timer);
  }, [isFocused, enabled, syncReadReceipt]);

  return { syncReadReceipt, isSyncing };
};

// ================================================
// CONVERSATION LIST REALTIME
// ================================================

type RealtimeConversationsOptions = {
  userId: string;
  onConversationUpdated?: (conversation: Conversation) => void;
};

/**
 * Subscribe to realtime conversation list updates
 */
export const useRealtimeConversations = ({
  userId,
  onConversationUpdated,
}: RealtimeConversationsOptions) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Use ref to store callback to avoid re-subscribing on every render
  const callbackRef = useRef(onConversationUpdated);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = onConversationUpdated;
  }, [onConversationUpdated]);

  useEffect(() => {
    if (!userId) return;

    const newChannel = supabase.channel(`conversations:${userId}`);

    newChannel
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT or UPDATE
          schema: 'public',
          table: 'conversations',
          // Filter for conversations where user is the coach
          filter: `coach_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          const conversation = payload.new as Conversation;

          // Convert timestamps to Date objects
          const conv: Conversation = {
            ...conversation,
            last_message_at: conversation.last_message_at
              ? new Date(conversation.last_message_at)
              : null,
            created_at: new Date(conversation.created_at),
            updated_at: new Date(conversation.updated_at),
          };

          setConversations((prev) => {
            const existing = prev.find((c) => c.id === conv.id);
            if (existing) {
              return prev.map((c) => (c.id === conv.id ? conv : c));
            }
            return [...prev, conv];
          });

          callbackRef.current?.(conv);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          // Also filter for conversations where user is the client
          filter: `client_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          const conversation = payload.new as Conversation;

          // Convert timestamps to Date objects
          const conv: Conversation = {
            ...conversation,
            last_message_at: conversation.last_message_at
              ? new Date(conversation.last_message_at)
              : null,
            created_at: new Date(conversation.created_at),
            updated_at: new Date(conversation.updated_at),
          };

          setConversations((prev) => {
            const existing = prev.find((c) => c.id === conv.id);
            if (existing) {
              return prev.map((c) => (c.id === conv.id ? conv : c));
            }
            return [...prev, conv];
          });

          callbackRef.current?.(conv);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to conversations for user:', userId);
        }
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [userId]); // Only re-subscribe when userId changes

  return { conversations, channel };
};

// ================================================
// CALCULATE MESSAGE STATUS FOR UI
// ================================================

/**
 * Calculate the display status for a message based on read receipts
 * Uses shared calculateMessageStatus utility from @athli/shared-types
 */
export const useMessageStatus = (
  message: Message,
  readReceipts: ReadReceipt[],
  currentUserId: string,
): MessageStatus => {
  return calculateMessageStatus(message, readReceipts, currentUserId);
};
