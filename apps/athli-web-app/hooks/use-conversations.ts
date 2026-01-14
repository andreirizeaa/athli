/**
 * Hook to fetch and manage conversations
 */

import { useState, useEffect } from 'react';
import { getConversations } from '@/lib/messaging/messaging-api-client';
import type { Conversation } from '@athli/shared-types';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getConversations({});
      setConversations(data);
    } catch (err) {
      setError(err as Error);
      console.error('[useConversations] Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
};
