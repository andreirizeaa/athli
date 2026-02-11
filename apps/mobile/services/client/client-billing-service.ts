import { apiFetch } from '@/lib/api-client';

/**
 * Package assignment with subscription info
 */
export interface ClientPackage {
  id: string;
  coach_id: string;
  package_id: string;
  assigned_at: string;
  is_active: boolean;
  package: {
    id: string;
    name: string;
    description: string | null;
    amount_cents: number;
    currency: string;
    interval: 'one_time' | 'week' | 'month' | 'year';
    interval_count: number | null;
    image_url: string | null;
    features: string[] | null;
  } | null;
  subscription: {
    id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    status: 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'trialing';
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    cancel_at: string | null;
    cancelled_at: string | null;
  } | null;
}

/**
 * Fetch all packages for the authenticated client
 */
export async function getMyPackages(): Promise<ClientPackage[]> {
  try {
    const response = await apiFetch<{
      success: boolean;
      data: { packages: ClientPackage[] };
    }>('/payments/client/packages');

    return response.data.packages || [];
  } catch (error) {
    console.error('[getMyPackages] Error:', error);
    throw error;
  }
}

/**
 * Create a Stripe billing portal session for managing a subscription
 */
export async function createBillingPortalSession(subscriptionId: string): Promise<string> {
  try {
    const response = await apiFetch<{
      success: boolean;
      data: { url: string };
    }>('/payments/client/billing-portal', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    });

    return response.data.url;
  } catch (error) {
    console.error('[createBillingPortalSession] Error:', error);
    throw error;
  }
}
