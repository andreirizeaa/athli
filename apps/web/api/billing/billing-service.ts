import { apiFetch } from '../api-client';

// Re-export shared types for convenience
export type {
  PlanType,
  PlatformSubscriptionStatus,
  CoachEntitlements,
} from '@athli/shared-types/entitlements-schema';

// Import for internal use
import type { PlanType, PlatformSubscriptionStatus, CoachEntitlements } from '@athli/shared-types/entitlements-schema';

// ─── Types ────────────────────────────────────────────────────

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
  status: PlatformSubscriptionStatus;
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
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
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

/**
 * Cancel addon (schedule for end of period)
 */
export async function cancelAddon(addonType: AddonType): Promise<{ success: boolean }> {
  return apiFetch(`/billing/addons/${addonType}/cancel`, {
    method: 'POST',
  });
}

/**
 * Reactivate addon (undo scheduled cancellation)
 */
export async function reactivateAddon(addonType: AddonType): Promise<{ success: boolean }> {
  return apiFetch(`/billing/addons/${addonType}/reactivate`, {
    method: 'POST',
  });
}

// ─── Helper Functions ─────────────────────────────────────────

/**
 * Check if subscription is active (can use features)
 */
export function isSubscriptionActive(status: PlatformSubscriptionStatus): boolean {
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

// ─── Referrals ───────────────────────────────────────────────

export type ReferralStatus = 'trial_started' | 'trial_ended' | 'converted' | 'credit_received';

export interface Referral {
  id: string;
  coach_name: string;
  profile_picture_url: string | null;
  status: ReferralStatus;
  credit_earned_cents: number;
  trial_started_at?: string;
  trial_ended_at?: string | null;
  converted_at?: string | null;
  created_at: string;
}

export interface ReferredBy {
  id: string;
  coach_name: string;
  profile_picture_url: string | null;
  status: 'credit_received';
  credit_earned_cents: number;
  converted_at: string | null;
  created_at: string;
}

export interface ReferralCredits {
  total_earned_cents: number;
  active_cents: number;
  used_cents: number;
}

export interface ReferralsResponse {
  referrals: Referral[];
  referred_by: ReferredBy | null;
  credits: ReferralCredits;
}

/**
 * Get referrals made by this coach and credit stats
 */
export async function getReferrals(): Promise<ReferralsResponse> {
  return apiFetch('/billing/referrals');
}

/**
 * Send a referral invite email to a friend
 */
export async function sendReferralInvite(email: string): Promise<{ success: boolean }> {
  return apiFetch('/billing/referral-invite', {
    method: 'POST',
    body: { email },
  });
}

/**
 * Apply a referral code to the current coach's account
 * This links them as being referred by the coach who owns the code
 */
export async function applyReferralCode(code: string): Promise<{ success: boolean; referrerName?: string; error?: string }> {
  return apiFetch('/billing/apply-referral', {
    method: 'POST',
    body: { code },
  });
}

/**
 * Lookup referral code info (public - no auth required)
 * Used on the referral landing page to show who invited the user
 */
export interface ReferrerInfo {
  name: string;
  profilePictureUrl: string | null;
}

export async function lookupReferralCode(code: string): Promise<ReferrerInfo> {
  return apiFetch(`/billing/referral-lookup/${encodeURIComponent(code)}`);
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
