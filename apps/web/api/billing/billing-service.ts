import { apiFetch } from '../api-client';

// ─── Types ────────────────────────────────────────────────────

export type PlanType = 'starter' | 'pro' | 'max';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused' | 'unpaid';
export type AddonType = 'automations' | 'ai_assistant' | 'payments';
export type BillingInterval = 'month' | 'year';

export interface PlatformSubscription {
  id: string;
  coach_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan_type: PlanType;
  client_limit: number;
  billing_interval: BillingInterval | null;
  current_price_cents: number;
  currency: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  addons: PlatformAddon[];
  created_at: string;
  updated_at: string;
}

export interface PlatformAddon {
  id: string;
  coach_id: string;
  addon_type: AddonType;
  stripe_subscription_item_id: string | null;
  price_cents: number;
  billing_interval: BillingInterval | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

export interface BillingActivity {
  id: string;
  coach_id: string;
  event_type: string;
  description: string;
  amount_cents: number | null;
  currency: string;
  subscription_id: string | null;
  addon_id: string | null;
  metadata: Record<string, any>;
  stripe_event_id: string | null;
  created_at: string;
}

// ─── API Functions ────────────────────────────────────────────

/**
 * Get current subscription status
 */
export async function getSubscription(): Promise<PlatformSubscription> {
  return apiFetch('/billing/subscription');
}

/**
 * Get coach entitlements for feature gating
 */
export async function getEntitlements(): Promise<CoachEntitlements> {
  return apiFetch('/billing/entitlements');
}

/**
 * Get billing activity log
 */
export async function getBillingActivity(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: BillingActivity[]; total: number }> {
  return apiFetch('/billing/activity', { params });
}

/**
 * Create checkout session for plan/addons
 */
export async function createCheckoutSession(options: {
  plan: PlanType;
  clientLimit: number;
  interval: BillingInterval;
  addons?: AddonType[];
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  return apiFetch('/billing/checkout', {
    method: 'POST',
    body: options,
  });
}

/**
 * Create customer portal session for managing billing
 */
export async function createPortalSession(returnUrl?: string): Promise<{ url: string }> {
  return apiFetch('/billing/portal', {
    method: 'POST',
    body: { returnUrl },
  });
}

/**
 * Update plan (upgrade/downgrade)
 */
export async function updatePlan(options: {
  plan: PlanType;
  clientLimit: number;
  interval: BillingInterval;
}): Promise<{ success: boolean }> {
  return apiFetch('/billing/plan', {
    method: 'PATCH',
    body: options,
  });
}

/**
 * Update addons (add/remove)
 */
export async function updateAddons(addons: AddonType[]): Promise<{ success: boolean }> {
  return apiFetch('/billing/addons', {
    method: 'PATCH',
    body: { addons },
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(options?: {
  cancelImmediately?: boolean;
  reason?: string;
}): Promise<{ success: boolean }> {
  return apiFetch('/billing/cancel', {
    method: 'POST',
    body: options || {},
  });
}

/**
 * Reactivate subscription (if scheduled for cancellation)
 */
export async function reactivateSubscription(): Promise<{ success: boolean }> {
  return apiFetch('/billing/reactivate', {
    method: 'POST',
  });
}

// ─── Helper Functions ─────────────────────────────────────────

/**
 * Check if subscription is active (can use features)
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return ['active', 'trialing'].includes(status);
}

/**
 * Check if coach has access to a feature
 */
export function hasFeatureAccess(
  entitlements: CoachEntitlements,
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
): boolean {
  return entitlements[feature] === true;
}

/**
 * Get remaining client capacity
 */
export function getClientCapacity(
  entitlements: CoachEntitlements,
  currentClientCount: number
): { remaining: number; limit: number; atLimit: boolean } {
  return {
    remaining: Math.max(0, entitlements.client_limit - currentClientCount),
    limit: entitlements.client_limit,
    atLimit: currentClientCount >= entitlements.client_limit,
  };
}

/**
 * Format price for display
 */
export function formatPrice(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: PlanType): string {
  const names: Record<PlanType, string> = {
    starter: 'Starter',
    pro: 'Pro',
    max: 'Max',
  };
  return names[plan];
}

/**
 * Get addon display name
 */
export function getAddonDisplayName(addon: AddonType): string {
  const names: Record<AddonType, string> = {
    automations: 'Automations',
    ai_assistant: 'AI Assistant (Lyra)',
    payments: 'Payments',
  };
  return names[addon];
}

// ─── AI Assistant Usage ──────────────────────────────────────

export interface AiPromptUsage {
  current_count: number;
  daily_limit: number;
  remaining: number;
  is_limited: boolean;
}

export interface AiPromptCheckResult {
  allowed: boolean;
  current_count: number;
  daily_limit: number;
  remaining: number;
}

/**
 * Get current AI prompt usage for the day
 */
export async function getAiPromptUsage(): Promise<AiPromptUsage> {
  return apiFetch('/billing/ai-usage');
}

/**
 * Check if AI prompt is allowed and increment count if so
 * Call this BEFORE making an AI request during trial
 */
export async function checkAndIncrementAiPrompt(): Promise<AiPromptCheckResult> {
  return apiFetch('/billing/ai-usage/check', {
    method: 'POST',
  });
}
