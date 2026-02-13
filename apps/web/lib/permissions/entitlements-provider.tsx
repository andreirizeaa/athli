'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalData } from '@/providers/global-data-provider';
import { getEntitlements } from '@/api/billing/billing-service';
import {
  DEFAULT_ENTITLEMENTS,
  TRIAL_ENTITLEMENTS,
  PRO_ENTITLEMENTS,
  calculateIsOnTrial,
  checkFeatureAccess,
  checkAddonAccess,
} from '@athli/shared-types/entitlements-schema';
import type {
  CoachEntitlements,
  FeatureKey,
  AddonKey,
} from '@athli/shared-types/entitlements-schema';

// DEV ONLY: Force simulate a specific plan (set to null to use real entitlements)
// Options: 'starter' | 'pro' | null
const FORCE_SIMULATE_PLAN: 'starter' | 'pro' | null = null;

// Re-export types for convenience
export type { AddonKey, FeatureKey, CoachEntitlements };

interface EntitlementsContextType {
  /** Full entitlements object */
  entitlements: CoachEntitlements | null;
  /** Whether entitlements are loading */
  isLoading: boolean;
  /** Current plan type */
  plan: 'starter' | 'pro' | 'max';
  /** Client limit */
  clientLimit: number;
  /** Whether user is on trial */
  isOnTrial: boolean;
  /** Storage limit in GB */
  storageLimit: number;
  /** Whether storage is unlimited */
  hasUnlimitedStorage: boolean;
  /** Check if user has access to a feature */
  hasFeature: (feature: FeatureKey) => boolean;
  /** Check if user has access to an addon */
  hasAddon: (addon: AddonKey) => boolean;
  /** Refetch entitlements */
  refetch: () => void;
}

const EntitlementsContext = createContext<EntitlementsContextType>({
  entitlements: null,
  isLoading: true,
  plan: 'starter',
  clientLimit: 5,
  isOnTrial: false,
  storageLimit: 0,
  hasUnlimitedStorage: false,
  hasFeature: () => false,
  hasAddon: () => false,
  refetch: () => {},
});

export const useEntitlements = () => useContext(EntitlementsContext);

interface EntitlementsProviderProps {
  children: ReactNode;
}

