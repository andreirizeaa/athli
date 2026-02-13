import { create } from 'zustand';
import { Storage } from '@/lib/storage';
import { fetchCoachEntitlementsForClient } from '@/services/client/client-coach-entitlements-service';
import {
  DEFAULT_ENTITLEMENTS,
  TRIAL_ENTITLEMENTS,
  checkFeatureAccess,
} from '@athli/shared-types/entitlements-schema';
import type {
  CoachEntitlements,
  FeatureKey,
  LegacyFeatureKey,
} from '@athli/shared-types/entitlements-schema';

const ATHLETE_COACH_ENTITLEMENTS_KEY = '@athli:athlete_coach_entitlements';

type AthleteCoachEntitlementsStore = {
  // State
  coachEntitlements: CoachEntitlements | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  isCoachOnStarter: boolean;

  // Actions
  initialize: () => void;
  loadCoachEntitlements: (coachId: string) => Promise<void>;
  hasFeature: (feature: FeatureKey | LegacyFeatureKey) => boolean;
  clearEntitlements: () => void;
};

export const useAthleteCoachEntitlementsStore = create<AthleteCoachEntitlementsStore>(
  (set, get) => ({
    // Initial state
    coachEntitlements: null,
    isLoading: false,
    error: null,
    isCoachOnStarter: false,

    // Initialize from storage (synchronous)
    initialize: () => {
      try {
        const savedEntitlements = Storage.getItem(ATHLETE_COACH_ENTITLEMENTS_KEY);
        if (savedEntitlements) {
          const entitlements = JSON.parse(savedEntitlements) as CoachEntitlements;
          // Only consider coach on starter if not on trial
          const isOnStarter = entitlements.plan_type === 'starter' && !entitlements.is_trial;
          set({
            coachEntitlements: entitlements,
            isCoachOnStarter: isOnStarter,
            error: null,
          });
        }
      } catch (error) {
        console.error(
          '[AthleteCoachEntitlementsStore] Failed to restore entitlements from storage:',
          error
        );
        Storage.removeItem(ATHLETE_COACH_ENTITLEMENTS_KEY);
      }
    },

    // Load coach entitlements from API
    loadCoachEntitlements: async (coachId: string) => {
      set({ isLoading: true, error: null });

      try {
        const entitlements = await fetchCoachEntitlementsForClient(coachId);

        // Only consider coach on starter if not on trial
        const isOnStarter = entitlements.plan_type === 'starter' && !entitlements.is_trial;

        set({
          coachEntitlements: entitlements,
          isCoachOnStarter: isOnStarter,
          isLoading: false,
        });

        // Persist to storage
        Storage.setItem(ATHLETE_COACH_ENTITLEMENTS_KEY, JSON.stringify(entitlements));
      } catch (error: any) {
        console.error('[AthleteCoachEntitlementsStore] Error loading coach entitlements:', error);

        // Fallback: assume starter plan on error (most restrictive)
        const defaultEntitlements: CoachEntitlements = {
          ...DEFAULT_ENTITLEMENTS,
          coach_id: coachId,
        };

        set({
          coachEntitlements: defaultEntitlements,
          isCoachOnStarter: true,
          isLoading: false,
          error: error.message || 'Failed to load coach entitlements',
        });

        // Persist defaults so app works offline
        Storage.setItem(ATHLETE_COACH_ENTITLEMENTS_KEY, JSON.stringify(defaultEntitlements));
      }
    },

    // Check if coach has access to a feature
    hasFeature: (feature: FeatureKey | LegacyFeatureKey): boolean => {
      const { coachEntitlements } = get();
      const isOnTrial = coachEntitlements?.is_trial ?? false;
      return checkFeatureAccess(coachEntitlements, feature, isOnTrial);
    },

    // Clear entitlements (on logout)
    clearEntitlements: () => {
      set({
        coachEntitlements: null,
        isCoachOnStarter: false,
        isLoading: false,
        error: null,
      });
      Storage.removeItem(ATHLETE_COACH_ENTITLEMENTS_KEY);
    },
  })
);
