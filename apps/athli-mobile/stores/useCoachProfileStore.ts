import { create } from 'zustand';
import type { CoachProfile } from '@/types/profile';
import {
  fetchCoachProfile,
  updateCoachProfile,
} from '@/services/coach/coach-profile-service';

type CoachProfileStore = {
  // State
  profile: CoachProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: CoachProfile | null) => void;
  loadProfile: (coachId: string) => Promise<void>;
  updateProfile: (
    updates: Partial<Omit<CoachProfile, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  clearProfile: () => void;
};

export const useCoachProfileStore = create<CoachProfileStore>((set, get) => ({
  // Initial state
  profile: null,
  isLoading: false,
  error: null,

  // Set profile directly (useful after auth)
  setProfile: (profile) => {
    set({ profile, error: null });
  },

  // Load profile from database
  loadProfile: async (coachId) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await fetchCoachProfile(coachId);
      set({ profile, isLoading: false });
    } catch (error: any) {
      console.error('Error loading coach profile:', error);
      set({
        error: error.message || 'Failed to load coach profile',
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
      const updatedProfile = await updateCoachProfile(profile.id, updates);
      set({ profile: updatedProfile, isLoading: false });
    } catch (error: any) {
      console.error('Error updating coach profile:', error);
      set({
        error: error.message || 'Failed to update coach profile',
        isLoading: false,
      });
      throw error;
    }
  },

  // Clear profile (on logout)
  clearProfile: () => {
    set({ profile: null, error: null, isLoading: false });
  },
}));
