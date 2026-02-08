/**
 * Supabase Realtime Hooks for Messaging System
 * Implements WhatsApp-like realtime messaging with optimistic updates
 *
 * Uses broadcast events (not postgres_changes) for better scalability.
 * CRITICAL: Calls setAuth() before subscribing to private channels.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { prefetchAttachmentUrls } from '@/lib/attachment-url';
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
  currentRole?: 'coach' | 'client',
): UIMessage[] => {
  return useMemo(() => {
    if (!currentUserId) return [];

    const allMessages = deduplicateMessages(
      savedMessages,
      realtimeMessages,
      optimisticMessages,
    );

    return transformMessages(allMessages, currentUserId, currentRole);
  }, [savedMessages, realtimeMessages, optimisticMessages, currentUserId, currentRole]);
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
   * the optimistic message instead of the real one until confirmed.
   * 
   * With client-provided IDs, simply check if the message ID matches an optimistic ID.
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

  // Remove a message from realtime state (used when refetch will provide complete data)
  const removeRealtimeMessage = (messageId: string) => {
    setRealtimeMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  useEffect(() => {
    if (!conversationId) return;

    // Clear old realtime messages when conversation changes
    setRealtimeMessages([]);

    let isCancelled = false;

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
            // (e.g., when we have an optimistic message with the same ID)
            const shouldSkip = shouldSkipInsertRef.current?.(message) ?? false;

            if (!shouldSkip) {
              // Add message IMMEDIATELY - UI will show loading skeletons based on attachment_count
              setRealtimeMessages((prev) => [...prev, message]);

              // Then prefetch URLs in background - UI will update when URLs are in cache
              if (hasAttachments && message.attachments) {
                prefetchAttachmentUrls(message.attachments).then(() => {
                  // Force re-render after prefetch completes
                  setRealtimeMessages((prev) =>
                    prev.map((m) => (m.id === message.id ? { ...message } : m))
                  );
                });
              }
            }

            // Always call the callback (for other processing)
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

            // Check if message already exists in state
            setRealtimeMessages((prev) => {
              const existingIndex = prev.findIndex((m) => m.id === message.id);

              if (existingIndex === -1) {
                // Message doesn't exist - this is first broadcast (INSERT was missed)
                // Add message immediately - UI will show loading skeletons based on attachment_count vs actual attachments

                // Start prefetching in background for existing attachments
                if (hasAttachments && message.attachments) {
                  prefetchAttachmentUrls(message.attachments).then(() => {
                    // Force re-render after prefetch completes (URLs now in cache)
                    setRealtimeMessages((currentPrev) =>
                      currentPrev.map((m) =>
                        m.id === message.id ? { ...message } : m
                      )
                    );
                    onMessageUpdatedRef.current?.(message);
                  });
                }

                onMessageReceivedRef.current?.(message);
                return [...prev, message];
              } else {
                // Message exists - update it with new attachment data
                if (hasAttachments && message.attachments) {
                  // Prefetch URLs then update
                  prefetchAttachmentUrls(message.attachments).then(() => {
                    setRealtimeMessages((currentPrev) =>
                      currentPrev.map((m) =>
                        m.id === message.id ? { ...message } : m
                      )
                    );
                    onMessageUpdatedRef.current?.(message);
                  });
                }
                // Update message immediately to show any new attachments
                onMessageUpdatedRef.current?.(message);
                return prev.map((m) => (m.id === message.id ? message : m));
              }
            });
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

  return { realtimeMessages, isSubscribed, channel, removeRealtimeMessage };
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

  // Fetch initial read receipts when conversation changes
  useEffect(() => {
    if (!conversationId) return;

    const fetchInitialReceipts = async () => {
      try {
        const { data, error } = await supabase
          .from('message_read_receipts')
          .select('*')
          .eq('conversation_id', conversationId);

        if (error) {
          console.error('[useRealtimeReadReceipts] Error fetching initial receipts:', error);
          return;
        }

        if (data && data.length > 0) {
          const receipts: ReadReceipt[] = data.map((r) => ({
            ...r,
            last_read_at: new Date(r.last_read_at),
            updated_at: new Date(r.updated_at),
          }));
          setReadReceipts(receipts);
        }
      } catch (error) {
        console.error('[useRealtimeReadReceipts] Error fetching initial receipts:', error);
      }
    };

    fetchInitialReceipts();
  }, [conversationId]);

  // Subscribe to realtime updates
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
          const oldReaction = payload.old as MessageReaction | undefined;
          const deletedReactionId = oldReaction?.id;
          if (!deletedReactionId) return;
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
// AUTO-SYNC READ RECEIPT ON SCREEN FOCUS
// ================================================

type SyncReadReceiptOptions = {
  conversationId: string;
  userId: string;
  enabled?: boolean; // Enable/disable syncing
  messageCount?: number; // Pass message count to trigger re-sync when new messages arrive
};

/**
 * Automatically update read receipt when screen is focused or new messages arrive
 * Debounced to avoid excessive updates
 */
