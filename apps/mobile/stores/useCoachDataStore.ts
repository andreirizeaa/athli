import { create } from 'zustand';
import { getClients, type Athlete } from '@/services/coach/coach-client-service';
import { getChats, type Chat } from '@/services/chats-service';

type CoachDataStore = {
  // Loading state
  isLoading: boolean;
  isInitialLoadComplete: boolean;
  error: string | null;

  // Data
  clients: Athlete[];
  chats: Chat[];

  // Actions
  loadCoachData: () => Promise<void>;
  setClients: (clients: Athlete[]) => void;
  setChats: (chats: Chat[]) => void;
  reset: () => void;
};

export const useCoachDataStore = create<CoachDataStore>((set, get) => ({
  // Initial state
  isLoading: false,
  isInitialLoadComplete: false,
  error: null,
  clients: [],
  chats: [],

  // Load all essential coach data
  loadCoachData: async () => {
    const { isInitialLoadComplete } = get();

    // Skip if already loaded
    if (isInitialLoadComplete) {
      console.log('[CoachDataStore] Initial load already complete, skipping');
      return;
    }

    set({ isLoading: true, error: null });
    console.log('[CoachDataStore] Loading coach data...');

    try {
      // Fetch all data in parallel
      const [clientsData, chatsData] = await Promise.all([
        getClients().catch((err) => {
          console.warn('[CoachDataStore] Failed to load clients:', err);
          return [];
        }),
        getChats().catch((err) => {
          console.warn('[CoachDataStore] Failed to load chats:', err);
          return [];
        }),
      ]);

      set({
        clients: clientsData,
        chats: chatsData,
        isLoading: false,
        isInitialLoadComplete: true,
        error: null,
      });

      console.log('[CoachDataStore] Coach data loaded successfully');
    } catch (error: any) {
      console.error('[CoachDataStore] Error loading coach data:', error);
      set({
        isLoading: false,
        isInitialLoadComplete: true, // Mark as complete even on error to prevent infinite loading
        error: error.message || 'Failed to load coach data',
      });
    }
  },

  // Manual setters for when data is loaded elsewhere
  setClients: (clients) => set({ clients }),
  setChats: (chats) => set({ chats }),

  // Reset store (on logout)
  reset: () =>
    set({
      isLoading: false,
      isInitialLoadComplete: false,
      error: null,
      clients: [],
      chats: [],
    }),
}));