export function EntitlementsProvider({ children }: EntitlementsProviderProps) {
  const { user, isLoading: isUserLoading } = useGlobalData();
  const isCoach = user?.userType === 'coach';

  // Check if user is on free trial (using shared function)
  const isOnTrial = useMemo(() => {
    if (FORCE_SIMULATE_PLAN) return false; // Skip trial when simulating a plan
    if (!user || user.userType !== 'coach') return false;
    if (user.freeTrialCompleted) return false;

    const createdAt = user.coachCreatedAt || user.createdAt;
    return calculateIsOnTrial(createdAt, false);
  }, [user]);

  const {
    data: fetchedEntitlements,
    isLoading: isEntitlementsLoading,
    refetch,
  } = useQuery({
    queryKey: ['entitlements'],
    queryFn: getEntitlements,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: isCoach && !isOnTrial && !FORCE_SIMULATE_PLAN, // Don't fetch if on trial or simulating
  });

  const value = useMemo<EntitlementsContextType>(() => {
    // Still loading user
    if (isUserLoading) {
      return {
        entitlements: null,
        isLoading: true,
        plan: 'starter',
        clientLimit: 5,
        isOnTrial: false,
        storageLimit: 0,
        hasUnlimitedStorage: false,
        hasFeature: () => false,
        hasAddon: () => false,
        refetch: () => {},
      };
    }

    // Not a coach - clients get full access (their coach pays)
    if (!isCoach) {
      console.log('[Entitlements] User is CLIENT (not coach) - full access granted');
      return {
        entitlements: null,
        isLoading: false,
        plan: 'max',
        clientLimit: 999,
        isOnTrial: false,
        storageLimit: -1,
        hasUnlimitedStorage: true,
        hasFeature: () => true,
        hasAddon: () => true,
        refetch: () => {},
      };
    }

    // On trial - Max plan + automations + AI assistant, but NO payments
    if (isOnTrial) {
      const trialEntitlements: CoachEntitlements = {
        ...TRIAL_ENTITLEMENTS,
        coach_id: user?.id || '',
      };
      console.log('[Entitlements] User is on TRIAL:', {
        plan: 'max',
        isOnTrial: true,
        entitlements: trialEntitlements,
      });

      return {
        entitlements: trialEntitlements,
        isLoading: false,
        plan: 'max',
        clientLimit: 50,
        isOnTrial: true,
        storageLimit: trialEntitlements.storage_limit_gb,
        hasUnlimitedStorage: trialEntitlements.storage_limit_gb === -1,
        hasFeature: (feature: FeatureKey) => checkFeatureAccess(trialEntitlements, feature, true),
        hasAddon: (addon: AddonKey) => checkAddonAccess(trialEntitlements, addon, true),
        refetch: () => {},
      };
    }

    // DEV: Simulating a specific plan
    if (FORCE_SIMULATE_PLAN) {
      const simulatedEntitlements: CoachEntitlements =
        FORCE_SIMULATE_PLAN === 'pro'
          ? { ...PRO_ENTITLEMENTS, coach_id: user?.id || '' }
          : { ...DEFAULT_ENTITLEMENTS, coach_id: user?.id || '' };

      console.log('[Entitlements] SIMULATING plan:', {
        plan: simulatedEntitlements.plan_type,
        entitlements: simulatedEntitlements,
      });

      return {
        entitlements: simulatedEntitlements,
        isLoading: false,
        plan: simulatedEntitlements.plan_type,
        clientLimit: simulatedEntitlements.client_limit,
        isOnTrial: false,
        storageLimit: simulatedEntitlements.storage_limit_gb,
        hasUnlimitedStorage: simulatedEntitlements.storage_limit_gb === -1,
        hasFeature: (feature: FeatureKey) => checkFeatureAccess(simulatedEntitlements, feature, false),
        hasAddon: (addon: AddonKey) => checkAddonAccess(simulatedEntitlements, addon, false),
        refetch: () => {},
      };
    }

    // Loading entitlements from API
    if (isEntitlementsLoading) {
      return {
        entitlements: null,
        isLoading: true,
        plan: 'starter',
        clientLimit: 5,
        isOnTrial: false,
        storageLimit: 0,
        hasUnlimitedStorage: false,
        hasFeature: () => false,
        hasAddon: () => false,
        refetch,
      };
    }

    // Use fetched entitlements or defaults
    const entitlements: CoachEntitlements = fetchedEntitlements || {
      ...DEFAULT_ENTITLEMENTS,
      coach_id: user?.id || '',
    };

    console.log('[Entitlements] Current entitlements:', {
      source: fetchedEntitlements ? 'API' : 'DEFAULT',
      plan: entitlements.plan_type,
      isOnTrial: entitlements.is_trial,
      clientLimit: entitlements.client_limit,
      features: {
        ai_workout_builder: entitlements.has_ai_workout_builder,
        custom_exercises: entitlements.has_custom_exercises,
        questionnaires: entitlements.has_questionnaires,
        habits_metrics: entitlements.has_habits_metrics,
        file_storage: entitlements.storage_limit_gb !== 0,
        broadcast_messaging: entitlements.has_broadcast_messaging,
        ai_todo_list: entitlements.has_ai_todo_list,
        priority_support: entitlements.has_priority_support,
      },
      addons: {
        automations: entitlements.has_automations,
        ai_assistant: entitlements.has_ai_assistant,
        payments: entitlements.has_payments,
      },
    });

    return {
      entitlements,
      isLoading: false,
      plan: entitlements.plan_type,
      clientLimit: entitlements.client_limit,
      isOnTrial: entitlements.is_trial,
      storageLimit: entitlements.storage_limit_gb,
      hasUnlimitedStorage: entitlements.storage_limit_gb === -1,
      hasFeature: (feature: FeatureKey) => checkFeatureAccess(entitlements, feature, false),
      hasAddon: (addon: AddonKey) => checkAddonAccess(entitlements, addon, false),
      refetch,
    };
  }, [user, isUserLoading, isCoach, isOnTrial, fetchedEntitlements, isEntitlementsLoading, refetch]);

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}
