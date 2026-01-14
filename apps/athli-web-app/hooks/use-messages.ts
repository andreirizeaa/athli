/**
 * Hook to fetch and manage messages for a conversation
 */

import { useState, useEffect } from 'react';
import { getMessages } from '@/lib/messaging/messaging-api-client';
import type { Message } from '@athli/shared-types';

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = async () => {
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
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    addOptimisticMessage: (message: Message) => {
      setMessages((prev) => [...prev, message]);
    },
    removeOptimisticMessage: (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
  };
};
