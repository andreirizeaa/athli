/**
 * Payment Schema
 *
 * Types for the Stripe Connect payment system — coach packages,
 * payments, subscriptions, assignments, and access gating.
 */

// --- Coach Stripe Account ---

export interface CoachStripeAccount {
  coach_id: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  default_currency: string | null;
  country: string | null;
  account_type: 'express' | 'standard';
  created_at: string;
  updated_at: string;
}

// --- Coach Packages ---

export type PackageInterval = 'one_time' | 'week' | 'month' | 'year';

export interface CoachPackage {
  id: string;
  coach_id: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  name: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  interval: PackageInterval;
  interval_count: number | null;
  is_active: boolean;
  is_visible: boolean;
  features: string[];
  free_trial_days: number;
  initial_fee_cents: number;
  onboarding_id: string | null;
  sequence_id: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// --- Client Package Assignments ---

export interface ClientPackageAssignment {
  id: string;
  coach_id: string;
  client_id: string;
  package_id: string;
  assigned_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  package?: CoachPackage;
  payment_status?: PaymentStatus;
}

// --- Payments ---

export type PaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'disputed'
  | 'cancelled';

export interface Payment {
  id: string;
  coach_id: string;
  client_id: string;
  package_id: string | null;
  coupon_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  package?: CoachPackage;
  client_name?: string;
}

// --- Per-Package Coupon Redemptions ---

export interface PackageCouponRedemption {
  coupon_id: string;
  coupon_name: string;
  coupon_code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  redemption_count: number;
}

// --- Client Subscriptions ---

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'unpaid'
  | 'trialing';

export interface ClientSubscription {
  id: string;
  coach_id: string;
  client_id: string;
  package_id: string | null;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  package?: CoachPackage;
}

// --- Access Gating ---

export interface ClientAccessStatus {
  has_access: boolean;
  in_grace_period: boolean;
  grace_period_ends_at: string | null;
  assigned_packages: ClientPackageAssignment[];
  available_packages: CoachPackage[];
}

// --- Dashboard Summary ---

export interface CoachPaymentDashboard {
  gross_revenue_cents: number;
  this_month_revenue_cents: number;
  last_month_revenue_cents: number;
  active_subscriptions_count: number;
  paying_clients_count: number;
  currency: string;
}

export interface PaymentActivityRow {
  id: string;
  client_id: string;
  client_name: string | null;
  client_email: string | null;
  package_id: string | null;
  package_name: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  failure_reason: string | null;
  payment_type: 'one_time' | 'subscription';
  paid_at: string | null;
  created_at: string;
}

// --- Package Payment Stats ---

export interface PackagePaymentStats {
  total_purchases: number;
  total_refunds: number;
  total_cancellations: number;
  total_revenue_cents: number;
  currency: string;
}

// --- Analytics ---

export interface CoachPaymentAnalytics {
  coach_id: string;
  total_revenue_cents: number;
  successful_count: number;
  failed_count: number;
  paying_client_count: number;
  last_payment_at: string | null;
}

export interface CoachClientPaymentSummary {
  coach_id: string;
  client_id: string;
  total_paid_cents: number;
  successful_count: number;
  failed_count: number;
  last_payment_at: string | null;
  last_failure_at: string | null;
}

// --- Coach Sequences ---

export interface CoachSequence {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  flow_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Coupons ---

export interface Coupon {
  id: string;
  coach_id: string;
  stripe_coupon_id: string | null;
  stripe_promo_code_id: string | null;
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  duration_months: number | null;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
