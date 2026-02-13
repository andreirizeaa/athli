import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getEntitlements,
  getSubscription,
  hasFeatureAccess,
  isSubscriptionActive,
  type CoachEntitlements,
  type PlatformSubscription,
  type AddonType,
} from '@/api/billing/billing-service';
import { useGlobalData } from '@/providers/global-data-provider';

// Feature names for display
const FEATURE_NAMES: Record<string, string> = {
  has_ai_workout_builder: 'AI Workout Builder',
  has_custom_exercises: 'Custom Exercises',
  has_questionnaires: 'Questionnaires',
  has_habits_metrics: 'Habits & Metrics',
  has_broadcast_messaging: 'Broadcast Messaging',
  has_ai_todo_list: 'AI Todo List',
  has_priority_support: 'Priority Support',
  has_automations: 'Automations',
  has_ai_assistant: 'AI Assistant',
  has_payments: 'Payments',
};

// Default entitlements for starter plan
const DEFAULT_ENTITLEMENTS: Omit<CoachEntitlements, 'coach_id'> = {
  plan_type: 'starter',
  client_limit: 5,
  has_ai_workout_builder: false,
  has_custom_exercises: false,
  has_questionnaires: false,
  has_habits_metrics: false,
  has_photo_tracking: false,
  has_exercise_history: false,
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

type FeatureKey = keyof Pick<
  CoachEntitlements,
  | 'has_ai_workout_builder'
  | 'has_custom_exercises'
  | 'has_questionnaires'
  | 'has_habits_metrics'
  | 'has_broadcast_messaging'
  | 'has_ai_todo_list'
  | 'has_priority_support'
  | 'has_automations'
  | 'has_ai_assistant'
  | 'has_payments'
>;

/**
 * Hook to get coach entitlements for feature gating
 */
export function useEntitlements() {
  const { user } = useGlobalData();
  const isCoach = user?.userType === 'coach';

  const {
    data: entitlements,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['entitlements'],
    queryFn: getEntitlements,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isCoach,
  });

  // Memoize computed values
  const computed = useMemo(() => {
    const e = entitlements || { ...DEFAULT_ENTITLEMENTS, coach_id: user?.id || '' };

    return {
      // Plan info
      plan: e.plan_type,
      clientLimit: e.client_limit,

      // Subscription status
      isActive: isSubscriptionActive(e.subscription_status),
      isTrial: e.is_trial,
      trialEndsAt: e.trial_ends_at ? new Date(e.trial_ends_at) : null,
      status: e.subscription_status,

      // Feature checks
      canUseAiWorkoutBuilder: e.has_ai_workout_builder,
      canUseCustomExercises: e.has_custom_exercises,
      canUseQuestionnaires: e.has_questionnaires,
      canUseHabitsMetrics: e.has_habits_metrics,
      canUseBroadcastMessaging: e.has_broadcast_messaging,
      canUseAiTodoList: e.has_ai_todo_list,
      hasPrioritySupport: e.has_priority_support,

      // Addon checks
      hasAutomations: e.has_automations,
      hasAiAssistant: e.has_ai_assistant,
      hasPayments: e.has_payments,

      // Storage
      storageLimit: e.storage_limit_gb,
      hasUnlimitedStorage: e.storage_limit_gb === -1,
    };
  }, [entitlements, user?.id]);

  return {
    entitlements,
    isLoading,
    error,
    refetch,
    ...computed,
  };
}

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAccess(feature: FeatureKey) {
  const { entitlements, isLoading } = useEntitlements();

  const hasAccess = useMemo(() => {
    if (!entitlements) return false;
    return hasFeatureAccess(entitlements, feature);
  }, [entitlements, feature]);

  return {
    hasAccess,
    isLoading,
    featureName: FEATURE_NAMES[feature] || feature,
  };
}

/**
 * Hook to get client capacity info
 */
export function useClientCapacity(currentClientCount: number) {
  const { clientLimit } = useEntitlements();

  return useMemo(() => {
    const remaining = Math.max(0, clientLimit - currentClientCount);
    const atLimit = currentClientCount >= clientLimit;
    const percentUsed = clientLimit > 0 ? Math.min(100, (currentClientCount / clientLimit) * 100) : 0;

    return {
      current: currentClientCount,
      limit: clientLimit,
      remaining,
      atLimit,
      percentUsed,
    };
  }, [clientLimit, currentClientCount]);
}

/**
 * Hook to get full subscription details
 */
export function useSubscription() {
  const { user } = useGlobalData();
  const isCoach = user?.userType === 'coach';

  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isCoach,
  });

  // Computed values
  const computed = useMemo(() => {
    if (!subscription) {
      return {
        plan: 'starter' as const,
        clientLimit: 5,
        totalMonthlyCents: 0,
        activeAddons: [] as AddonType[],
        billingInterval: null,
        isCancelling: false,
        nextBillingDate: null,
      };
    }

    const activeAddons = subscription.addons
      ?.filter(a => a.is_active)
      .map(a => a.addon_type) || [];

    const addonTotal = subscription.addons
      ?.filter(a => a.is_active)
      .reduce((sum, a) => sum + a.price_cents, 0) || 0;

    return {
      plan: subscription.plan_type,
      clientLimit: subscription.client_limit,
      totalMonthlyCents: subscription.current_price_cents + addonTotal,
      activeAddons,
      billingInterval: subscription.billing_interval,
      isCancelling: subscription.cancel_at_period_end,
      nextBillingDate: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null,
    };
  }, [subscription]);

  return {
    subscription,
    isLoading,
    error,
    refetch,
    ...computed,
  };
}
