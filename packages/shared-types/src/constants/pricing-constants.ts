/**
 * Pricing Constants
 *
 * Centralized pricing configuration for all plans and add-ons.
 * Used by both marketing and web apps.
 */

export type Plan = 'starter' | 'pro' | 'max';
export type BillingInterval = 'monthly' | 'annual';

export interface PlanConfig {
  monthlyPrice: number;
  annualPrice: number;
  baseClients: number;
  extraClientPrice: number;
  maxClients: number;
}

export interface AddonConfig {
  key: string;
  monthlyPrice: number;
  annualPrice: number;
  icon: 'automations' | 'broadcast' | 'ai' | 'payments';
}

/**
 * Base plan configurations
 */
export const PLANS: Record<Plan, PlanConfig> = {
  starter: { monthlyPrice: 0, annualPrice: 0, baseClients: 5, extraClientPrice: 0, maxClients: 5 },
  pro: { monthlyPrice: 7, annualPrice: 6, baseClients: 5, extraClientPrice: 2, maxClients: 300 },
  max: { monthlyPrice: 59, annualPrice: 49, baseClients: 50, extraClientPrice: 1, maxClients: 500 },
};

/**
 * Pro plan pricing tiers - price decreases per client as volume increases
 * Format: { clients: [monthlyPrice, annualPrice] }
 */
export const PRO_PRICING: Record<number, [number, number]> = {
  5: [7, 6],        // $1.40/client
  10: [12, 10],     // $1.20/client
  20: [20, 17],     // $1.00/client
  50: [40, 33],     // $0.80/client
  75: [53, 44],     // $0.71/client
  100: [65, 54],    // $0.65/client
  125: [77, 64],    // $0.62/client
  150: [86, 72],    // $0.57/client
  200: [100, 83],   // $0.50/client
  250: [111, 93],   // $0.44/client
  300: [121, 101],  // $0.40/client
};

/**
 * Max plan pricing tiers - higher base price (more features), but better per-client at scale
 * Format: { clients: [monthlyPrice, annualPrice] }
 */
export const MAX_PRICING: Record<number, [number, number]> = {
  50: [59, 49],     // $1.18/client
  75: [83, 69],     // $1.11/client
  100: [105, 88],   // $1.05/client
  150: [136, 113],  // $0.91/client
  200: [164, 137],  // $0.82/client
  250: [188, 157],  // $0.75/client
  300: [210, 175],  // $0.70/client
  350: [229, 191],  // $0.65/client
  400: [244, 203],  // $0.61/client
  450: [256, 213],  // $0.57/client
  500: [266, 222],  // $0.53/client
};

/**
 * Available client options for each plan
 */
export const PRO_CLIENT_OPTIONS = [5, 10, 20, 50, 75, 100, 125, 150, 200, 250, 300];
export const MAX_CLIENT_OPTIONS = [50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500];

/**
 * Add-on configurations
 */
export const ADDONS: AddonConfig[] = [
  { key: 'automations', monthlyPrice: 35, annualPrice: 29, icon: 'automations' },
  { key: 'aiAssistant', monthlyPrice: 20, annualPrice: 17, icon: 'ai' },
  { key: 'payments', monthlyPrice: 10, annualPrice: 8, icon: 'payments' },
];
