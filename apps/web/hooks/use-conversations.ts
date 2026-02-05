/**
 * Hook to fetch and manage conversations
 */

import { useQuery } from '@tanstack/react-query';
import { getConversations } from '@/lib/messaging/messaging-api-client';

export const useConversations = (options?: { enabled?: boolean }) => {
  const {
    data: conversations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations({}),
    staleTime: 30 * 60 * 1000, // 30 minutes - rely on realtime for updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled !== false,
  });

  return {
    conversations: conversations || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
