/**
 * Stripe Platform Price Service
 *
 * Manages creation and caching of Stripe products and prices for platform billing.
 * Uses the platform_stripe_prices table to avoid creating duplicate products/prices.
 */

import { getStripeClient } from './stripe.service';
import { getSupabaseClient } from './supabase.service';
import { logger } from '../config/logger';
import {
  PRO_PRICING,
  MAX_PRICING,
  ADDONS,
} from '@athli/shared-types/src/constants/pricing-constants';

// ─── Types ─────────────────────────────────────────────────────

export type PlanType = 'pro' | 'max';
export type AddonType = 'automations' | 'ai_assistant' | 'payments';
export type BillingInterval = 'month' | 'year';

interface PlanPriceConfig {
  priceType: 'plan';
  planType: PlanType;
  clientLimit: number;
  interval: BillingInterval;
}

interface AddonPriceConfig {
  priceType: 'addon';
  addonType: AddonType;
  interval: BillingInterval;
}

type PriceConfig = PlanPriceConfig | AddonPriceConfig;

interface StripePriceRecord {
  id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  price_type: 'plan' | 'addon';
  plan_type: PlanType | null;
  addon_type: AddonType | null;
  client_limit: number | null;
  billing_interval: BillingInterval;
  unit_amount_cents: number;
  currency: string;
  is_active: boolean;
}

// ─── Product ID Mapping ────────────────────────────────────────

const PRODUCT_LOOKUP_KEYS: Record<string, string> = {
  'plan_pro': 'athli_pro',
  'plan_max': 'athli_max',
  'addon_automations': 'athli_addon_automations',
  'addon_ai_assistant': 'athli_addon_ai_assistant',
  'addon_payments': 'athli_addon_payments',
};

const PRODUCT_NAMES: Record<string, string> = {
  'athli_pro': 'Athli Pro Plan',
  'athli_max': 'Athli Max Plan',
  'athli_addon_automations': 'Athli Automations Add-on',
  'athli_addon_ai_assistant': 'Athli AI Assistant Add-on',
  'athli_addon_payments': 'Athli Payments Add-on',
};

// ─── Price Calculation ─────────────────────────────────────────

function getPlanPriceCents(planType: PlanType, clientLimit: number, interval: BillingInterval): number {
  const pricing = planType === 'pro' ? PRO_PRICING : MAX_PRICING;
  const tier = pricing[clientLimit];

  if (!tier) {
    // Find closest tier
    const tiers = Object.keys(pricing).map(Number).sort((a, b) => a - b);
    const closest = tiers.reduce((prev, curr) =>
      Math.abs(curr - clientLimit) < Math.abs(prev - clientLimit) ? curr : prev
    );
    const closestTier = pricing[closest];
    const monthlyPrice = closestTier[0];
    const annualPrice = closestTier[1];
    return interval === 'year' ? annualPrice * 12 * 100 : monthlyPrice * 100;
  }

  const monthlyPrice = tier[0];
  const annualPrice = tier[1];
  return interval === 'year' ? annualPrice * 12 * 100 : monthlyPrice * 100;
}

function getAddonPriceCents(addonType: AddonType, interval: BillingInterval): number {
  const addonMap: Record<AddonType, typeof ADDONS[number]> = {
    ai_assistant: ADDONS[0],
    automations: ADDONS[1],
    payments: ADDONS[2],
  };

  const addon = addonMap[addonType];
  return interval === 'year' ? addon.annualPrice * 12 * 100 : addon.monthlyPrice * 100;
}

// ─── Stripe Product Management ─────────────────────────────────

async function getOrCreateStripeProduct(lookupKey: string): Promise<string> {
  const stripe = getStripeClient();

  // Search for existing product by metadata lookup key
  const existingProducts = await stripe.products.search({
    query: `metadata['athli_lookup_key']:'${lookupKey}'`,
  });

  if (existingProducts.data.length > 0) {
    return existingProducts.data[0].id;
  }

  // Create new product
  const productName = PRODUCT_NAMES[lookupKey] || lookupKey;
  const product = await stripe.products.create({
    name: productName,
    metadata: {
      athli_lookup_key: lookupKey,
      source: 'athli_platform',
    },
  });

  logger.info({ lookupKey, productId: product.id }, 'Created new Stripe product');
  return product.id;
}