export const useSyncReadReceipt = ({
  conversationId,
  userId,
  enabled = true,
  messageCount = 0,
}: SyncReadReceiptOptions) => {
  const isFocused = useIsFocused();
  // Use ref to avoid infinite loop - isSyncing in deps would cause recreation
  const isSyncingRef = useRef(false);
  // Track last synced message count to avoid redundant syncs
  const lastSyncedMessageCountRef = useRef<number>(0);
  // Debounce timer ref
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncReadReceipt = useCallback(async (force = false) => {
    if (!enabled || isSyncingRef.current) return;
    // Skip if message count hasn't changed (unless forced)
    if (!force && messageCount === lastSyncedMessageCountRef.current && messageCount > 0) return;

    isSyncingRef.current = true;

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
        isSyncingRef.current = false;
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
      
      // Mark as synced for this message count
      lastSyncedMessageCountRef.current = messageCount;
    } catch (error) {
      // Silently handle sync errors - not critical
    } finally {
      isSyncingRef.current = false;
    }
  }, [conversationId, userId, enabled, messageCount]);

  // Reset last synced count when conversation changes
  useEffect(() => {
    lastSyncedMessageCountRef.current = 0;
  }, [conversationId]);

  // Sync on focus change or when message count changes
  useEffect(() => {
    if (!isFocused || !enabled || !conversationId || !userId) return;

    // Clear any pending timer
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    // Debounce: update read receipt after 300ms
    syncTimerRef.current = setTimeout(() => {
      syncReadReceipt();
    }, 300);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [isFocused, enabled, conversationId, userId, messageCount, syncReadReceipt]);

  return { syncReadReceipt };
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
 * 
 * IMPORTANT: Realtime postgres_changes only include raw table columns,
 * NOT joined data like other_user_name. The callback receives the RAW
 * realtime data - it's the caller's responsibility to merge with existing data.
 */
export const useRealtimeConversations = ({
  userId,
  onConversationUpdated,
}: RealtimeConversationsOptions) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Use ref to store callback to avoid re-subscribing on every render
  const callbackRef = useRef(onConversationUpdated);

  // Keep ref in sync
  useEffect(() => {
    callbackRef.current = onConversationUpdated;
  }, [onConversationUpdated]);

  useEffect(() => {
    if (!userId) return;

    const newChannel = supabase.channel(`conversations:${userId}`);

    // Helper to process conversation update
    const handleConversationUpdate = (payload: RealtimePostgresChangesPayload<Conversation>) => {
      const realtimeData = payload.new as Conversation;

      // Convert timestamps to Date objects
      const conv: Conversation = {
        ...realtimeData,
        last_message_at: realtimeData.last_message_at
          ? new Date(realtimeData.last_message_at)
          : null,
        created_at: new Date(realtimeData.created_at),
        updated_at: new Date(realtimeData.updated_at),
      };

      // Update internal state
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === conv.id);
        if (existing) {
          return prev.map((c) => (c.id === conv.id ? conv : c));
        }
        return [...prev, conv];
      });

      // Call callback with raw realtime data
      // Use setTimeout to avoid "cannot update during render" error
      setTimeout(() => {
        callbackRef.current?.(conv);
      }, 0);
    };

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
        handleConversationUpdate,
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
        handleConversationUpdate,
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
// REALTIME READ RECEIPTS FOR USER (All Conversations)
// ================================================

type RealtimeReadReceiptsForUserOptions = {
  userId: string;
  conversationIds: string[];
  onReadReceiptUpdated?: (receipt: ReadReceipt) => void;
};

/**
 * Subscribe to realtime read receipt updates for all conversations where user is a participant.
 * This is used by the chat list to update "read" status when the other party reads a message.
 */
export const useRealtimeReadReceiptsForUser = ({
  userId,
  conversationIds,
  onReadReceiptUpdated,
}: RealtimeReadReceiptsForUserOptions) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Use ref to store callback
  const callbackRef = useRef(onReadReceiptUpdated);

  useEffect(() => {
    callbackRef.current = onReadReceiptUpdated;
  }, [onReadReceiptUpdated]);

  // Create stable key for conversationIds to prevent unnecessary re-subscriptions
  const conversationIdsKey = useMemo(() => conversationIds.sort().join(','), [conversationIds]);

  useEffect(() => {
    if (!userId || conversationIds.length === 0) return;

    // Subscribe to read receipts for all conversations
    // Filter by conversation_id using an "in" filter is not supported by Supabase realtime
    // Instead, subscribe to all read_receipts and filter in the callback
    const newChannel = supabase.channel(`read-receipts:${userId}`);

    newChannel
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT or UPDATE
          schema: 'public',
          table: 'message_read_receipts',
        },
        (payload: RealtimePostgresChangesPayload<ReadReceipt>) => {
          const receipt = payload.new as ReadReceipt;

          // Only process if this is for one of our conversations
          // and not from the current user (someone else read)
          if (!conversationIds.includes(receipt.conversation_id)) return;
          if (receipt.user_id === userId) return;

          // Convert timestamps to Date objects
          const readReceipt: ReadReceipt = {
            ...receipt,
            last_read_at: new Date(receipt.last_read_at),
            updated_at: new Date(receipt.updated_at),
          };

          console.log('[Realtime] Read receipt updated by other user:', readReceipt.conversation_id);
          callbackRef.current?.(readReceipt);
        },
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [userId, conversationIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { channel };
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
