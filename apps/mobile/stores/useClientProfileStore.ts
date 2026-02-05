import { create } from 'zustand';
import type { ClientProfile } from '@/types/profile';
import {
  fetchClientProfile,
  updateClientProfile,
} from '@/services/client/client-profile-service';
import { Storage } from '@/lib/storage';

const CLIENT_PROFILE_KEY = '@athli:client_profile';

type ClientProfileStore = {
  // State
  profile: ClientProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: ClientProfile | null) => void;
  loadProfile: (clientId: string) => Promise<void>;
  updateProfile: (
    updates: Partial<
      Omit<ClientProfile, 'client_id' | 'coach_id' | 'created_at' | 'updated_at'>
    >
  ) => Promise<void>;
  clearProfile: () => void;
  initialize: () => void;
};

export const useClientProfileStore = create<ClientProfileStore>((set, get) => ({
  // Initial state
  profile: null,
  isLoading: false,
  error: null,

  // Initialize from storage
  initialize: () => {
    try {
      const savedProfile = Storage.getItem(CLIENT_PROFILE_KEY);
      if (savedProfile) {
        const profile = JSON.parse(savedProfile) as ClientProfile;
        set({ profile, error: null });
        console.log('[ClientProfileStore] Profile restored from storage');
      }
    } catch (error) {
      console.error('[ClientProfileStore] Failed to restore profile from storage:', error);
      // Clear invalid data
      Storage.removeItem(CLIENT_PROFILE_KEY);
    }
  },

  // Set profile directly (useful after auth)
  setProfile: (profile) => {
    set({ profile, error: null });
    // Persist to storage
    if (profile) {
      Storage.setItem(CLIENT_PROFILE_KEY, JSON.stringify(profile));
    } else {
      Storage.removeItem(CLIENT_PROFILE_KEY);
    }
  },

  // Load profile from database
  loadProfile: async (clientId) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await fetchClientProfile(clientId);
      set({ profile, isLoading: false });
    } catch (error: any) {
      console.error('Error loading client profile:', error);
      set({
        error: error.message || 'Failed to load client profile',
        isLoading: false,
      });
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) {
      throw new Error('No profile loaded');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedProfile = await updateClientProfile(
        profile.client_id,
        profile.coach_id,
        updates
      );
      set({ profile: updatedProfile, isLoading: false });
    } catch (error: any) {
      console.error('Error updating client profile:', error);
      set({
        error: error.message || 'Failed to update client profile',
        isLoading: false,
      });
      throw error;
    }
  },

  // Clear profile (on logout)
  clearProfile: () => {
    set({ profile: null, error: null, isLoading: false });
    // Remove from storage
    Storage.removeItem(CLIENT_PROFILE_KEY);
  },
}));
