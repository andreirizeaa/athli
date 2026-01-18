/**
 * Supabase Realtime Hooks for Messaging System (Web)
 * Implements WhatsApp-like realtime messaging with optimistic updates
 *
 * Uses broadcast events (not postgres_changes) for better scalability.
 * CRITICAL: Calls setAuth() before subscribing to private channels.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { createClient } from '@/supabase/client';
import { prefetchAttachmentUrls } from '@/lib/messaging/attachment-url';
import type {
  Message,
  MessageReaction,
  ReadReceipt,
  Conversation,
  OptimisticMessage,
  MessageStatus,
} from '@athli/shared-types';
import {
  deduplicateMessages,
  calculateMessageStatus,
  transformMessages,
  type UIMessage,
} from '@athli/shared-types';

// ================================================
// MESSAGE DEDUPLICATION & MERGING
// ================================================

/**
 * Merges three message sources with deduplication and transforms to UIMessage:
 * 1. Saved messages (from database)
 * 2. Realtime messages (from Supabase broadcast subscription)
 * 3. Optimistic messages (just sent, not confirmed yet)
 *
 * Returns UIMessages with computed fields (text, isSent, isRead) for rendering.
 */
export const useMessageMerging = (
  savedMessages: Message[],
  realtimeMessages: Message[],
  optimisticMessages: OptimisticMessage[],
  currentUserId: string | null,
): UIMessage[] => {
  return useMemo(() => {
    if (!currentUserId) return [];

    const allMessages = deduplicateMessages(
      savedMessages,
      realtimeMessages,
      optimisticMessages,
    );

    return transformMessages(allMessages, currentUserId);
  }, [savedMessages, realtimeMessages, optimisticMessages, currentUserId]);
};

// ================================================
// REALTIME MESSAGES SUBSCRIPTION (BROADCAST)
// ================================================

type RealtimeMessagesOptions = {
  conversationId: string;
  userId?: string;
  /**
   * Called when a new message INSERT is received.
   * Return `true` to skip adding this message to realtimeMessages state.
   * This is useful for optimistic updates where we want to keep showing
   * the optimistic message instead of the real one until it has attachments.
   */
  shouldSkipInsert?: (message: Message) => boolean;
  onMessageReceived?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
};

/**
 * Helper to convert broadcast payload to Message with proper types
 * Now includes attachments and reactions arrays from the enhanced trigger
 */
function convertBroadcastToMessage(payload: Record<string, unknown>): Message {
  // Convert attachments array (now included in broadcast payload)
  const attachments = (payload.attachments as any[] | null)?.map((att) => ({
    ...att,
    created_at: att.created_at ? new Date(att.created_at) : new Date(),
  })) || [];

  // Convert reactions array (now included in broadcast payload)
  const reactions = (payload.reactions as any[] | null)?.map((r) => ({
    ...r,
    created_at: r.created_at ? new Date(r.created_at) : new Date(),
  })) || [];

  return {
    ...payload,
    sent_at: payload.sent_at ? new Date(payload.sent_at as string) : new Date(),
    read_at: payload.read_at ? new Date(payload.read_at as string) : null,
    edited_at: payload.edited_at ? new Date(payload.edited_at as string) : null,
    deleted_at: payload.deleted_at
      ? new Date(payload.deleted_at as string)
      : null,
    created_at: payload.created_at
      ? new Date(payload.created_at as string)
      : new Date(),
    attachment_count: (payload.attachment_count as number) || 0,
    attachments,
    reactions,
  } as Message;
}

/**
 * Check if message has all expected attachments
 */
function hasAllAttachments(message: Message): boolean {
  const expectedCount = (message as any).attachment_count || 0;
  const actualCount = message.attachments?.length || 0;
  return actualCount >= expectedCount;
}

/**
 * Subscribe to realtime message updates for a conversation using broadcast events.
 *
 * CRITICAL: Calls setAuth() before subscribing to ensure private channels work.
 * Uses broadcast events (triggered by database triggers) instead of postgres_changes
 * for better scalability.
 */
