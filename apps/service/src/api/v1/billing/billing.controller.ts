import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripeClient } from '../../../services/stripe.service';
import { getSupabaseClient } from '../../../services/supabase.service';
import { logger } from '../../../config/logger';
import { PRO_PRICING, MAX_PRICING, ADDONS } from '@athli/shared-types/src/constants/pricing-constants';

// ─── Pricing Configuration ────────────────────────────────────

// Add-on pricing mapped from shared constants (uses snake_case keys for DB compatibility)
const ADDON_PRICING = {
  automations: [ADDONS[0].monthlyPrice, ADDONS[0].annualPrice],
  ai_assistant: [ADDONS[1].monthlyPrice, ADDONS[1].annualPrice],
  payments: [ADDONS[2].monthlyPrice, ADDONS[2].annualPrice],
} as const;

type PlanType = 'starter' | 'pro' | 'max';
type AddonType = 'automations' | 'ai_assistant' | 'payments';
type BillingInterval = 'month' | 'year';

// ─── Types ────────────────────────────────────────────────────

interface PlatformBillingActivityLog {
  coach_id: string;
  event_type: string;
  description: string;
  amount_cents?: number | null;
  currency?: string;
  subscription_id?: string | null;
  addon_id?: string | null;
  metadata?: Record<string, any>;
  stripe_event_id?: string | null;
}

// ─── Helper Functions ─────────────────────────────────────────

async function logPlatformBillingActivity(supabase: any, activity: PlatformBillingActivityLog) {
  try {
    await supabase.from('platform_billing_activity').insert({
      coach_id: activity.coach_id,
      event_type: activity.event_type,
      description: activity.description,
      amount_cents: activity.amount_cents || null,
      currency: activity.currency || 'usd',
      subscription_id: activity.subscription_id || null,
      addon_id: activity.addon_id || null,
      metadata: activity.metadata || {},
      stripe_event_id: activity.stripe_event_id || null,
    });
  } catch (err: any) {
    logger.warn({ err: err.message, activity }, 'Failed to log platform billing activity');
  }
}

function getPlanPricing(plan: PlanType, clientLimit: number, interval: BillingInterval): number {
  if (plan === 'starter') return 0;

  const pricing = plan === 'pro' ? PRO_PRICING : MAX_PRICING;
  const tier = pricing[clientLimit];

  if (!tier) {
    // Find closest tier
    const tiers = Object.keys(pricing).map(Number).sort((a, b) => a - b);
    const closest = tiers.reduce((prev, curr) =>
      Math.abs(curr - clientLimit) < Math.abs(prev - clientLimit) ? curr : prev
    );
    const closestTier = pricing[closest];
    return interval === 'year' ? closestTier[1] * 12 : closestTier[0];
  }

  return interval === 'year' ? tier[1] * 12 : tier[0];
}

function getAddonPricing(addon: AddonType, interval: BillingInterval): number {
  const pricing = ADDON_PRICING[addon];
  return interval === 'year' ? pricing[1] * 12 : pricing[0];
}

// ─── Controller ───────────────────────────────────────────────

