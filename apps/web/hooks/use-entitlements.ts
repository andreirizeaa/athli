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
  type PlanType,
  type BillingInterval,
} from '@/api/billing/billing-service';
import { useGlobalData } from '@/providers/global-data-provider';
import { PRO_PRICING, MAX_PRICING, ADDONS } from '@athli/shared-types/pricing-constants';

// Helper to calculate plan price based on type and client limit
function getPlanPriceCents(plan: PlanType, clientLimit: number, interval: BillingInterval | null): number {
  if (plan === 'starter' || !interval) return 0;

  const pricing = plan === 'pro' ? PRO_PRICING : MAX_PRICING;
  const tier = pricing[clientLimit];

  if (!tier) {
    // Find closest tier
    const tiers = Object.keys(pricing).map(Number).sort((a, b) => a - b);
    const closest = tiers.reduce((prev, curr) =>
      Math.abs(curr - clientLimit) < Math.abs(prev - clientLimit) ? curr : prev
    );
    const closestTier = pricing[closest];
    return (interval === 'year' ? closestTier[1] * 12 : closestTier[0]) * 100;
  }

  return (interval === 'year' ? tier[1] * 12 : tier[0]) * 100;
}

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
        cancellingAddons: [] as AddonType[],
        billingInterval: null,
        isCancelling: false,
        nextBillingDate: null,
        // Scheduled changes
        hasScheduledChanges: false,
        scheduledPlan: null as string | null,
        scheduledClientLimit: null as number | null,
        scheduledPriceCents: null as number | null,
      };
    }

    const activeAddons = subscription.addons
      ?.filter(a => a.is_active)
      .map(a => a.addon_type) || [];

    // Track which addons are scheduled for cancellation
    const cancellingAddons = subscription.addons
      ?.filter(a => a.is_active && a.cancel_at_period_end)
      .map(a => a.addon_type) || [];

    // Calculate addon total from active addons using pricing constants
    // Map addon_type to ADDONS key: ai_assistant -> aiAssistant, etc.
    const addonKeyMap: Record<AddonType, string> = {
      ai_assistant: 'aiAssistant',
      automations: 'automations',
      payments: 'payments',
    };

    const activeAddonTypes = subscription.addons
      ?.filter(a => a.is_active)
      .map(a => a.addon_type) || [];

    const addonTotalCents = activeAddonTypes.reduce((sum, addonType) => {
      const addonKey = addonKeyMap[addonType];
      const addon = ADDONS.find(a => a.key === addonKey);
      if (!addon) return sum;
      const price = subscription.billing_interval === 'year'
        ? addon.annualPrice * 12 * 100
        : addon.monthlyPrice * 100;
      return sum + price;
    }, 0);

    // Calculate current plan price from pricing constants (source of truth)
    // This ensures consistency with the update page pricing
    const currentPlanPriceCents = getPlanPriceCents(
      subscription.plan_type as PlanType,
      subscription.client_limit,
      subscription.billing_interval
    );

    // Calculate scheduled price if there are pending changes
    const hasScheduledChanges = !!(subscription.scheduled_plan_type || subscription.scheduled_client_limit || cancellingAddons.length > 0);

    let scheduledPriceCents: number | null = null;
    if (hasScheduledChanges) {
      // Calculate what the price will be after scheduled changes
      const futurePlan = subscription.scheduled_plan_type || subscription.plan_type;
      const futureClientLimit = subscription.scheduled_client_limit || subscription.client_limit;

      // Calculate future plan price
      const futurePlanPriceCents = getPlanPriceCents(
        futurePlan as PlanType,
        futureClientLimit,
        subscription.billing_interval
      );

      // Calculate future addon total (only addons not scheduled for cancellation)
      const futureAddonTypes = subscription.addons
        ?.filter(a => a.is_active && !a.cancel_at_period_end)
        .map(a => a.addon_type) || [];

      const futureAddonTotalCents = futureAddonTypes.reduce((sum, addonType) => {
        const addonKey = addonKeyMap[addonType];
        const addon = ADDONS.find(a => a.key === addonKey);
        if (!addon) return sum;
        const price = subscription.billing_interval === 'year'
          ? addon.annualPrice * 12 * 100
          : addon.monthlyPrice * 100;
        return sum + price;
      }, 0);

      scheduledPriceCents = futurePlanPriceCents + futureAddonTotalCents;
    }

    return {
      plan: subscription.plan_type,
      clientLimit: subscription.client_limit,
      totalMonthlyCents: currentPlanPriceCents + addonTotalCents,
      activeAddons,
      cancellingAddons,
      billingInterval: subscription.billing_interval,
      isCancelling: subscription.cancel_at_period_end,
      nextBillingDate: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null,
      // Scheduled changes
      hasScheduledChanges,
      scheduledPlan: subscription.scheduled_plan_type,
      scheduledClientLimit: subscription.scheduled_client_limit,
      scheduledPriceCents,
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
