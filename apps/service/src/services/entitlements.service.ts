import { getSupabaseClient } from './supabase.service';
import { logger } from '../config/logger';

// ─── Types ────────────────────────────────────────────────────

export type PlanType = 'starter' | 'pro' | 'max';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused' | 'unpaid';

export interface CoachEntitlements {
  coach_id: string;
  plan_type: PlanType;
  client_limit: number;
  // Plan features
  has_ai_workout_builder: boolean;
  has_custom_exercises: boolean;
  has_questionnaires: boolean;
  has_habits_metrics: boolean;
  storage_limit_gb: number; // -1 = unlimited
  has_broadcast_messaging: boolean;
  has_ai_todo_list: boolean;
  has_priority_support: boolean;
  // Addon features
  has_automations: boolean;
  has_ai_assistant: boolean;
  has_payments: boolean;
  // Status
  subscription_status: SubscriptionStatus;
  is_trial: boolean;
  trial_ends_at: string | null;
}

// Default entitlements for starter plan
const STARTER_ENTITLEMENTS: Omit<CoachEntitlements, 'coach_id'> = {
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

// ─── Service Functions ────────────────────────────────────────

/**
 * Get coach entitlements from the database (cached values)
 */
export async function getCoachEntitlements(coachId: string): Promise<CoachEntitlements> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('coach_entitlements')
    .select('*')
    .eq('coach_id', coachId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error.message, coachId }, 'Failed to get coach entitlements');
  }

  if (!data) {
    return { coach_id: coachId, ...STARTER_ENTITLEMENTS };
  }

  return data as CoachEntitlements;
}

/**
 * Check if coach can add more clients
 */
export async function canAddClient(coachId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = getSupabaseClient();
  const entitlements = await getCoachEntitlements(coachId);

  // Get current active client count
  const { count, error } = await supabase
    .from('coach_client_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'accepted');

  if (error) {
    logger.error({ err: error.message, coachId }, 'Failed to get client count');
    return { allowed: false, current: 0, limit: entitlements.client_limit };
  }

  const currentCount = count || 0;
  const allowed = currentCount < entitlements.client_limit;

  return {
    allowed,
    current: currentCount,
    limit: entitlements.client_limit,
  };
}

/**
 * Check if coach has access to a specific feature
 */
export async function hasFeatureAccess(
  coachId: string,
  feature: keyof Pick<
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
  >
): Promise<boolean> {
  const entitlements = await getCoachEntitlements(coachId);
  return entitlements[feature] === true;
}

/**
 * Check storage access (returns remaining storage in GB, -1 = unlimited)
 */
export async function getStorageAccess(coachId: string): Promise<{
  limit_gb: number;
  used_gb: number;
  remaining_gb: number;
  unlimited: boolean;
}> {
  const supabase = getSupabaseClient();
  const entitlements = await getCoachEntitlements(coachId);

  // If unlimited, return early
  if (entitlements.storage_limit_gb === -1) {
    return { limit_gb: -1, used_gb: 0, remaining_gb: -1, unlimited: true };
  }

  // Calculate used storage (would need to query storage bucket)
  // For now, return 0 used - implement actual calculation when needed
  const usedGb = 0;

  return {
    limit_gb: entitlements.storage_limit_gb,
    used_gb: usedGb,
    remaining_gb: entitlements.storage_limit_gb - usedGb,
    unlimited: false,
  };
}

/**
 * Check if subscription is in good standing (can use features)
 */
export async function isSubscriptionActive(coachId: string): Promise<boolean> {
  const entitlements = await getCoachEntitlements(coachId);
  const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];
  return activeStatuses.includes(entitlements.subscription_status);
}

/**
 * Middleware helper to check feature access
 */
export function requireFeature(
  feature: keyof Pick<
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
  >
) {
  return async (req: any, res: any, next: any) => {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasAccess = await hasFeatureAccess(coachId, feature);

    if (!hasAccess) {
      const featureNames: Record<string, string> = {
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

      return res.status(403).json({
        error: 'Feature not available',
        feature: featureNames[feature] || feature,
        message: `This feature requires a plan upgrade or add-on.`,
        upgrade_required: true,
      });
    }

    next();
  };
}

/**
 * Middleware helper to check client limit
 */
export function requireClientCapacity() {
  return async (req: any, res: any, next: any) => {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { allowed, current, limit } = await canAddClient(coachId);

    if (!allowed) {
      return res.status(403).json({
        error: 'Client limit reached',
        current,
        limit,
        message: `You have reached your client limit (${current}/${limit}). Upgrade your plan to add more clients.`,
        upgrade_required: true,
      });
    }

    next();
  };
}
