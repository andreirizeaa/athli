/**
 * Centralized client data fetching hook that syncs React Query with Zustand
 *
 * This hook should be used ONCE at the app root level (in _layout.tsx)
 * Components should subscribe to Zustand stores directly, not call this hook.
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClientsStore } from '@/stores/useClientsStore';
import { useChatsStore } from '@/stores/useChatsStore';
import {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  archiveClient,
  type Athlete,
  type AddClientData,
  type UpdateClientData,
} from '@/services/coach/coach-client-service';

/**
 * Hook to fetch and sync client data
 * Call this ONCE in the root layout
 * @param isAuthenticated - Whether the user is authenticated
 */
export function useClientsData(isAuthenticated: boolean = false) {
  const setClients = useClientsStore((state) => state.setClients);

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache data to reduce API calls
    enabled: isAuthenticated,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Sync to Zustand when data changes
  useEffect(() => {
    if (clientsQuery.data) {
      console.log('[useClientsData] Syncing clients to store:', clientsQuery.data.length, 'items');
      setClients(clientsQuery.data);
    }
  }, [clientsQuery.data, setClients]);

  return {
    isLoading: clientsQuery.isLoading,
    isError: clientsQuery.isError,
    error: clientsQuery.error,
  };
}

/**
 * Mutations for client operations
 * These can be used throughout the app
 */
export function useClientMutations() {
  const queryClient = useQueryClient();
  const loadChats = useChatsStore((state) => state.loadChats);

  const addClientMutation = useMutation({
    mutationFn: (data: AddClientData) => addClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientData }) =>
      updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // Reload chats so deleted client disappears from inbox
      loadChats();
    },
  });

  const archiveClientMutation = useMutation({
    mutationFn: (id: string) => archiveClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // Reload chats so archived client disappears from inbox
      loadChats();
    },
  });

  return {
    addClient: addClientMutation,
    updateClient: updateClientMutation,
    deleteClient: deleteClientMutation,
    archiveClient: archiveClientMutation,
  };
}
