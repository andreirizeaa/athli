import { create } from 'zustand';
import {
  fetchCoachPreferences,
  updateCoachPreferences,
  type CoachPreferences,
  type ClientTerminology,
} from '@/services/coach/coach-preferences-service';
import { Storage } from '@/lib/storage';

const COACH_PREFERENCES_KEY = '@athli:coach_preferences';

type CoachPreferencesStore = {
  // State
  preferences: CoachPreferences | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setPreferences: (preferences: CoachPreferences | null) => void;
  loadPreferences: () => Promise<void>;
  updateTerminology: (terminology: ClientTerminology) => Promise<void>;
  clearPreferences: () => void;
  initialize: () => void;
};

export const useCoachPreferencesStore = create<CoachPreferencesStore>((set, get) => ({
  // Initial state
  preferences: null,
  isLoading: false,
  error: null,

  // Initialize from storage
  initialize: () => {
    try {
      const saved = Storage.getItem(COACH_PREFERENCES_KEY);
      if (saved) {
        const preferences = JSON.parse(saved) as CoachPreferences;
        set({ preferences, error: null });
      }
    } catch (error) {
      console.error('[CoachPreferencesStore] Failed to restore preferences from storage:', error);
      Storage.removeItem(COACH_PREFERENCES_KEY);
    }
  },

  // Set preferences directly
  setPreferences: (preferences) => {
    set({ preferences, error: null });
    if (preferences) {
      Storage.setItem(COACH_PREFERENCES_KEY, JSON.stringify(preferences));
    } else {
      Storage.removeItem(COACH_PREFERENCES_KEY);
    }
  },

  // Load preferences from API
  loadPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const preferences = await fetchCoachPreferences();
      set({ preferences, isLoading: false });
      if (preferences) {
        Storage.setItem(COACH_PREFERENCES_KEY, JSON.stringify(preferences));
      }
    } catch (error: any) {
      console.error('Error loading coach preferences:', error);
      set({
        error: error.message || 'Failed to load coach preferences',
        isLoading: false,
      });
    }
  },

  // Update terminology
  updateTerminology: async (terminology: ClientTerminology) => {
    const { preferences } = get();

    // Optimistically update local state
    const updatedPreferences = {
      ...preferences,
      client_terminology: terminology,
    } as CoachPreferences;

    set({ preferences: updatedPreferences });
    Storage.setItem(COACH_PREFERENCES_KEY, JSON.stringify(updatedPreferences));

    try {
      await updateCoachPreferences({ client_terminology: terminology });
    } catch (error: any) {
      console.error('Error updating terminology:', error);
      // Revert on error
      set({ preferences });
      throw error;
    }
  },

  // Clear preferences (on logout)
  clearPreferences: () => {
    set({ preferences: null, error: null, isLoading: false });
    Storage.removeItem(COACH_PREFERENCES_KEY);
  },
}));