// ─── Main Export Function ──────────────────────────────────────

/**
 * Get or create a Stripe price ID for the given configuration.
 * First checks the database cache, then creates in Stripe if not found.
 */
export async function getOrCreatePriceId(config: PriceConfig): Promise<string> {
  const supabase = getSupabaseClient();

  // Build lookup query based on config type
  let query = supabase
    .from('platform_stripe_prices')
    .select('stripe_price_id')
    .eq('price_type', config.priceType)
    .eq('billing_interval', config.interval)
    .eq('is_active', true);

  let unitAmountCents: number;
  let productLookupKey: string;
  let priceDescription: string;

  if (config.priceType === 'plan') {
    query = query
      .eq('plan_type', config.planType)
      .eq('client_limit', config.clientLimit)
      .is('addon_type', null);

    unitAmountCents = getPlanPriceCents(config.planType, config.clientLimit, config.interval);
    productLookupKey = PRODUCT_LOOKUP_KEYS[`plan_${config.planType}`];
    priceDescription = `${config.clientLimit} clients - ${config.interval === 'year' ? 'Annual' : 'Monthly'}`;
  } else {
    query = query
      .eq('addon_type', config.addonType)
      .is('plan_type', null)
      .is('client_limit', null);

    unitAmountCents = getAddonPriceCents(config.addonType, config.interval);
    productLookupKey = PRODUCT_LOOKUP_KEYS[`addon_${config.addonType}`];
    priceDescription = config.interval === 'year' ? 'Annual' : 'Monthly';
  }

  // Check cache
  const { data: existing, error: lookupError } = await query.maybeSingle();

  if (lookupError) {
    logger.error({ err: lookupError.message, config }, 'Error looking up cached price');
    throw new Error('Failed to lookup cached price');
  }

  if (existing) {
    return existing.stripe_price_id;
  }

  // Not cached - create in Stripe
  const stripe = getStripeClient();

  // Get or create the product
  const productId = await getOrCreateStripeProduct(productLookupKey);

  // Create the price
  const stripePrice = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: unitAmountCents,
    recurring: {
      interval: config.interval,
    },
    metadata: {
      athli_price_type: config.priceType,
      athli_plan_type: config.priceType === 'plan' ? config.planType : '',
      athli_addon_type: config.priceType === 'addon' ? config.addonType : '',
      athli_client_limit: config.priceType === 'plan' ? config.clientLimit.toString() : '',
      athli_billing_interval: config.interval,
    },
    nickname: priceDescription,
  });

  // Cache in database
  const insertData: Partial<StripePriceRecord> = {
    stripe_product_id: productId,
    stripe_price_id: stripePrice.id,
    price_type: config.priceType,
    billing_interval: config.interval,
    unit_amount_cents: unitAmountCents,
    currency: 'usd',
    is_active: true,
  };

  if (config.priceType === 'plan') {
    insertData.plan_type = config.planType;
    insertData.client_limit = config.clientLimit;
    insertData.addon_type = null;
  } else {
    insertData.addon_type = config.addonType;
    insertData.plan_type = null;
    insertData.client_limit = null;
  }

  const { error: insertError } = await supabase
    .from('platform_stripe_prices')
    .insert(insertData);

  if (insertError) {
    // Log but don't fail - the price was created in Stripe successfully
    logger.warn({ err: insertError.message, config }, 'Failed to cache price in database');
  } else {
    logger.info({
      priceType: config.priceType,
      priceId: stripePrice.id,
      productId,
    }, 'Created and cached new Stripe price');
  }

  return stripePrice.id;
}

/**
 * Get price ID for a plan configuration
 */
export async function getPlanPriceId(
  planType: PlanType,
  clientLimit: number,
  interval: BillingInterval
): Promise<string> {
  return getOrCreatePriceId({
    priceType: 'plan',
    planType,
    clientLimit,
    interval,
  });
}

/**
 * Get price ID for an addon configuration
 */
export async function getAddonPriceId(
  addonType: AddonType,
  interval: BillingInterval
): Promise<string> {
  return getOrCreatePriceId({
    priceType: 'addon',
    addonType,
    interval,
  });
}
