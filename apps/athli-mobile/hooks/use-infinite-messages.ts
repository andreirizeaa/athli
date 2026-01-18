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
};

type UseInfiniteMessagesResult = {
  messages: Message[];
  status: InfiniteMessagesStatus;
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
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
}: UseInfiniteMessagesOptions): UseInfiniteMessagesResult => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<InfiniteMessagesStatus>('idle');
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Track current conversationId to handle conversation changes
  const currentConversationIdRef = useRef<string | undefined>(conversationId);

  // Load initial messages
  const loadInitial = useCallback(async () => {
    if (!conversationId || !enabled) {
      setMessages([]);
      setStatus('idle');
      setHasMore(true);
      return;
    }

    // Reset state for new conversation
    currentConversationIdRef.current = conversationId;
    setIsLoadingInitial(true);
    setStatus('loading');
    setMessages([]);
    setHasMore(true);

    try {
      // Fetch most recent messages (descending from API, we'll reverse for display)
      const fetchedMessages = await getMessages(conversationId, { limit: INITIAL_LIMIT });

      // Check if we're still on the same conversation
      if (currentConversationIdRef.current !== conversationId) return;

      // API returns messages in descending order (newest first)
      // Reverse to get ascending order (oldest first) for display
      const sortedMessages = [...fetchedMessages].reverse();

      setMessages(sortedMessages);
      setHasMore(fetchedMessages.length >= INITIAL_LIMIT);
      setStatus(fetchedMessages.length < INITIAL_LIMIT ? 'done' : 'idle');
    } catch (error) {
      console.error('[useInfiniteMessages] Error loading initial messages:', error);
      if (currentConversationIdRef.current === conversationId) {
        setStatus('error');
      }
    } finally {
      if (currentConversationIdRef.current === conversationId) {
        setIsLoadingInitial(false);
      }
    }
  }, [conversationId, enabled]);

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
  const refetch = useCallback(async () => {
    await loadInitial();
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

  // Load initial messages when conversation changes
  useEffect(() => {
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
