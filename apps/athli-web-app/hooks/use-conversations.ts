/**
 * Hook to fetch and manage conversations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getConversations } from '@/lib/messaging/messaging-api-client';
import type { Conversation } from '@athli/shared-types';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitiallyFetchedRef = useRef(false);

  const fetchConversations = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode (development)
    if (hasInitiallyFetchedRef.current) return;
    hasInitiallyFetchedRef.current = true;

    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
};
