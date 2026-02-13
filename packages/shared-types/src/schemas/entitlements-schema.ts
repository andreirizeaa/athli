/**
 * Coach entitlements types and constants for feature gating
 * Shared between web and mobile apps
 */

// ============================================================================
// Types
// ============================================================================

export type PlanType = 'starter' | 'pro' | 'max';

export type PlatformSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'unpaid';

export type AddonKey = 'automations' | 'ai_assistant' | 'payments';

export type FeatureKey =
  | 'ai_workout_builder'
  | 'custom_exercises'
  | 'custom_sections'
  | 'questionnaires'
  | 'habits_metrics'
  | 'photo_tracking'
  | 'exercise_history'
  | 'file_storage'
  | 'broadcast_messaging'
  | 'ai_todo_list'
  | 'priority_support'
  | 'automations'
  | 'ai_assistant'
  | 'payments';

export type LegacyFeatureKey = 'forms' | 'flows' | 'packages' | 'lyra';

export interface CoachEntitlements {
  coach_id: string;
  plan_type: PlanType;
  client_limit: number;
  has_ai_workout_builder: boolean;
  has_custom_exercises: boolean;
  has_questionnaires: boolean;
  has_habits_metrics: boolean;
  has_photo_tracking: boolean;
  has_exercise_history: boolean;
  storage_limit_gb: number;
  has_broadcast_messaging: boolean;
  has_ai_todo_list: boolean;
  has_priority_support: boolean;
  has_automations: boolean;
  has_ai_assistant: boolean;
  has_payments: boolean;
  subscription_status: PlatformSubscriptionStatus;
  is_trial: boolean;
  trial_ends_at: string | null;
}

// ============================================================================
// Constants
// ============================================================================

