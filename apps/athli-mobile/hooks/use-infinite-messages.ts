/**
 * useInfiniteMessages Hook
 * Implements cursor-based pagination for chat messages
 * Loads oldest messages first (scroll up to load more)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getMessages, type Message } from '@/services/chats-service';

const INITIAL_LIMIT = 100;
const PAGE_LIMIT = 50;

type InfiniteMessagesStatus = 'idle' | 'loading' | 'error' | 'done';

type UseInfiniteMessagesOptions = {
  conversationId: string | undefined;
  enabled?: boolean;
  initialMessages?: Message[];
};

type UseInfiniteMessagesResult = {
  messages: Message[];
  status: InfiniteMessagesStatus;
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  /** Refetch messages and return the fresh data directly (avoids stale ref issues) */
  refetch: () => Promise<Message[]>;
  removeMessage: (messageId: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
};

/**
 * Hook for loading messages with infinite scroll (load older messages)
 * Messages are returned in ascending order (oldest first) for display
 */
export const useInfiniteMessages = ({
  conversationId,
  enabled = true,
  initialMessages,
}: UseInfiniteMessagesOptions): UseInfiniteMessagesResult => {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [status, setStatus] = useState<InfiniteMessagesStatus>('idle');
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Track current conversationId to handle conversation changes
  const currentConversationIdRef = useRef<string | undefined>(conversationId);

  // Track if we were seeded with initial messages (skip initial fetch)
  const wasSeededRef = useRef(initialMessages && initialMessages.length > 0);

  // Merge new messages with existing (non-destructive update for refetch)
  const mergeMessages = useCallback((newMessages: Message[]) => {
    setMessages((prevMessages) => {
      if (prevMessages.length === 0) return newMessages;

      // Create a map for O(1) lookup - newer data wins
      const messageMap = new Map<string, Message>();
      prevMessages.forEach((msg) => messageMap.set(msg.id, msg));
      newMessages.forEach((msg) => messageMap.set(msg.id, msg));

      // Sort by sent_at ascending (oldest first)
      return Array.from(messageMap.values()).sort((a, b) => {
        const aTime = a.sent_at instanceof Date ? a.sent_at.getTime() : new Date(a.sent_at).getTime();
        const bTime = b.sent_at instanceof Date ? b.sent_at.getTime() : new Date(b.sent_at).getTime();
        return aTime - bTime;
      });
    });
  }, []);

  // Load initial messages (or refetch without clearing)
  // Returns the fetched messages directly for immediate use (avoids stale ref timing issues)
  const loadInitial = useCallback(async (isRefetch: boolean = false): Promise<Message[]> => {
    if (!conversationId || !enabled) {
      setMessages([]);
      setStatus('idle');
      setHasMore(true);
      return [];
    }

    // Only reset state for new conversation, not refetch
    if (!isRefetch) {
      currentConversationIdRef.current = conversationId;
      setMessages([]);
      setHasMore(true);
    }

    setIsLoadingInitial(true);
    setStatus('loading');

    try {
      // Fetch most recent messages (descending from API, we'll reverse for display)
      const fetchedMessages = await getMessages(conversationId, { limit: INITIAL_LIMIT });

      // Check if we're still on the same conversation
      if (currentConversationIdRef.current !== conversationId) return [];

      // API returns messages in descending order (newest first)
      // Reverse to get ascending order (oldest first) for display
      const sortedMessages = [...fetchedMessages].reverse();

      if (isRefetch) {
        // Non-destructive merge for refetch - prevents flicker
        mergeMessages(sortedMessages);
      } else {
        // Clean set for new conversation
        setMessages(sortedMessages);
      }

      setHasMore(fetchedMessages.length >= INITIAL_LIMIT);
      setStatus(fetchedMessages.length < INITIAL_LIMIT ? 'done' : 'idle');

      // Return the fresh messages directly for immediate use
      return sortedMessages;
    } catch (error) {
      console.error('[useInfiniteMessages] Error loading initial messages:', error);
      if (currentConversationIdRef.current === conversationId) {
        setStatus('error');
      }
      return [];
    } finally {
      if (currentConversationIdRef.current === conversationId) {
        setIsLoadingInitial(false);
      }
    }
  }, [conversationId, enabled, mergeMessages]);

  // Load older messages (for scroll up)
  const loadMore = useCallback(async () => {
    if (!conversationId || !enabled || status === 'done' || status === 'loading' || isLoadingMore) {
      return;
    }

    if (messages.length === 0) {
      // No messages loaded yet, load initial instead
      await loadInitial();
      return;
    }

    setIsLoadingMore(true);
    setStatus('loading');

    try {
      // Get the oldest message's timestamp for cursor-based pagination
      const oldestMessage = messages[0];
      const beforeTimestamp = oldestMessage.sent_at;

      // Fetch older messages
      const fetchedMessages = await getMessages(conversationId, {
        limit: PAGE_LIMIT,
        beforeTimestamp: beforeTimestamp instanceof Date ? beforeTimestamp : new Date(beforeTimestamp),
      });

      // Check if we're still on the same conversation
      if (currentConversationIdRef.current !== conversationId) return;

      if (fetchedMessages.length === 0) {
        setHasMore(false);
        setStatus('done');
        return;
      }

      // API returns messages in descending order (newest first)
      // Reverse and prepend to existing messages
      const sortedOlderMessages = [...fetchedMessages].reverse();

      setMessages((prev) => [...sortedOlderMessages, ...prev]);
      setHasMore(fetchedMessages.length >= PAGE_LIMIT);
      setStatus(fetchedMessages.length < PAGE_LIMIT ? 'done' : 'idle');
    } catch (error) {
      console.error('[useInfiniteMessages] Error loading more messages:', error);
      if (currentConversationIdRef.current === conversationId) {
        setStatus('error');
      }
    } finally {
      if (currentConversationIdRef.current === conversationId) {
        setIsLoadingMore(false);
      }
    }
  }, [conversationId, enabled, status, isLoadingMore, messages, loadInitial]);

  // Refetch all messages (for pull-to-refresh or manual refresh)
  // Uses non-destructive merge to prevent flicker
  // Returns the fresh messages directly for immediate use (avoids stale ref timing issues)
  const refetch = useCallback(async (): Promise<Message[]> => {
    return await loadInitial(true);
  }, [loadInitial]);

  // Remove a message locally (for optimistic deletion)
  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  // Update a message locally (for optimistic updates like reactions)
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
    );
  }, []);

  // Load initial messages when conversation changes (skip if seeded with initialMessages)
  useEffect(() => {
    if (wasSeededRef.current) {
      wasSeededRef.current = false;
      return;
    }
    loadInitial();
  }, [loadInitial]);

  return {
    messages,
    status,
    isLoadingInitial,
    isLoadingMore,
    hasMore,
    loadMore,
    refetch,
    removeMessage,
    updateMessage,
  };
};