export const useRealtimeMessages = ({
  conversationId,
  userId,
  shouldSkipInsert,
  onMessageReceived,
  onMessageUpdated,
  onMessageDeleted,
}: RealtimeMessagesOptions) => {
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Use refs to store callbacks to avoid re-subscribing on every render
  const shouldSkipInsertRef = useRef(shouldSkipInsert);
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onMessageDeletedRef = useRef(onMessageDeleted);

  // Update refs when callbacks change
  useEffect(() => {
    shouldSkipInsertRef.current = shouldSkipInsert;
    onMessageReceivedRef.current = onMessageReceived;
    onMessageUpdatedRef.current = onMessageUpdated;
    onMessageDeletedRef.current = onMessageDeleted;
  }, [shouldSkipInsert, onMessageReceived, onMessageUpdated, onMessageDeleted]);

  useEffect(() => {
    if (!conversationId) return;

    // Clear old realtime messages when conversation changes
    setRealtimeMessages([]);

    let isCancelled = false;
    const supabase = createClient();

    // CRITICAL: Set auth token before subscribing to private channels
    supabase.realtime.setAuth().then(() => {
      if (isCancelled) return;

      // Create private channel matching the database trigger topic format
      // Include presence config with userId for proper authorization
      const newChannel = supabase.channel(
        `conversation:${conversationId}:messages`,
        {
          config: {
            private: true,
            presence: userId ? { key: userId } : undefined,
          },
        },
      );

      // Subscribe to broadcast events from database trigger
      newChannel
        .on('broadcast', { event: 'message_change' }, (payload) => {
          const data = payload.payload as Record<string, unknown>;
          const eventType = data.type as string;

          if (eventType === 'INSERT') {
            const message = convertBroadcastToMessage(data);
            const hasAttachments = message.attachments && message.attachments.length > 0;

            // Check if we should skip adding this message to state
            // (e.g., when we have an optimistic message with attachments that should take priority)
            const shouldSkip = shouldSkipInsertRef.current?.(message) ?? false;

            // Add message immediately - UI will show loading placeholders for missing attachments
            if (!shouldSkip) {
              if (hasAttachments && message.attachments) {
                // Prefetch URLs for any existing attachments
                prefetchAttachmentUrls(message.attachments).then(() => {
                  setRealtimeMessages((prev) => [...prev, message]);
                });
              } else {
                setRealtimeMessages((prev) => [...prev, message]);
              }
            }

            // Always call the callback (for other cleanup like removing text-only optimistic messages)
            onMessageReceivedRef.current?.(message);
          } else if (eventType === 'UPDATE') {
            const message = convertBroadcastToMessage(data);

            // If message is soft-deleted, remove it from realtime state (same as DELETE)
            // Check both the converted message and raw payload for is_deleted
            const isDeleted = message.is_deleted === true || data.is_deleted === true;
            if (isDeleted) {
              setRealtimeMessages((prev) =>
                prev.filter((m) => m.id !== message.id),
              );
              onMessageUpdatedRef.current?.(message);
              return;
            }

            const hasAttachments = message.attachments && message.attachments.length > 0;

            // Update message with new attachments - UI will update loading placeholders
            const addOrUpdateMessage = () => {
              setRealtimeMessages((prev) => {
                const exists = prev.some((m) => m.id === message.id);
                if (exists) {
                  return prev.map((m) => (m.id === message.id ? message : m));
                } else {
                  // Message wasn't added on INSERT - add it now
                  return [...prev, message];
                }
              });
              onMessageUpdatedRef.current?.(message);
            };

            if (hasAttachments && message.attachments) {
              // Prefetch URLs first, then update state
              prefetchAttachmentUrls(message.attachments).then(addOrUpdateMessage);
            } else {
              addOrUpdateMessage();
            }
          } else if (eventType === 'DELETE') {
            const deletedId = data.id as string;
            setRealtimeMessages((prev) =>
              prev.filter((m) => m.id !== deletedId),
            );
            onMessageDeletedRef.current?.(deletedId);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true);
          }
        });

      setChannel(newChannel);
    });

    return () => {
      isCancelled = true;
      if (channel) {
        channel.unsubscribe();
      }
      setIsSubscribed(false);
    };
  }, [conversationId, userId]); // Re-subscribe when conversationId or userId changes

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

    const supabase = createClient();
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
      .subscribe();

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

    const supabase = createClient();
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
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [conversationId]); // Only re-subscribe when conversationId changes

  return { reactions, channel };
};

// ================================================
// AUTO-SYNC READ RECEIPT (WEB VERSION)
// ================================================

type SyncReadReceiptOptions = {
  conversationId: string;
  userId: string;
  enabled?: boolean; // Enable/disable syncing
  latestMessageId?: string; // Optional: pass latest message ID to avoid querying
};

/**
 * Automatically update read receipt when page is visible
 * Uses Page Visibility API instead of React Navigation's useIsFocused
 * Debounced to avoid excessive updates
 */
export const useSyncReadReceipt = ({
  conversationId,
  userId,
  enabled = true,
  latestMessageId,
}: SyncReadReceiptOptions) => {
  const isSyncingRef = useRef(false);
  const [isVisible, setIsVisible] = useState(!document.hidden);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const syncReadReceipt = useCallback(async () => {
    // Validate required fields
    if (!enabled || isSyncingRef.current || !conversationId || !userId) return;

    // Skip if latestMessageId is an optimistic message (temp-xxx)
    if (latestMessageId?.startsWith('temp-')) return;

    isSyncingRef.current = true;

    try {
      const supabase = createClient();

      let messageIdToMark: string | undefined = latestMessageId;

      // If latestMessageId not provided, query for latest message
      if (!messageIdToMark) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, sent_at')
          .eq('conversation_id', conversationId)
          .order('sent_at', { ascending: false })
          .limit(1);

        if (messagesError) throw messagesError;
        if (!messages || messages.length === 0) {
          isSyncingRef.current = false;
          return;
        }

        messageIdToMark = messages[0].id;
      }

      // Update read receipt with explicit conflict handling
      const { error: receiptError } = await supabase
        .from('message_read_receipts')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: userId,
            last_read_message_id: messageIdToMark,
            last_read_at: new Date().toISOString(),
          },
          {
            onConflict: 'conversation_id,user_id',
            ignoreDuplicates: false,
          }
        );

      if (receiptError) throw receiptError;
    } catch {
      // Silently handle sync errors - not critical
    } finally {
      isSyncingRef.current = false;
    }
  }, [conversationId, userId, enabled, latestMessageId]);

  useEffect(() => {
    if (!isVisible || !enabled) return;

    // Debounce: update read receipt after 2s of page visibility
    const timer = setTimeout(() => {
      syncReadReceipt();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isVisible, enabled, syncReadReceipt]);

  return { syncReadReceipt, isSyncing: isSyncingRef.current };
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

    const supabase = createClient();
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
      .subscribe();

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