/** Default entitlements for starter plan */
export const DEFAULT_ENTITLEMENTS: Omit<CoachEntitlements, 'coach_id'> = {
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

/** Trial entitlements: Max plan features + automations + AI assistant, but NO payments */
export const TRIAL_ENTITLEMENTS: Omit<CoachEntitlements, 'coach_id'> = {
  plan_type: 'max',
  client_limit: 50,
  has_ai_workout_builder: true,
  has_custom_exercises: true,
  has_questionnaires: true,
  has_habits_metrics: true,
  has_photo_tracking: true,
  has_exercise_history: true,
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

/** Pro plan entitlements without any add-ons (for simulation/testing) */
export const PRO_ENTITLEMENTS: Omit<CoachEntitlements, 'coach_id'> = {
  plan_type: 'pro',
  client_limit: 50,
  has_ai_workout_builder: true,
  has_custom_exercises: true,
  has_questionnaires: true,
  has_habits_metrics: true,
  has_photo_tracking: true,
  has_exercise_history: true,
  storage_limit_gb: 5, // 5GB for pro
  has_broadcast_messaging: true,
  has_ai_todo_list: true,
  has_priority_support: false,
  has_automations: false, // No automations add-on
  has_ai_assistant: false, // No AI assistant add-on
  has_payments: false, // No payments add-on
  subscription_status: 'active',
  is_trial: false,
  trial_ends_at: null,
};

/** Trial duration in days */
export const TRIAL_DURATION_DAYS = 30;

/** Mapping of legacy feature keys to new entitlement keys */
export const FEATURE_TO_ENTITLEMENT: Record<LegacyFeatureKey, FeatureKey> = {
  forms: 'questionnaires',
  flows: 'automations',
  packages: 'payments',
  lyra: 'ai_assistant',
};

/** Which addon is required for each feature */
export const FEATURE_ADDON_MAP: Record<string, AddonKey | undefined> = {
  flows: 'automations',
  packages: 'payments',
  lyra: 'ai_assistant',
  automations: 'automations',
  ai_assistant: 'ai_assistant',
  payments: 'payments',
};

/** Feature labels and descriptions for UI */
export const FEATURE_INFO: Record<string, { label: string; description: string }> = {
  forms: {
    label: 'Forms',
    description: 'Check-in forms and questionnaires',
  },
  flows: {
    label: 'Automations',
    description: 'Automated workflow sequences and onboarding flows',
  },
  packages: {
    label: 'Packages & Payments',
    description: 'Create packages and accept payments from clients',
  },
  lyra: {
    label: 'AI Assistant',
    description: 'Lyra AI-powered workout generation and insights',
  },
  automations: {
    label: 'Automations',
    description: 'Automated workflow sequences and onboarding flows',
  },
  ai_assistant: {
    label: 'AI Assistant',
    description: 'Lyra AI-powered workout generation and insights',
  },
  payments: {
    label: 'Packages & Payments',
    description: 'Create packages and accept payments from clients',
  },
  custom_sections: {
    label: 'Custom Sections',
    description: 'Create custom workout sections',
  },
  custom_exercises: {
    label: 'Custom Exercises',
    description: 'Create your own exercises',
  },
  ai_workout_builder: {
    label: 'AI Workout Builder',
    description: 'Generate workouts using AI',
  },
  questionnaires: {
    label: 'Questionnaires & Check-ins',
    description: 'Assign questionnaires and check-ins to clients',
  },
  habits_metrics: {
    label: 'Habits & Metrics',
    description: 'Track client habits and metrics',
  },
  photo_tracking: {
    label: 'Photo Tracking',
    description: 'Track client progress with photos',
  },
  exercise_history: {
    label: 'Exercise History',
    description: 'Track exercise progress over time',
  },
  file_storage: {
    label: 'File Storage',
    description: 'Upload and share files with clients',
  },
  broadcast_messaging: {
    label: 'Broadcast Messaging',
    description: 'Send messages to multiple clients at once',
  },
  ai_todo_list: {
    label: 'AI Todo List',
    description: 'AI-generated task suggestions',
  },
  priority_support: {
    label: 'Priority Support',
    description: 'Get priority support from the Athli team',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the coach is still on their 30-day trial
 * @param coachCreatedAt - ISO date string of when coach was created
 * @param forceSimulateStarter - Dev flag to force simulate starter plan
 */
export function calculateIsOnTrial(
  coachCreatedAt: string | undefined | null,
  forceSimulateStarter = false
): boolean {
  // DEV: Force simulate starter plan
  if (forceSimulateStarter) return false;

  if (!coachCreatedAt) return false;

  const creationDate = new Date(coachCreatedAt);
  const today = new Date();
  const trialEndDate = new Date(creationDate);
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS);

  return today <= trialEndDate;
}

/**
 * Calculate trial end date from coach creation date
 */
export function calculateTrialEndDate(coachCreatedAt: string): string {
  const creationDate = new Date(coachCreatedAt);
  const trialEndDate = new Date(creationDate);
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS);
  return trialEndDate.toISOString();
}

/**
 * Normalize feature key (handle legacy keys)
 */
export function normalizeFeatureKey(feature: FeatureKey | LegacyFeatureKey): FeatureKey {
  return FEATURE_TO_ENTITLEMENT[feature as LegacyFeatureKey] || (feature as FeatureKey);
}

/**
 * Check if user has access to a feature based on entitlements
 */
export function checkFeatureAccess(
  entitlements: CoachEntitlements | null,
  feature: FeatureKey | LegacyFeatureKey,
  isOnTrial: boolean
): boolean {
  const entitlementKey = normalizeFeatureKey(feature);

  // On trial - all features except payments
  if (isOnTrial) {
    return entitlementKey !== 'payments';
  }

  // No entitlements loaded - deny access
  if (!entitlements) {
    return false;
  }

  switch (entitlementKey) {
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
    case 'photo_tracking':
      return entitlements.has_photo_tracking;
    case 'exercise_history':
      return entitlements.has_exercise_history;
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
}

/**
 * Check if user has access to an addon based on entitlements
 */
export function checkAddonAccess(
  entitlements: CoachEntitlements | null,
  addon: AddonKey,
  isOnTrial: boolean
): boolean {
  // On trial - all addons except payments
  if (isOnTrial) {
    return addon !== 'payments';
  }

  // No entitlements loaded - deny access
  if (!entitlements) {
    return false;
  }

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
}

/**
 * Get feature info (label and description)
 */
export function getFeatureInfo(feature: FeatureKey | LegacyFeatureKey): {
  label: string;
  description: string;
  requiredAddon?: AddonKey;
} {
  const info = FEATURE_INFO[feature] || { label: feature, description: '' };
  const requiredAddon = FEATURE_ADDON_MAP[feature];
  return { ...info, requiredAddon };
}