export const billingController = {
  // ─── Get Subscription Status ─────────────────────────────────

  getSubscription: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;

    const { data: subscription, error } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error.message }, 'Failed to get subscription');
      res.status(500).json({ error: 'Failed to get subscription' });
      return;
    }

    // If no subscription, return starter defaults
    if (!subscription) {
      res.json({
        plan_type: 'starter',
        client_limit: 5,
        status: 'active',
        billing_interval: null,
        current_price_cents: 0,
        addons: [],
      });
      return;
    }

    // Get active addons
    const { data: addons } = await supabase
      .from('platform_addons')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    res.json({
      ...subscription,
      addons: addons || [],
    });
  },

  // ─── Get Entitlements (for feature gates) ────────────────────

  getEntitlements: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;

    const { data: entitlements, error } = await supabase
      .from('coach_entitlements')
      .select('*')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error.message }, 'Failed to get entitlements');
      res.status(500).json({ error: 'Failed to get entitlements' });
      return;
    }

    // If no entitlements, return starter defaults
    if (!entitlements) {
      res.json({
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
      });
      return;
    }

    res.json(entitlements);
  },

  // ─── Get Billing Activity ────────────────────────────────────

  getBillingActivity: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabase
      .from('platform_billing_activity')
      .select('*', { count: 'exact' })
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ err: error.message }, 'Failed to get billing activity');
      res.status(500).json({ error: 'Failed to get billing activity' });
      return;
    }

    res.json({ data, total: count });
  },

  // ─── Get Invoices from Stripe ────────────────────────────────

  getInvoices: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 12;

    // Get the coach's Stripe customer ID
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('stripe_customer_id')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      // No subscription yet, return empty invoices
      res.json({ invoices: [], has_more: false });
      return;
    }

    try {
      const invoices = await stripe.invoices.list({
        customer: subscription.stripe_customer_id,
        limit: limit,
      });

      // Map to a cleaner format
      const mappedInvoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
      }));

      res.json({
        invoices: mappedInvoices,
        has_more: invoices.has_more,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to fetch invoices from Stripe');
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  },

  // ─── Create Checkout Session for Plan/Addons ─────────────────

  createCheckoutSession: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { plan, clientLimit, interval, addons, successUrl, cancelUrl } = req.body as {
      plan: PlanType;
      clientLimit: number;
      interval: BillingInterval;
      addons?: AddonType[];
      successUrl: string;
      cancelUrl: string;
    };

    if (!plan || !successUrl || !cancelUrl) {
      res.status(400).json({ error: 'Missing required fields: plan, successUrl, cancelUrl' });
      return;
    }

    if (plan === 'starter') {
      res.status(400).json({ error: 'Starter plan is free, no checkout needed' });
      return;
    }

    // Get or create Stripe customer
    let { data: existingSub } = await supabase
      .from('platform_subscriptions')
      .select('stripe_customer_id')
      .eq('coach_id', coachId)
      .maybeSingle();

    let stripeCustomerId: string;

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      // Get user info
      const { data: user } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('id', coachId)
        .single();

      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.name,
        metadata: {
          coach_id: coachId,
          source: 'athli_platform',
        },
      });
      stripeCustomerId = customer.id;

      // Create initial subscription record
      await supabase.from('platform_subscriptions').insert({
        coach_id: coachId,
        stripe_customer_id: stripeCustomerId,
        plan_type: 'starter',
        client_limit: 5,
        status: 'active',
      });
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Main plan
    const planPrice = getPlanPricing(plan, clientLimit, interval);
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Athli ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
          description: `${clientLimit} clients - ${interval === 'year' ? 'Annual' : 'Monthly'} billing`,
          metadata: {
            athli_plan_type: plan,
            athli_client_limit: clientLimit.toString(),
          },
        },
        unit_amount: planPrice * 100, // Convert to cents
        recurring: {
          interval: interval,
        },
      },
      quantity: 1,
    });

    // Add-ons
    if (addons && addons.length > 0) {
      for (const addon of addons) {
        const addonPrice = getAddonPricing(addon, interval);
        const addonNames: Record<AddonType, string> = {
          automations: 'Automations',
          ai_assistant: 'AI Assistant (Lyra)',
          payments: 'Payments',
        };

        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Athli ${addonNames[addon]} Add-on`,
              metadata: {
                athli_addon_type: addon,
              },
            },
            unit_amount: addonPrice * 100,
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          coach_id: coachId,
          plan_type: plan,
          client_limit: clientLimit.toString(),
          billing_interval: interval,
          addons: addons ? addons.join(',') : '',
        },
      },
      metadata: {
        coach_id: coachId,
        type: 'platform_subscription',
      },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url, sessionId: session.id });
  },

  // ─── Create Customer Portal Session ──────────────────────────

  createPortalSession: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { returnUrl } = req.body;

    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('stripe_customer_id')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      res.status(400).json({ error: 'No subscription found' });
      return;
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || process.env.APP_URL || 'http://localhost:3001',
    });

    res.json({ url: portalSession.url });
  },

  // ─── Update Plan (Upgrade/Downgrade) ─────────────────────────

  updatePlan: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { plan, clientLimit, interval } = req.body as {
      plan: PlanType;
      clientLimit: number;
      interval: BillingInterval;
    };

    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('stripe_subscription_id, plan_type')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      res.status(400).json({ error: 'No active subscription to update' });
      return;
    }

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

    // Find the main plan subscription item (first one without addon metadata)
    const planItem = stripeSubscription.items.data.find(
      item => !(item.price.product as any).metadata?.athli_addon_type
    );

    if (!planItem) {
      res.status(400).json({ error: 'Could not find plan item in subscription' });
      return;
    }

    // Calculate new price
    const newPrice = getPlanPricing(plan, clientLimit, interval);

    // Update the subscription
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [
        {
          id: planItem.id,
          price_data: {
            currency: 'usd',
            product: planItem.price.product as string,
            unit_amount: newPrice * 100,
            recurring: {
              interval: interval,
            },
          },
        },
      ],
      metadata: {
        plan_type: plan,
        client_limit: clientLimit.toString(),
        billing_interval: interval,
      },
      proration_behavior: 'create_prorations',
    });

    res.json({ success: true });
  },

  // ─── Add/Remove Add-ons ──────────────────────────────────────

  updateAddons: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { addons } = req.body as { addons: AddonType[] };

    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('stripe_subscription_id, billing_interval')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      res.status(400).json({ error: 'No active subscription' });
      return;
    }

    const interval = (subscription.billing_interval || 'month') as BillingInterval;

    // Get current subscription items from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

    // Get current addons from DB
    const { data: currentAddons } = await supabase
      .from('platform_addons')
      .select('addon_type, stripe_subscription_item_id')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    const currentAddonTypes = new Set(currentAddons?.map(a => a.addon_type) || []);
    const newAddonTypes = new Set(addons);

    // Items to add
    const toAdd = addons.filter(a => !currentAddonTypes.has(a));
    // Items to remove
    const toRemove = (currentAddons || []).filter(a => !newAddonTypes.has(a.addon_type));

    const itemsToUpdate: Stripe.SubscriptionUpdateParams.Item[] = [];

    // Add new addons - need to create product/price first since subscription update doesn't support inline product_data
    for (const addon of toAdd) {
      const addonNames: Record<AddonType, string> = {
        automations: 'Automations',
        ai_assistant: 'AI Assistant (Lyra)',
        payments: 'Payments',
      };
      const price = getAddonPricing(addon, interval);

      // Create or find product for this addon
      const products = await stripe.products.search({
        query: `metadata['athli_addon_type']:'${addon}'`,
      });

      let productId: string;
      if (products.data.length > 0) {
        productId = products.data[0].id;
      } else {
        const product = await stripe.products.create({
          name: `Athli ${addonNames[addon]} Add-on`,
          metadata: {
            athli_addon_type: addon,
          },
        });
        productId = product.id;
      }

      // Create a price for this addon
      const newPrice = await stripe.prices.create({
        product: productId,
        currency: 'usd',
        unit_amount: price * 100,
        recurring: {
          interval: interval,
        },
      });

      itemsToUpdate.push({
        price: newPrice.id,
        quantity: 1,
      });
    }

    // Remove addons
    for (const addon of toRemove) {
      if (addon.stripe_subscription_item_id) {
        itemsToUpdate.push({
          id: addon.stripe_subscription_item_id,
          deleted: true,
        });
      }
    }

    if (itemsToUpdate.length > 0) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: itemsToUpdate,
        proration_behavior: 'create_prorations',
      });
    }

    res.json({ success: true });
  },

  // ─── Cancel Subscription ─────────────────────────────────────

  cancelSubscription: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { cancelImmediately, reason } = req.body as {
      cancelImmediately?: boolean;
      reason?: string;
    };

    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('stripe_subscription_id')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      res.status(400).json({ error: 'No active subscription to cancel' });
      return;
    }

    if (cancelImmediately) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
        cancellation_details: {
          comment: reason,
        },
      });
    } else {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: {
          cancellation_reason: reason || '',
        },
      });
    }

    res.json({ success: true });
  },

  // ─── Reactivate Subscription ─────────────────────────────────

  reactivateSubscription: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;

    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('stripe_subscription_id, cancel_at_period_end')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      res.status(400).json({ error: 'No subscription to reactivate' });
      return;
    }

    if (!subscription.cancel_at_period_end) {
      res.status(400).json({ error: 'Subscription is not scheduled for cancellation' });
      return;
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    res.json({ success: true });
  },

  // ─── Webhook Handler ─────────────────────────────────────────

  webhook: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('No STRIPE_PLATFORM_WEBHOOK_SECRET configured');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }

    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Platform webhook signature verification failed');
      res.status(400).json({ error: 'Webhook signature verification failed' });
      return;
    }

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();

    if (existingEvent) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    try {
      await handlePlatformWebhookEvent(event, supabase, stripe);

      // Record event for idempotency
      await supabase.from('stripe_webhook_events').insert({
        id: event.id,
        type: event.type,
        payload: event as any,
      });
    } catch (err: any) {
      logger.error({ err: err.message, eventType: event.type, eventId: event.id }, 'Platform webhook processing error');
    }

    res.status(200).json({ received: true });
  },

  // ─── AI Assistant Usage Tracking ───────────────────────────────

  /**
   * Get current AI prompt usage for the day
   * Returns: { current_count, daily_limit, remaining, is_limited }
   */
  getAiPromptUsage: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const dailyLimit = 5; // Trial limit

    try {
      const { data, error } = await supabase.rpc('get_ai_prompt_usage', {
        p_coach_id: coachId,
        p_daily_limit: dailyLimit,
      });

      if (error) {
        logger.error({ err: error.message }, 'Failed to get AI prompt usage');
        res.status(500).json({ error: 'Failed to get AI prompt usage' });
        return;
      }

      res.json(data);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error getting AI prompt usage');
      res.status(500).json({ error: 'Failed to get AI prompt usage' });
    }
  },

  /**
   * Check if coach can use AI and increment prompt count if allowed
   * Returns: { allowed, current_count, daily_limit, remaining }
   */
  checkAndIncrementAiPrompt: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const dailyLimit = 5; // Trial limit

    try {
      const { data, error } = await supabase.rpc('check_and_increment_ai_prompt', {
        p_coach_id: coachId,
        p_daily_limit: dailyLimit,
      });

      if (error) {
        logger.error({ err: error.message }, 'Failed to check/increment AI prompt');
        res.status(500).json({ error: 'Failed to check AI prompt limit' });
        return;
      }

      res.json(data);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error checking AI prompt limit');
      res.status(500).json({ error: 'Failed to check AI prompt limit' });
    }
  },
};

// ─── Webhook Event Handlers ───────────────────────────────────

async function handlePlatformWebhookEvent(event: Stripe.Event, supabase: any, stripe: Stripe) {
  const eventType = event.type;

  switch (eventType) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event, supabase);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event, supabase);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event, supabase);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event, supabase);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event, supabase);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event, supabase);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event, supabase);
      break;

    default:
      logger.debug({ eventType }, 'Unhandled platform webhook event type');
  }
}

async function handleCheckoutCompleted(event: Stripe.Event, supabase: any) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Only handle platform subscriptions
  if (session.metadata?.type !== 'platform_subscription') {
    return;
  }

  const coachId = session.metadata?.coach_id;
  if (!coachId) {
    logger.warn({ sessionId: session.id }, 'Platform checkout session missing coach_id');
    return;
  }

  logger.info({ coachId, sessionId: session.id }, 'Platform checkout session completed');
}

async function handleSubscriptionCreated(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;
  const coachId = subscription.metadata?.coach_id;

  if (!coachId) {
    // Not a platform subscription
    return;
  }

  const planType = (subscription.metadata?.plan_type || 'starter') as PlanType;
  const clientLimit = parseInt(subscription.metadata?.client_limit || '5');
  const billingInterval = subscription.metadata?.billing_interval as BillingInterval;
  const addons = subscription.metadata?.addons?.split(',').filter(Boolean) as AddonType[] || [];

  // Calculate total amount
  const totalAmount = subscription.items.data.reduce((sum, item) => {
    return sum + (item.price.unit_amount || 0);
  }, 0);

  // Update platform subscription
  await supabase
    .from('platform_subscriptions')
    .upsert({
      coach_id: coachId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      plan_type: planType,
      client_limit: clientLimit,
      billing_interval: billingInterval,
      current_price_cents: totalAmount,
      status: subscription.status === 'trialing' ? 'trialing' : 'active',
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      stripe_price_id: subscription.items.data[0]?.price.id,
    }, { onConflict: 'coach_id' });

  // Update addons
  for (const item of subscription.items.data) {
    const product = item.price.product as Stripe.Product;
    const addonType = product.metadata?.athli_addon_type as AddonType;

    if (addonType) {
      await supabase.from('platform_addons').upsert({
        coach_id: coachId,
        addon_type: addonType,
        stripe_subscription_item_id: item.id,
        stripe_price_id: item.price.id,
        price_cents: item.price.unit_amount || 0,
        billing_interval: billingInterval,
        is_active: true,
        current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      }, { onConflict: 'coach_id,addon_type' });
    }
  }

  // Log activity
  await logPlatformBillingActivity(supabase, {
    coach_id: coachId,
    event_type: 'subscription_created',
    description: `Subscribed to ${planType.charAt(0).toUpperCase() + planType.slice(1)} plan with ${clientLimit} clients`,
    amount_cents: totalAmount,
    stripe_event_id: event.id,
    metadata: { plan_type: planType, client_limit: clientLimit, addons },
  });

  logger.info({ coachId, planType, clientLimit }, 'Platform subscription created');
}

async function handleSubscriptionUpdated(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;
  const coachId = subscription.metadata?.coach_id;

  if (!coachId) return;

  const planType = (subscription.metadata?.plan_type || 'starter') as PlanType;
  const clientLimit = parseInt(subscription.metadata?.client_limit || '5');
  const billingInterval = subscription.metadata?.billing_interval as BillingInterval;

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'unpaid',
    trialing: 'trialing',
    paused: 'paused',
  };

  const status = statusMap[subscription.status] || 'active';

  // Calculate total amount
  const totalAmount = subscription.items.data.reduce((sum, item) => {
    return sum + (item.price.unit_amount || 0);
  }, 0);

  // Update subscription
  await supabase
    .from('platform_subscriptions')
    .update({
      plan_type: planType,
      client_limit: clientLimit,
      billing_interval: billingInterval,
      current_price_cents: totalAmount,
      status: status,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('coach_id', coachId);

  // Update addons - mark all inactive first, then activate current ones
  await supabase
    .from('platform_addons')
    .update({ is_active: false })
    .eq('coach_id', coachId);

  for (const item of subscription.items.data) {
    const product = item.price.product as Stripe.Product;
    const addonType = product.metadata?.athli_addon_type as AddonType;

    if (addonType) {
      await supabase.from('platform_addons').upsert({
        coach_id: coachId,
        addon_type: addonType,
        stripe_subscription_item_id: item.id,
        stripe_price_id: item.price.id,
        price_cents: item.price.unit_amount || 0,
        billing_interval: billingInterval,
        is_active: true,
        current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      }, { onConflict: 'coach_id,addon_type' });
    }
  }

  // Log activity for status changes
  if (subscription.cancel_at_period_end) {
    await logPlatformBillingActivity(supabase, {
      coach_id: coachId,
      event_type: 'subscription_cancelling',
      description: `Subscription scheduled to cancel at end of billing period`,
      stripe_event_id: event.id,
    });
  }

  logger.info({ coachId, status, planType }, 'Platform subscription updated');
}

async function handleSubscriptionDeleted(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;
  const coachId = subscription.metadata?.coach_id;

  if (!coachId) return;

  // Update to cancelled status and reset to starter
  await supabase
    .from('platform_subscriptions')
    .update({
      status: 'cancelled',
      plan_type: 'starter',
      client_limit: 5,
      cancel_at_period_end: false,
      cancelled_at: new Date().toISOString(),
    })
    .eq('coach_id', coachId);

  // Deactivate all addons
  await supabase
    .from('platform_addons')
    .update({ is_active: false })
    .eq('coach_id', coachId);

  // Log activity
  await logPlatformBillingActivity(supabase, {
    coach_id: coachId,
    event_type: 'subscription_cancelled',
    description: 'Subscription cancelled - reverted to Starter plan',
    stripe_event_id: event.id,
  });

  logger.info({ coachId }, 'Platform subscription deleted');
}

async function handleInvoicePaid(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscription = (invoice as any).subscription as string;

  if (!subscription) return;

  // Get coach_id from subscription
  const { data: sub } = await supabase
    .from('platform_subscriptions')
    .select('coach_id')
    .eq('stripe_subscription_id', subscription)
    .maybeSingle();

  if (!sub) return;

  // Log payment
  await logPlatformBillingActivity(supabase, {
    coach_id: sub.coach_id,
    event_type: 'payment_succeeded',
    description: `Payment successful - $${(invoice.amount_paid / 100).toFixed(2)}`,
    amount_cents: invoice.amount_paid,
    currency: invoice.currency,
    stripe_event_id: event.id,
    metadata: { invoice_id: invoice.id },
  });

  logger.info({ coachId: sub.coach_id, amount: invoice.amount_paid }, 'Platform invoice paid');
}

async function handleInvoicePaymentFailed(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscription = (invoice as any).subscription as string;

  if (!subscription) return;

  const { data: sub } = await supabase
    .from('platform_subscriptions')
    .select('coach_id')
    .eq('stripe_subscription_id', subscription)
    .maybeSingle();

  if (!sub) return;

  // Update status to past_due
  await supabase
    .from('platform_subscriptions')
    .update({ status: 'past_due' })
    .eq('coach_id', sub.coach_id);

  // Log failure
  await logPlatformBillingActivity(supabase, {
    coach_id: sub.coach_id,
    event_type: 'payment_failed',
    description: `Payment failed - $${(invoice.amount_due / 100).toFixed(2)}`,
    amount_cents: invoice.amount_due,
    currency: invoice.currency,
    stripe_event_id: event.id,
    metadata: {
      invoice_id: invoice.id,
      attempt_count: invoice.attempt_count,
    },
  });

  logger.warn({ coachId: sub.coach_id, amount: invoice.amount_due }, 'Platform invoice payment failed');
}

async function handleTrialWillEnd(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;
  const coachId = subscription.metadata?.coach_id;

  if (!coachId) return;

  // Log trial ending
  await logPlatformBillingActivity(supabase, {
    coach_id: coachId,
    event_type: 'trial_ending',
    description: 'Trial ending in 3 days',
    stripe_event_id: event.id,
    metadata: {
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    },
  });

  // TODO: Send notification to coach about trial ending

  logger.info({ coachId }, 'Platform trial will end soon');
}
