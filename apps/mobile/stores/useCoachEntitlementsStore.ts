import { create } from 'zustand';
import { Storage } from '@/lib/storage';
import { fetchCoachEntitlements } from '@/services/coach/coach-entitlements-service';
import {
  DEFAULT_ENTITLEMENTS,
  TRIAL_ENTITLEMENTS,
  PRO_ENTITLEMENTS,
  calculateIsOnTrial,
  calculateTrialEndDate,
  checkFeatureAccess,
  checkAddonAccess,
} from '@athli/shared-types/entitlements-schema';
import type {
  CoachEntitlements,
  FeatureKey,
  AddonKey,
  LegacyFeatureKey,
} from '@athli/shared-types/entitlements-schema';

const COACH_ENTITLEMENTS_KEY = '@athli:coach_entitlements';

// DEV ONLY: Force simulate a specific plan
// Set FORCE_SIMULATE_PLAN to 'starter', 'pro', 'max', or null to use real entitlements
const FORCE_SIMULATE_PLAN: 'starter' | 'pro' | 'max' | null = null;

type CoachEntitlementsStore = {
  // State
  entitlements: CoachEntitlements | null;
  isLoading: boolean;
  isOnTrial: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  loadEntitlements: (coachCreatedAt: string | undefined) => Promise<void>;
  hasFeature: (feature: FeatureKey | LegacyFeatureKey) => boolean;
  hasAddon: (addon: AddonKey) => boolean;
  clearEntitlements: () => void;
};

export const useCoachEntitlementsStore = create<CoachEntitlementsStore>(
  (set, get) => ({
    // Initial state
    entitlements: null,
    isLoading: false,
    isOnTrial: false,
    error: null,

    // Initialize from storage (synchronous)
    initialize: () => {
      try {
        const savedEntitlements = Storage.getItem(COACH_ENTITLEMENTS_KEY);
        if (savedEntitlements) {
          const entitlements = JSON.parse(savedEntitlements) as CoachEntitlements;
          set({
            entitlements,
            isOnTrial: entitlements.is_trial,
            error: null,
          });
        }
      } catch (error) {
        console.error(
          '[CoachEntitlementsStore] Failed to restore entitlements from storage:',
          error
        );
        // Clear invalid data
        Storage.removeItem(COACH_ENTITLEMENTS_KEY);
      }
    },

    // Load entitlements from API (or use trial/default based on coach creation date)
    loadEntitlements: async (coachCreatedAt: string | undefined) => {
      set({ isLoading: true, error: null });

      try {
        // DEV: Force simulate a specific plan
        if (FORCE_SIMULATE_PLAN === 'max') {
          const maxEntitlements: CoachEntitlements = {
            ...TRIAL_ENTITLEMENTS,
            coach_id: '',
            is_trial: false,
            subscription_status: 'active',
            trial_ends_at: null,
          };

          set({
            entitlements: maxEntitlements,
            isOnTrial: false,
            isLoading: false,
          });

          // Persist to storage
          Storage.setItem(COACH_ENTITLEMENTS_KEY, JSON.stringify(maxEntitlements));

          return;
        }

        if (FORCE_SIMULATE_PLAN === 'pro') {
          const proEntitlements: CoachEntitlements = {
            ...PRO_ENTITLEMENTS,
            coach_id: '',
          };

          set({
            entitlements: proEntitlements,
            isOnTrial: false,
            isLoading: false,
          });

          // Persist to storage
          Storage.setItem(COACH_ENTITLEMENTS_KEY, JSON.stringify(proEntitlements));

          return;
        }

        if (FORCE_SIMULATE_PLAN === 'starter') {
          const starterEntitlements: CoachEntitlements = {
            ...DEFAULT_ENTITLEMENTS,
            coach_id: '',
          };

          set({
            entitlements: starterEntitlements,
            isOnTrial: false,
            isLoading: false,
          });

          // Persist to storage
          Storage.setItem(COACH_ENTITLEMENTS_KEY, JSON.stringify(starterEntitlements));

          return;
        }

        const isOnTrial = calculateIsOnTrial(coachCreatedAt, false);

        // If on trial, use trial entitlements (no API call needed)
        if (isOnTrial) {
          const trialEntitlements: CoachEntitlements = {
            ...TRIAL_ENTITLEMENTS,
            coach_id: '',
            trial_ends_at: coachCreatedAt ? calculateTrialEndDate(coachCreatedAt) : null,
          };

          set({
            entitlements: trialEntitlements,
            isOnTrial: true,
            isLoading: false,
          });

          // Persist to storage
          Storage.setItem(COACH_ENTITLEMENTS_KEY, JSON.stringify(trialEntitlements));

          return;
        }

        // Not on trial - fetch from API
        const entitlements = await fetchCoachEntitlements();

        set({
          entitlements,
          isOnTrial: entitlements.is_trial,
          isLoading: false,
        });

        // Persist to storage
        Storage.setItem(COACH_ENTITLEMENTS_KEY, JSON.stringify(entitlements));
      } catch (error: any) {
        console.error('[CoachEntitlementsStore] Error loading entitlements:', error);

        // Fallback to starter plan on error
        const defaultEntitlements: CoachEntitlements = {
          ...DEFAULT_ENTITLEMENTS,
          coach_id: '',
        };

        set({
          entitlements: defaultEntitlements,
          isOnTrial: false,
          isLoading: false,
          error: error.message || 'Failed to load entitlements',
        });

        // Still persist defaults so app works offline
        Storage.setItem(COACH_ENTITLEMENTS_KEY, JSON.stringify(defaultEntitlements));
      }
    },

    // Check if user has access to a feature (uses shared function)
    hasFeature: (feature: FeatureKey | LegacyFeatureKey): boolean => {
      const { entitlements, isOnTrial } = get();
      return checkFeatureAccess(entitlements, feature, isOnTrial);
    },

    // Check if user has access to an addon (uses shared function)
    hasAddon: (addon: AddonKey): boolean => {
      const { entitlements, isOnTrial } = get();
      return checkAddonAccess(entitlements, addon, isOnTrial);
    },

    // Clear entitlements (on logout)
    clearEntitlements: () => {
      set({
        entitlements: null,
        isOnTrial: false,
        isLoading: false,
        error: null,
      });
      // Remove from storage
      Storage.removeItem(COACH_ENTITLEMENTS_KEY);
    },
  })
);
