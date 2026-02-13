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
 * Annual discount percentage (17% off)
 */
export const ANNUAL_DISCOUNT_PERCENT = 17;

/**
 * Base plan configurations
 */
export const PLANS: Record<Plan, PlanConfig> = {
  starter: { monthlyPrice: 0, annualPrice: 0, baseClients: 5, extraClientPrice: 0, maxClients: 5 },
  pro: { monthlyPrice: 20, annualPrice: 17, baseClients: 5, extraClientPrice: 2, maxClients: 300 },
  max: { monthlyPrice: 99, annualPrice: 82, baseClients: 50, extraClientPrice: 1, maxClients: 500 },
};

/**
 * Pro plan pricing tiers - price decreases per client as volume increases
 * Annual prices are ~17% off monthly (rounded to whole numbers)
 * Format: { clients: [monthlyPrice, annualPrice] }
 */
export const PRO_PRICING: Record<number, [number, number]> = {
  5: [20, 17],      // $4.00/client
  10: [28, 23],     // $2.80/client
  20: [48, 40],     // $2.40/client
  50: [90, 75],     // $1.80/client
  75: [120, 100],   // $1.60/client
  100: [145, 120],  // $1.45/client
  125: [170, 141],  // $1.36/client
  150: [195, 162],  // $1.30/client
  200: [235, 195],  // $1.18/client
  250: [260, 216],  // $1.04/client
  300: [280, 232],  // $0.93/client
};

/**
 * Max plan pricing tiers - includes all Pro features plus advanced capabilities
 * Always slightly more expensive than Pro at overlapping client tiers
 * Annual prices are ~17% off monthly (rounded to whole numbers)
 * Format: { clients: [monthlyPrice, annualPrice] }
 */
export const MAX_PRICING: Record<number, [number, number]> = {
  50: [99, 82],     // $1.98/client (Pro: $1.80)
  75: [130, 108],   // $1.73/client (Pro: $1.60)
  100: [158, 131],  // $1.58/client (Pro: $1.45)
  150: [210, 174],  // $1.40/client (Pro: $1.30)
  200: [255, 212],  // $1.28/client (Pro: $1.18)
  250: [295, 245],  // $1.18/client (Pro: $1.04)
  300: [330, 274],  // $1.10/client (Pro: $0.93)
  350: [360, 299],  // $1.03/client
  400: [390, 324],  // $0.98/client
  450: [405, 336],  // $0.90/client
  500: [420, 349],  // $0.84/client
};

/**
 * Available client options for each plan
 */
export const PRO_CLIENT_OPTIONS = [5, 10, 20, 50, 75, 100, 125, 150, 200, 250, 300];
export const MAX_CLIENT_OPTIONS = [50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500];

/**
 * Add-on configurations
 * Annual prices are ~17% off monthly (rounded to whole numbers)
 */
export const ADDONS: AddonConfig[] = [
  { key: 'aiAssistant', monthlyPrice: 25, annualPrice: 21, icon: 'ai' },
  { key: 'automations', monthlyPrice: 20, annualPrice: 17, icon: 'automations' },
  { key: 'payments', monthlyPrice: 10, annualPrice: 8, icon: 'payments' },
];
