/**
 * Hook to fetch and manage messages for a conversation
 */

import { useState, useEffect, useCallback } from 'react';
import { getMessages } from '@/lib/messaging/messaging-api-client';
import type { Message } from '@athli/shared-types';

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getMessages({ conversationId });
      setMessages(data);
    } catch (err) {
      setError(err as Error);
      console.error('[useMessages] Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const addOptimisticMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const removeOptimisticMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    addOptimisticMessage,
    removeOptimisticMessage,
  };
};
