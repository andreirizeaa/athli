'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalData } from '@/providers/global-data-provider';
import { getEntitlements, type CoachEntitlements } from '@/api/billing/billing-service';

// DEV ONLY: Force simulate a specific plan (set to false to use real entitlements)
const FORCE_SIMULATE_STARTER = true;

// Default entitlements for starter plan / trial
const DEFAULT_ENTITLEMENTS: Omit<CoachEntitlements, 'coach_id'> = {
  plan_type: 'starter',
  client_limit: 5,
  has_ai_workout_builder: false,
  has_custom_exercises: false,
  has_questionnaires: false,
  has_habits_metrics: false,
  storage_limit_gb: 0,
  has_broadcast_messaging: false,
  has_ai_todo_list: false,
  has_priority_support: false,
  has_automations: false,
  has_ai_assistant: false,
  has_payments: false,
  subscription_status: 'active',
  is_trial: false,
  trial_ends_at: null,
};

// During trial, Max plan features + automations + AI assistant (limited), but NO payments
const TRIAL_ENTITLEMENTS: Omit<CoachEntitlements, 'coach_id'> = {
  plan_type: 'max',
  client_limit: 50,
  has_ai_workout_builder: true,
  has_custom_exercises: true,
  has_questionnaires: true,
  has_habits_metrics: true,
  storage_limit_gb: -1, // unlimited
  has_broadcast_messaging: true,
  has_ai_todo_list: true,
  has_priority_support: true,
  has_automations: true,
  has_ai_assistant: true,
  has_payments: false, // Payments require the paid addon
  subscription_status: 'trialing',
  is_trial: true,
  trial_ends_at: null,
};

export type AddonKey = 'automations' | 'ai_assistant' | 'payments';
export type FeatureKey =
  | 'ai_workout_builder'
  | 'custom_exercises'
  | 'custom_sections'
  | 'questionnaires'
  | 'habits_metrics'
  | 'file_storage'
  | 'broadcast_messaging'
  | 'ai_todo_list'
  | 'priority_support'
  | 'automations'
  | 'ai_assistant'
  | 'payments';

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

  // Check if user is on free trial (based on existing logic)
  const isOnTrial = useMemo(() => {
    // DEV: Force simulate starter plan
    if (FORCE_SIMULATE_STARTER) return false;

    if (!user || user.userType !== 'coach') return false;
    if (user.freeTrialCompleted) return false;

    const createdAt = user.coachCreatedAt || user.createdAt;
    if (!createdAt) return false;

    const creationDate = new Date(createdAt);
    const today = new Date();
    const trialEndDate = new Date(creationDate);
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    return today <= trialEndDate;
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
    enabled: isCoach && !isOnTrial && !FORCE_SIMULATE_STARTER, // Don't fetch if on trial or simulating
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
        hasFeature: () => true,
        hasAddon: () => true,
        refetch: () => {},
      };
    }

    // On trial - Max plan + automations + AI assistant, but NO payments
    if (isOnTrial) {
      const trialEntitlements = { ...TRIAL_ENTITLEMENTS, coach_id: user?.id || '' };
      console.log('[Entitlements] User is on TRIAL:', {
        plan: 'max',
        isOnTrial: true,
        entitlements: trialEntitlements,
      });

      const trialHasFeature = (feature: FeatureKey): boolean => {
        // Payments require the paid addon even during trial
        if (feature === 'payments') return false;
        return true;
      };

      const trialHasAddon = (addon: AddonKey): boolean => {
        // Payments require the paid addon even during trial
        if (addon === 'payments') return false;
        return true;
      };

      return {
        entitlements: trialEntitlements,
        isLoading: false,
        plan: 'max',
        clientLimit: 50,
        isOnTrial: true,
        hasFeature: trialHasFeature,
        hasAddon: trialHasAddon,
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
        hasFeature: () => false,
        hasAddon: () => false,
        refetch,
      };
    }

    // Use fetched entitlements or defaults
    const entitlements = fetchedEntitlements || { ...DEFAULT_ENTITLEMENTS, coach_id: user?.id || '' };

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

    const hasFeature = (feature: FeatureKey): boolean => {
      switch (feature) {
        case 'ai_workout_builder':
          return entitlements.has_ai_workout_builder;
        case 'custom_exercises':
          return entitlements.has_custom_exercises;
        case 'custom_sections':
          // Custom sections share the same gate as custom exercises (Pro+ feature)
          return entitlements.has_custom_exercises;
        case 'questionnaires':
          return entitlements.has_questionnaires;
        case 'habits_metrics':
          return entitlements.has_habits_metrics;
        case 'file_storage':
          // File storage available if storage_limit_gb > 0 or unlimited (-1)
          return entitlements.storage_limit_gb !== 0;
        case 'broadcast_messaging':
          return entitlements.has_broadcast_messaging;
        case 'ai_todo_list':
          return entitlements.has_ai_todo_list;
        case 'priority_support':
          return entitlements.has_priority_support;
        case 'automations':
          return entitlements.has_automations;
        case 'ai_assistant':
          return entitlements.has_ai_assistant;
        case 'payments':
          return entitlements.has_payments;
        default:
          return false;
      }
    };

    const hasAddon = (addon: AddonKey): boolean => {
      switch (addon) {
        case 'automations':
          return entitlements.has_automations;
        case 'ai_assistant':
          return entitlements.has_ai_assistant;
        case 'payments':
          return entitlements.has_payments;
        default:
          return false;
      }
    };

    return {
      entitlements,
      isLoading: false,
      plan: entitlements.plan_type,
      clientLimit: entitlements.client_limit,
      isOnTrial: entitlements.is_trial,
      hasFeature,
      hasAddon,
      refetch,
    };
  }, [user, isUserLoading, isCoach, isOnTrial, fetchedEntitlements, isEntitlementsLoading, refetch]);

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}
