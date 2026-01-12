import { create } from 'zustand';
import type { Athlete } from '@/services/coach/coach-client-service';

interface ClientsStore {
  // State
  clients: Athlete[];
  selectedClient: Athlete | null;

  // Actions
  setClients: (clients: Athlete[]) => void;
  setSelectedClient: (client: Athlete | null) => void;

  // Computed selectors
  getFilteredClients: (searchQuery: string, categoryFilter?: string) => Athlete[];
  getClientById: (id: string) => Athlete | undefined;
}

export const useClientsStore = create<ClientsStore>((set, get) => ({
  // Initial state
  clients: [],
  selectedClient: null,

  // Actions
  setClients: (clients) => set({ clients }),
  setSelectedClient: (client) => set({ selectedClient: client }),

  // Computed selectors
  getFilteredClients: (searchQuery: string, categoryFilter?: string) => {
    const { clients } = get();
    let filtered = clients;

    // Apply category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(
        (client) => client.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  },

  getClientById: (id: string) => {
    const { clients } = get();
    return clients.find((client) => client.id === id);
  },
}));
