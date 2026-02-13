import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripeClient } from '../../../services/stripe.service';
import { getSupabaseClient } from '../../../services/supabase.service';
import { logger } from '../../../config/logger';
import { PRO_PRICING, MAX_PRICING, ADDONS } from '@athli/shared-types/src/constants/pricing-constants';
import { getPlanPriceId, getAddonPriceId } from '../../../services/stripe-platform-price.service';

// ─── Pricing Configuration ────────────────────────────────────

// Add-on pricing mapped from shared constants (uses snake_case keys for DB compatibility)
const ADDON_PRICING = {
  automations: [ADDONS[0].monthlyPrice, ADDONS[0].annualPrice],
  ai_assistant: [ADDONS[1].monthlyPrice, ADDONS[1].annualPrice],
  payments: [ADDONS[2].monthlyPrice, ADDONS[2].annualPrice],
} as const;

// Referral credit amount in cents ($20)
const REFERRAL_CREDIT_CENTS = 2000;

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

/**
 * Calculate total subscription cost (plan + all addons) in dollars
 */
function calculateTotalSubscriptionCost(
  plan: PlanType,
  clientLimit: number,
  addons: AddonType[],
  interval: BillingInterval
): number {
  const planPrice = getPlanPricing(plan, clientLimit, interval);
  const addonsTotal = addons.reduce((sum, addon) => sum + getAddonPricing(addon, interval), 0);
  return planPrice + addonsTotal;
}

/**
 * Backfill pending referral credits when a coach creates their first Stripe customer.
 * This handles the case where Coach A referred Coach B, Coach B paid (generating credits),
 * but Coach A was still on free trial with no Stripe customer ID at that time.
 */
async function backfillPendingReferralCredits(
  coachId: string,
  stripeCustomerId: string,
  supabase: any,
  stripe: Stripe
) {
  try {
    // Find all referrals where this coach is the referrer AND credits are pending (not yet applied to Stripe)
    const { data: pendingReferrals } = await supabase
      .from('coach_referrals')
      .select('id, referrer_credit_cents')
      .eq('referrer_coach_id', coachId)
      .eq('status', 'converted')
      .is('referrer_credit_applied_at', null)
      .gt('referrer_credit_cents', 0);

    if (!pendingReferrals || pendingReferrals.length === 0) {
      return;
    }

    // Apply each pending credit to Stripe
    for (const referral of pendingReferrals) {
      await stripe.customers.createBalanceTransaction(stripeCustomerId, {
        amount: -referral.referrer_credit_cents, // Negative = credit
        currency: 'usd',
        description: 'Referral reward - Your referred coach subscribed!',
      });

      // Mark as applied
      await supabase
        .from('coach_referrals')
        .update({ referrer_credit_applied_at: new Date().toISOString() })
        .eq('id', referral.id);

      logger.info(
        { coachId, referralId: referral.id, creditCents: referral.referrer_credit_cents },
        'Backfilled pending referral credit to new Stripe customer'
      );
    }

    // Also check if this coach was referred and their credit is pending
    const { data: referredByRecord } = await supabase
      .from('coach_referrals')
      .select('id, referred_credit_cents')
      .eq('referred_coach_id', coachId)
      .eq('status', 'converted')
      .is('referred_credit_applied_at', null)
      .gt('referred_credit_cents', 0)
      .maybeSingle();

    if (referredByRecord) {
      await stripe.customers.createBalanceTransaction(stripeCustomerId, {
        amount: -referredByRecord.referred_credit_cents, // Negative = credit
        currency: 'usd',
        description: 'Referral bonus - $20 credit for your next invoice!',
      });

      await supabase
        .from('coach_referrals')
        .update({ referred_credit_applied_at: new Date().toISOString() })
        .eq('id', referredByRecord.id);

      logger.info(
        { coachId, referralId: referredByRecord.id, creditCents: referredByRecord.referred_credit_cents },
        'Backfilled pending referred credit to new Stripe customer'
      );
    }
  } catch (err: any) {
    // Don't fail checkout if backfill fails - credits are still tracked in DB
    logger.warn({ err: err.message, coachId }, 'Failed to backfill pending referral credits');
  }
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

  // ─── Get Referrals and Credit Stats ─────────────────────────

  getReferrals: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;

    try {
      // Get all referrals made by this coach (people they referred)
      const { data: referrals, error: referralsError } = await supabase
        .from('coach_referrals')
        .select(`
          id,
          referred_coach_id,
          status,
          referrer_credit_cents,
          trial_started_at,
          trial_ended_at,
          trial_cancelled_at,
          converted_at,
          created_at,
          referred_coach_name,
          referred_coach_profile_picture_url
        `)
        .eq('referrer_coach_id', coachId)
        .order('created_at', { ascending: false });

      if (referralsError) {
        logger.error({ err: referralsError.message }, 'Failed to get referrals');
        res.status(500).json({ error: 'Failed to get referrals' });
        return;
      }

      // Check if this coach was referred by someone (to show in their history)
      const { data: referredBy } = await supabase
        .from('coach_referrals')
        .select(`
          id,
          referrer_coach_id,
          referrer_coach_name,
          referrer_coach_profile_picture_url,
          status,
          referred_credit_cents,
          referred_credit_applied_at,
          converted_at,
          created_at
        `)
        .eq('referred_coach_id', coachId)
        .maybeSingle() as { data: {
          id: string;
          referrer_coach_id: string | null;
          referrer_coach_name: string | null;
          referrer_coach_profile_picture_url: string | null;
          status: string;
          referred_credit_cents: number;
          referred_credit_applied_at: string | null;
          converted_at: string | null;
          created_at: string;
        } | null };

      // Get referred coach names (filter out null values from deleted coaches)
      const referredCoachIds = (referrals?.map(r => r.referred_coach_id) || []).filter(Boolean) as string[];
      // Also get the referrer's name if this coach was referred
      if (referredBy?.referrer_coach_id) {
        referredCoachIds.push(referredBy.referrer_coach_id);
      }

      let coachProfiles: Record<string, { name: string; profile_picture_url: string | null }> = {};

      if (referredCoachIds.length > 0) {
        const { data: coaches } = await supabase
          .from('user_profiles')
          .select('id, name, email, profile_picture_url')
          .in('id', referredCoachIds);

        if (coaches) {
          coachProfiles = coaches.reduce((acc, c) => {
            acc[c.id] = {
              name: c.name || c.email || 'Unknown',
              profile_picture_url: c.profile_picture_url || null,
            };
            return acc;
          }, {} as Record<string, { name: string; profile_picture_url: string | null }>);
        }
      }

      // Calculate total credits earned from referrals made
      const totalEarnedFromReferrals = referrals?.reduce((sum, r) => sum + (r.referrer_credit_cents || 0), 0) || 0;
      // Add credit received from being referred
      const totalReceivedFromReferrer = referredBy?.referred_credit_cents || 0;
      const totalEarnedCents = totalEarnedFromReferrals + totalReceivedFromReferrer;

      // Get current Stripe balance (active credits)
      let stripeActiveCredits = 0;
      const { data: subscription } = await supabase
        .from('platform_subscriptions')
        .select('stripe_customer_id')
        .eq('coach_id', coachId)
        .maybeSingle();

      if (subscription?.stripe_customer_id) {
        try {
          const customer = await stripe.customers.retrieve(subscription.stripe_customer_id);
          if (customer && !customer.deleted) {
            // Stripe balance: negative = credit available
            stripeActiveCredits = Math.abs(Math.min(0, customer.balance));
          }
        } catch (stripeErr: any) {
          logger.warn({ err: stripeErr.message }, 'Failed to get Stripe customer balance');
        }
      }

      // If no Stripe customer, check for pending (unapplied) credits in the DB
      // These will be applied when the coach eventually subscribes
      let pendingCredits = 0;
      if (!subscription?.stripe_customer_id) {
        // Sum credits where applied_at is null
        const { data: pendingReferrals } = await supabase
          .from('coach_referrals')
          .select('referrer_credit_cents')
          .eq('referrer_coach_id', coachId)
          .eq('status', 'converted')
          .is('referrer_credit_applied_at', null)
          .gt('referrer_credit_cents', 0);

        pendingCredits += pendingReferrals?.reduce((sum: number, r: { referrer_credit_cents: number }) => sum + r.referrer_credit_cents, 0) || 0;

        // Also check if they have pending "referred by" credits
        if (referredBy && referredBy.referred_credit_cents > 0 && !referredBy.referred_credit_applied_at) {
          pendingCredits += referredBy.referred_credit_cents;
        }
      }

      // Active credits = Stripe balance + pending DB credits
      const activeCredits = stripeActiveCredits + pendingCredits;

      // Used credits = total earned - active (what's left)
      const usedCredits = Math.max(0, totalEarnedCents - activeCredits);

      // Map referrals with coach profiles (people this coach referred)
      // Prefer stored name/picture (preserved if coach deleted), fall back to user_profiles
      const mappedReferrals = referrals?.map(r => ({
        id: r.id,
        coach_name: r.referred_coach_name || coachProfiles[r.referred_coach_id]?.name || 'Unknown',
        profile_picture_url: r.referred_coach_profile_picture_url || coachProfiles[r.referred_coach_id]?.profile_picture_url || null,
        status: r.status,
        credit_earned_cents: r.referrer_credit_cents || 0,
        trial_started_at: r.trial_started_at,
        trial_ended_at: r.trial_ended_at,
        trial_cancelled_at: r.trial_cancelled_at,
        converted_at: r.converted_at,
        created_at: r.created_at,
      })) || [];

      // Build referredBy info if this coach was referred by someone
      // Show immediately with 'accepted' status, or 'credit_received' once converted
      let referredByInfo = null;
      if (referredBy) {
        const isConverted = referredBy.status === 'converted';
        // Prefer stored values (preserved if referrer deletes account), fall back to live profile
        const liveProfile = referredBy.referrer_coach_id ? coachProfiles[referredBy.referrer_coach_id] : null;
        referredByInfo = {
          id: referredBy.id,
          coach_name: referredBy.referrer_coach_name || liveProfile?.name || 'Unknown',
          profile_picture_url: referredBy.referrer_coach_profile_picture_url || liveProfile?.profile_picture_url || null,
          status: isConverted ? 'credit_received' as const : 'accepted' as const,
          credit_earned_cents: isConverted ? (referredBy.referred_credit_cents || 0) : 0,
          converted_at: referredBy.converted_at,
          created_at: referredBy.created_at,
        };
      }

      res.json({
        referrals: mappedReferrals,
        referred_by: referredByInfo,
        credits: {
          total_earned_cents: totalEarnedCents,
          active_cents: activeCredits,
          used_cents: usedCredits,
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to get referrals');
      res.status(500).json({ error: 'Failed to get referrals' });
    }
  },

  // ─── Send Referral Invite Email ─────────────────────────────

  sendReferralInvite: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { email } = req.body as { email: string };

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }

    try {
      // Get coach's info for the invite
      const { data: coach } = await supabase
        .from('user_profiles')
        .select('name, email')
        .eq('id', coachId)
        .single();

      // Get coach's referral code from coach_unique_codes table
      const { data: coachCode } = await supabase
        .from('coach_unique_codes')
        .select('code')
        .eq('coach_id', coachId)
        .is('onboarding_id', null)
        .maybeSingle();

      // TODO: Integrate with Resend to send actual email
      // For now, just log and return success
      logger.info({
        coachId,
        coachName: coach?.name,
        inviteeEmail: email,
        referralCode: coachCode?.code,
      }, 'Referral invite requested (email not sent - Resend integration pending)');

      res.json({ success: true });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to send referral invite');
      res.status(500).json({ error: 'Failed to send invite' });
    }
  },

  // ─── Apply Referral Code ───────────────────────────────────────

  applyReferralCode: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { code } = req.body as { code: string };

    if (!code || code.trim().length === 0) {
      res.status(400).json({ error: 'Referral code is required' });
      return;
    }

    try {
      // Check if current coach already has a referrer
      const { data: currentCoach } = await supabase
        .from('coach_profiles')
        .select('referrer_coach_id')
        .eq('id', coachId)
        .single();

      if (currentCoach?.referrer_coach_id) {
        res.status(400).json({ error: 'You have already been referred by another coach' });
        return;
      }

      // Find the coach with this referral code from coach_unique_codes table
      const { data: codeRecord } = await supabase
        .from('coach_unique_codes')
        .select('coach_id')
        .eq('code', code.trim().toUpperCase())
        .is('onboarding_id', null)
        .maybeSingle();

      if (!codeRecord) {
        res.status(200).json({ success: false, error: 'Invalid referral code' });
        return;
      }

      const referrer = { id: codeRecord.coach_id };

      // Can't refer yourself
      if (referrer.id === coachId) {
        res.status(400).json({ error: 'You cannot use your own referral code' });
        return;
      }

      // Get referrer's name
      const { data: referrerProfile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', referrer.id)
        .eq('user_type', 'coach')
        .single();

      // Set the referrer on the current coach's profile
      // This triggers handle_coach_referral which creates the referral record
      const { error: updateError } = await supabase
        .from('coach_profiles')
        .update({ referrer_coach_id: referrer.id })
        .eq('id', coachId);

      if (updateError) {
        logger.error({ err: updateError.message, coachId, code }, 'Failed to apply referral code');
        res.status(500).json({ error: 'Failed to apply referral code' });
        return;
      }

      logger.info({ coachId, referrerId: referrer.id, code }, 'Referral code applied successfully');

      res.json({
        success: true,
        referrerName: referrerProfile?.name || null,
      });
    } catch (err: any) {
      logger.error({ err: err.message, coachId, code }, 'Failed to apply referral code');
      res.status(500).json({ error: 'Failed to apply referral code' });
    }
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
        expand: ['data.lines'],
      });

      // Map to a cleaner format
      // Note: period_start/end on invoice is invoice creation date, not billing period
      // The actual billing period is on the line items
      const mappedInvoices = invoices.data.map((invoice) => {
        // Get the billing period from the first line item (subscription item)
        const firstLine = invoice.lines?.data?.[0];
        const periodStart = firstLine?.period?.start || invoice.period_start;
        const periodEnd = firstLine?.period?.end || invoice.period_end;

        // Get line item descriptions for open invoices
        const lineItems = invoice.lines?.data?.map((line) => ({
          description: line.description,
          amount: line.amount,
        })) || [];

        return {
          id: invoice.id,
          number: invoice.number,
          amount_paid: invoice.amount_paid,
          amount_due: invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status,
          created: invoice.created,
          period_start: periodStart,
          period_end: periodEnd,
          hosted_invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
          line_items: lineItems,
        };
      });

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

    // Get user info for email pre-population
    // Email is in Supabase auth, name is in user_profiles
    const [authUserResult, profileResult] = await Promise.all([
      supabase.auth.admin.getUserById(coachId),
      supabase.from('user_profiles').select('name').eq('id', coachId).single(),
    ]);
    const userEmail = authUserResult.data?.user?.email;
    const userName = profileResult.data?.name;

    // Get or create Stripe customer
    let { data: existingSub } = await supabase
      .from('platform_subscriptions')
      .select('stripe_customer_id')
      .eq('coach_id', coachId)
      .maybeSingle();

    let stripeCustomerId: string;

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
      // Ensure customer has email for checkout pre-population
      if (userEmail) {
        await stripe.customers.update(stripeCustomerId, { email: userEmail });
      }
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          coach_id: coachId,
          source: 'athli_platform',
        },
      });
      stripeCustomerId = customer.id;

      // Don't create platform_subscriptions record here - wait until checkout completes
      // The coach_id is stored in Stripe customer metadata so we can look it up later
      // The webhook handler (customer.subscription.created) will create the record
    }

    // Build line items with inline pricing to show client count in product name
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Calculate plan price
    const planPricing = plan === 'pro' ? PRO_PRICING : MAX_PRICING;
    const planTier = planPricing[clientLimit];
    const planPriceCents = planTier
      ? (interval === 'year' ? planTier[1] * 12 * 100 : planTier[0] * 100)
      : 0;

    // Plan names for display - include client count for compliance
    const planBaseName = plan === 'pro' ? 'Athli Pro Plan' : 'Athli Max Plan';
    const planDisplayName = `${planBaseName} (${clientLimit} clients)`;

    // Main plan with client count in name for invoice clarity
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: planDisplayName,
          description: `Up to ${clientLimit} clients • Cancel anytime`,
        },
        unit_amount: planPriceCents,
        recurring: {
          interval: interval,
        },
      },
      quantity: 1,
    });

    // Add-ons
    if (addons && addons.length > 0) {
      const addonNames: Record<AddonType, string> = {
        automations: 'Athli Automations Add-on',
        ai_assistant: 'Athli AI Assistant Add-on',
        payments: 'Athli Payments Add-on',
      };

      for (const addon of addons) {
        const addonConfig = ADDONS.find(a =>
          (addon === 'automations' && a.key === 'automations') ||
          (addon === 'ai_assistant' && a.key === 'aiAssistant') ||
          (addon === 'payments' && a.key === 'payments')
        );

        const addonPriceCents = addonConfig
          ? (interval === 'year' ? addonConfig.annualPrice * 12 * 100 : addonConfig.monthlyPrice * 100)
          : 0;

        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: addonNames[addon],
              description: 'Cancel anytime',
            },
            unit_amount: addonPriceCents,
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
  // Upgrades: Charge prorated difference immediately, grant new entitlements immediately
  // Downgrades: No refund, keep current entitlements until next billing cycle

  updatePlan: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { plan, clientLimit, interval } = req.body as {
      plan: PlanType;
      clientLimit: number;
      interval: BillingInterval;
    };

    // Get current subscription details
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('stripe_subscription_id, plan_type, client_limit, billing_interval, current_price_cents')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      res.status(400).json({ error: 'No active subscription to update' });
      return;
    }

    // Get current addons to calculate total price
    const { data: currentAddons } = await supabase
      .from('platform_addons')
      .select('addon_type')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    const currentAddonTypes = (currentAddons?.map(a => a.addon_type) || []) as AddonType[];
    const currentInterval = (subscription.billing_interval || 'month') as BillingInterval;

    // Calculate current and new total prices (plan only, addons stay the same)
    const currentPlanPrice = getPlanPricing(
      subscription.plan_type as PlanType,
      subscription.client_limit,
      currentInterval
    );
    const newPlanPrice = getPlanPricing(plan, clientLimit, interval);

    // Determine if this is an upgrade or downgrade based on plan price
    const isUpgrade = newPlanPrice > currentPlanPrice;

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

    // Plan name formatting helper
    const formatPlanName = (planType: string, clients: number) => {
      const baseName = planType === 'pro' ? 'Athli Pro Plan' : planType === 'max' ? 'Athli Max Plan' : 'Athli Starter Plan';
      return `${baseName} (${clients} clients)`;
    };

    // Find or create a persistent product for the plan (with client count in name)
    const newPlanDisplayName = formatPlanName(plan, clientLimit);
    const productSearchKey = `athli_platform_${plan}_${clientLimit}`;

    let productId: string;
    const existingProducts = await stripe.products.search({
      query: `metadata['athli_product_key']:'${productSearchKey}'`,
    });

    if (existingProducts.data.length > 0 && existingProducts.data[0].active) {
      productId = existingProducts.data[0].id;
    } else {
      // Create a new persistent product with client count in name
      const newProduct = await stripe.products.create({
        name: newPlanDisplayName,
        description: `Up to ${clientLimit} clients • Cancel anytime`,
        metadata: {
          athli_product_key: productSearchKey,
          plan_type: plan,
          client_limit: clientLimit.toString(),
        },
      });
      productId = newProduct.id;
    }

    if (isUpgrade) {
      // UPGRADE: Charge full price difference immediately (not prorated), grant new entitlements immediately
      const priceDifferenceCents = (newPlanPrice - currentPlanPrice) * 100;

      // Update the subscription without proration (new price takes effect next billing cycle)
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          {
            id: planItem.id,
            price_data: {
              currency: 'usd',
              product: productId,
              unit_amount: newPlanPrice * 100,
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
        proration_behavior: 'none', // No Stripe proration - we charge manually
      });

      // Manually charge the full price difference immediately
      if (priceDifferenceCents > 0) {
        // Get the payment method from the subscription
        const paymentMethodId = stripeSubscription.default_payment_method as string;
        if (!paymentMethodId) {
          throw new Error('No payment method on file. Please update your payment method.');
        }

        // Create invoice with the payment method set
        const invoice = await stripe.invoices.create({
          customer: stripeSubscription.customer as string,
          collection_method: 'charge_automatically',
          default_payment_method: paymentMethodId,
        });

        // Add the upgrade charge to the invoice with properly formatted description
        const oldPlanName = formatPlanName(subscription.plan_type, subscription.client_limit);
        const newPlanName = formatPlanName(plan, clientLimit);
        // For upgrades, period should be from today to end of billing cycle
        const now = Math.floor(Date.now() / 1000);
        const upgradePeriod = stripeSubscription.current_period_end
          ? { start: now, end: stripeSubscription.current_period_end }
          : undefined;

        logger.info({
          coachId,
          periodStart: now,
          periodEnd: stripeSubscription.current_period_end,
        }, 'updatePlan: Creating upgrade invoice with period');

        await stripe.invoiceItems.create({
          customer: stripeSubscription.customer as string,
          invoice: invoice.id,
          amount: priceDifferenceCents,
          currency: 'usd',
          description: `Plan upgrade: ${oldPlanName} → ${newPlanName}`,
          ...(upgradePeriod && { period: upgradePeriod }),
        });

        // Finalize and pay the invoice immediately
        await stripe.invoices.finalizeInvoice(invoice.id);
        const paidInvoice = await stripe.invoices.pay(invoice.id, {
          payment_method: paymentMethodId,
        });

        if (paidInvoice.status !== 'paid') {
          logger.warn({ invoiceId: invoice.id, status: paidInvoice.status }, 'Upgrade invoice payment not completed');
          throw new Error('Payment failed. Please check your payment method.');
        }
      }

      // Update the platform_subscriptions record immediately
      await supabase
        .from('platform_subscriptions')
        .update({
          plan_type: plan,
          client_limit: clientLimit,
          billing_interval: interval,
          current_price_cents: newPlanPrice * 100,
          // Clear any scheduled changes since we're applying immediately
          scheduled_plan_type: null,
          scheduled_client_limit: null,
        })
        .eq('coach_id', coachId);

      // Update coach_entitlements immediately for upgrades
      const entitlementUpdates: Record<string, any> = {
        plan_type: plan,
        client_limit: clientLimit,
      };

      // Set features based on plan
      if (plan === 'max') {
        entitlementUpdates.has_ai_workout_builder = true;
        entitlementUpdates.has_custom_exercises = true;
        entitlementUpdates.has_questionnaires = true;
        entitlementUpdates.has_habits_metrics = true;
        entitlementUpdates.storage_limit_gb = 50;
        entitlementUpdates.has_broadcast_messaging = true;
        entitlementUpdates.has_ai_todo_list = true;
        entitlementUpdates.has_priority_support = true;
      } else if (plan === 'pro') {
        entitlementUpdates.has_ai_workout_builder = true;
        entitlementUpdates.has_custom_exercises = true;
        entitlementUpdates.has_questionnaires = true;
        entitlementUpdates.has_habits_metrics = true;
        entitlementUpdates.storage_limit_gb = 10;
        entitlementUpdates.has_broadcast_messaging = false;
        entitlementUpdates.has_ai_todo_list = false;
        entitlementUpdates.has_priority_support = false;
      }

      await supabase
        .from('coach_entitlements')
        .update(entitlementUpdates)
        .eq('coach_id', coachId);

      logger.info({ coachId, plan, clientLimit, isUpgrade: true }, 'Plan upgraded immediately');
    } else {
      // DOWNGRADE: No refund, schedule change for end of billing period
      // Update Stripe with no proration (no refund), change takes effect on next invoice
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          {
            id: planItem.id,
            price_data: {
              currency: 'usd',
              product: productId,
              unit_amount: newPlanPrice * 100,
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
        proration_behavior: 'none', // No refund for downgrade
      });

      // Store scheduled changes - entitlements will be updated when billing period renews
      await supabase
        .from('platform_subscriptions')
        .update({
          // Keep current plan info until period end
          // Store scheduled changes to apply at renewal
          scheduled_plan_type: plan,
          scheduled_client_limit: clientLimit,
          billing_interval: interval, // Interval can change immediately
        })
        .eq('coach_id', coachId);

      // DON'T update entitlements - they keep current level until next billing cycle
      logger.info({ coachId, plan, clientLimit, isUpgrade: false }, 'Plan downgrade scheduled for end of period');
    }

    res.json({ success: true, isUpgrade });
  },

  // ─── Add/Remove Add-ons ──────────────────────────────────────
  // Adding addons (upgrade): Charge prorated difference immediately, grant entitlements immediately
  // Removing addons (downgrade): No refund, keep entitlements until next billing cycle

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

    // Get current addons from DB
    const { data: currentAddons } = await supabase
      .from('platform_addons')
      .select('addon_type, stripe_subscription_item_id')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    const currentAddonTypes = new Set(currentAddons?.map(a => a.addon_type) || []);
    const newAddonTypes = new Set(addons);

    // Items to add (upgrade)
    const toAdd = addons.filter(a => !currentAddonTypes.has(a));
    // Items to remove (downgrade)
    const toRemove = (currentAddons || []).filter(a => !newAddonTypes.has(a.addon_type));

    const addonNames: Record<AddonType, string> = {
      automations: 'Athli Automations Add-on',
      ai_assistant: 'Athli AI Assistant Add-on',
      payments: 'Athli Payments Add-on',
    };

    // Helper to map addon type to entitlement field
    const addonToEntitlement: Record<AddonType, string> = {
      automations: 'has_automations',
      ai_assistant: 'has_ai_assistant',
      payments: 'has_payments',
    };

    // ADDING ADDONS (Upgrade path) - charge full price immediately (not prorated), grant entitlements immediately
    if (toAdd.length > 0) {
      const itemsToAdd: Stripe.SubscriptionUpdateParams.Item[] = [];
      let totalAddonPriceCents = 0;

      // Get the Stripe subscription to get customer ID
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

      for (const addon of toAdd) {
        const price = getAddonPricing(addon, interval);
        totalAddonPriceCents += price * 100;

        // Create or find product for this addon
        const products = await stripe.products.search({
          query: `metadata['athli_addon_type']:'${addon}'`,
        });

        let productId: string;
        if (products.data.length > 0 && products.data[0].active) {
          productId = products.data[0].id;
        } else {
          const product = await stripe.products.create({
            name: addonNames[addon],
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

        itemsToAdd.push({
          price: newPrice.id,
          quantity: 1,
        });
      }

      // Update Stripe subscription with new addons - no proration (we charge manually)
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: itemsToAdd,
        proration_behavior: 'none',
      });

      // Manually charge the full addon price immediately
      if (totalAddonPriceCents > 0) {
        const addonNamesList = toAdd.map(a => addonNames[a]).join(', ');

        // Get the payment method from the subscription
        const paymentMethodId = stripeSubscription.default_payment_method as string;
        if (!paymentMethodId) {
          throw new Error('No payment method on file. Please update your payment method.');
        }

        // Create invoice with the payment method set
        const invoice = await stripe.invoices.create({
          customer: stripeSubscription.customer as string,
          collection_method: 'charge_automatically',
          default_payment_method: paymentMethodId,
        });

        // Add the addon charge to the invoice
        // For upgrades, period should be from today to end of billing cycle
        const now = Math.floor(Date.now() / 1000);
        const addonPeriod = stripeSubscription.current_period_end
          ? { start: now, end: stripeSubscription.current_period_end }
          : undefined;

        logger.info({
          coachId,
          periodStart: now,
          periodEnd: stripeSubscription.current_period_end,
        }, 'updateAddons: Creating addon invoice with period');

        await stripe.invoiceItems.create({
          customer: stripeSubscription.customer as string,
          invoice: invoice.id,
          amount: totalAddonPriceCents,
          currency: 'usd',
          description: `Add-on purchase: ${addonNamesList}`,
          ...(addonPeriod && { period: addonPeriod }),
        });

        // Finalize and pay the invoice immediately
        await stripe.invoices.finalizeInvoice(invoice.id);
        const paidInvoice = await stripe.invoices.pay(invoice.id, {
          payment_method: paymentMethodId,
        });

        if (paidInvoice.status !== 'paid') {
          logger.warn({ invoiceId: invoice.id, status: paidInvoice.status }, 'Addon invoice payment not completed');
          throw new Error('Payment failed. Please check your payment method.');
        }
      }

      // Update our DB - add the new addons
      for (const addon of toAdd) {
        const price = getAddonPricing(addon, interval);
        await supabase.from('platform_addons').upsert({
          coach_id: coachId,
          addon_type: addon,
          price_cents: price * 100,
          billing_interval: interval,
          is_active: true,
          cancel_at_period_end: false,
        }, { onConflict: 'coach_id,addon_type' });
      }

      // Update entitlements immediately for added addons
      const entitlementUpdates: Record<string, boolean> = {};
      for (const addon of toAdd) {
        entitlementUpdates[addonToEntitlement[addon]] = true;
      }
      await supabase
        .from('coach_entitlements')
        .update(entitlementUpdates)
        .eq('coach_id', coachId);

      logger.info({ coachId, addons: toAdd }, 'Addons added immediately');
    }

    // REMOVING ADDONS (Downgrade path) - no refund, schedule removal for end of period
    if (toRemove.length > 0) {
      const itemsToRemove: Stripe.SubscriptionUpdateParams.Item[] = [];

      for (const addon of toRemove) {
        if (addon.stripe_subscription_item_id) {
          itemsToRemove.push({
            id: addon.stripe_subscription_item_id,
            deleted: true,
          });
        }
      }

      if (itemsToRemove.length > 0) {
        // Remove from Stripe with no refund
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          items: itemsToRemove,
          proration_behavior: 'none', // No refund for removal
        });
      }

      // Schedule addon removal in DB - keep entitlements until period end
      for (const addon of toRemove) {
        await supabase
          .from('platform_addons')
          .update({ cancel_at_period_end: true })
          .eq('coach_id', coachId)
          .eq('addon_type', addon.addon_type);
      }

      // DON'T update entitlements - they keep current addons until next billing cycle
      logger.info({ coachId, addons: toRemove.map(a => a.addon_type) }, 'Addon removal scheduled for end of period');
    }

    res.json({
      success: true,
      addedImmediately: toAdd,
      scheduledForRemoval: toRemove.map(a => a.addon_type),
    });
  },

  // ─── Update Subscription (Unified Plan + Addons) ─────────────
  // Creates a single invoice for all upgrade charges

  updateSubscription: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const stripe = getStripeClient();
    const coachId = (req as any).user.id;
    const {
      plan,
      clientLimit,
      interval: newInterval,
      addons: newAddons,
    } = req.body as {
      plan?: PlanType;
      clientLimit?: number;
      interval?: BillingInterval;
      addons?: AddonType[];
    };

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('coach_id', coachId)
      .single();

    if (subError || !subscription) {
      res.status(404).json({ error: 'No active subscription found' });
      return;
    }

    if (!subscription.stripe_subscription_id) {
      res.status(400).json({ error: 'No Stripe subscription linked' });
      return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const currentInterval = subscription.billing_interval as BillingInterval;
    const targetInterval = newInterval || currentInterval;
    const isIntervalChanging = newInterval && newInterval !== currentInterval;
    const isSwitchingToAnnual = isIntervalChanging && newInterval === 'year';

    // Get current addons
    const { data: currentAddons } = await supabase
      .from('platform_addons')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    const currentAddonTypes = new Set((currentAddons || []).map(a => a.addon_type));

    // Determine what's changing
    const targetPlan = plan || subscription.plan_type;
    const targetClientLimit = clientLimit || subscription.client_limit;
    const targetAddons = newAddons || Array.from(currentAddonTypes) as AddonType[];

    // Calculate current and new prices using respective intervals
    const currentPlanPrice = getPlanPricing(subscription.plan_type, subscription.client_limit, currentInterval);
    const newPlanPrice = getPlanPricing(targetPlan, targetClientLimit, targetInterval);

    const currentAddonsPrice = Array.from(currentAddonTypes).reduce(
      (sum, addon) => sum + getAddonPricing(addon as AddonType, currentInterval), 0
    );
    const newAddonsToAdd = targetAddons.filter(a => !currentAddonTypes.has(a));
    const newAddonsPrice = newAddonsToAdd.reduce(
      (sum, addon) => sum + getAddonPricing(addon, targetInterval), 0
    );

    // Addons to remove (schedule for end of period)
    const addonsToRemove = (currentAddons || []).filter(a => !targetAddons.includes(a.addon_type as AddonType));

    // Check if this is an upgrade (plan or addons or interval change to annual)
    // Plan tier hierarchy: starter < pro < max
    const planTierOrder: Record<string, number> = { starter: 0, pro: 1, max: 2 };
    const currentTier = planTierOrder[subscription.plan_type] ?? 0;
    const targetTier = planTierOrder[targetPlan] ?? 0;

    let isPlanUpgrade = false;
    if (isSwitchingToAnnual) {
      // Switching to annual is always an upgrade - charged immediately
      isPlanUpgrade = true;
    } else if (targetTier > currentTier) {
      // Moving to higher tier = upgrade
      isPlanUpgrade = true;
    } else if (targetTier < currentTier) {
      // Moving to lower tier = downgrade
      isPlanUpgrade = false;
    } else {
      // Same tier, compare prices (more clients = upgrade)
      isPlanUpgrade = newPlanPrice > currentPlanPrice;
    }
    const hasNewAddons = newAddonsToAdd.length > 0;

    // Calculate charges
    let planPriceDifferenceCents = 0;
    if (isSwitchingToAnnual) {
      // When switching to annual, charge the FULL annual amount for plan + existing addons
      const fullAnnualPlanPrice = getPlanPricing(targetPlan, targetClientLimit, 'year');
      const fullAnnualAddonsPrice = targetAddons
        .filter(a => currentAddonTypes.has(a)) // Only existing addons, not new ones
        .reduce((sum, addon) => sum + getAddonPricing(addon, 'year'), 0);
      planPriceDifferenceCents = (fullAnnualPlanPrice + fullAnnualAddonsPrice) * 100;
    } else if (isPlanUpgrade) {
      planPriceDifferenceCents = (newPlanPrice - currentPlanPrice) * 100;
    }
    const addonPriceCents = newAddonsPrice * 100;
    const totalChargeCents = planPriceDifferenceCents + addonPriceCents;

    // Helper for plan names
    const formatPlanName = (planType: string, clients: number) => {
      const baseName = planType === 'pro' ? 'Athli Pro Plan' : planType === 'max' ? 'Athli Max Plan' : 'Athli Starter Plan';
      return `${baseName} (${clients} clients)`;
    };

    const addonNames: Record<AddonType, string> = {
      automations: 'Athli Automations Add-on',
      ai_assistant: 'Athli AI Assistant Add-on',
      payments: 'Athli Payments Add-on',
    };

    const addonToEntitlement: Record<AddonType, string> = {
      automations: 'has_automations',
      ai_assistant: 'has_ai_assistant',
      payments: 'has_payments',
    };

    // Track what we're updating
    const updates: string[] = [];
    const subscriptionItemUpdates: Stripe.SubscriptionUpdateParams.Item[] = [];
    // Plan downgrade is when tier/clients decrease, NOT when just switching intervals
    const isPlanDowngrade = plan && (plan !== subscription.plan_type || clientLimit !== subscription.client_limit) && !isPlanUpgrade && !isSwitchingToAnnual;

    // ─── Handle Plan Change (including interval-only changes) ─────────────────────────────────────
    // Update plan item when: plan changes, client limit changes, OR billing interval changes
    if (plan && (plan !== subscription.plan_type || clientLimit !== subscription.client_limit || isIntervalChanging)) {
      const planItem = stripeSubscription.items.data.find(
        item => item.price.metadata?.athli_product_type === 'plan' ||
               !item.price.metadata?.athli_addon_type
      );

      if (planItem) {
        // Find or create product for new plan
        const newPlanDisplayName = formatPlanName(targetPlan, targetClientLimit);
        const productSearchKey = `athli_platform_${targetPlan}_${targetClientLimit}`;

        let productId: string;
        const existingProducts = await stripe.products.search({
          query: `metadata['athli_product_key']:'${productSearchKey}'`,
        });

        if (existingProducts.data.length > 0 && existingProducts.data[0].active) {
          productId = existingProducts.data[0].id;
        } else {
          const newProduct = await stripe.products.create({
            name: newPlanDisplayName,
            description: `Up to ${targetClientLimit} clients • Cancel anytime`,
            metadata: {
              athli_product_key: productSearchKey,
              plan_type: targetPlan,
              client_limit: targetClientLimit.toString(),
            },
          });
          productId = newProduct.id;
        }

        // Only update Stripe subscription items immediately for upgrades
        // For downgrades, we update Stripe separately to schedule the change
        if (isPlanUpgrade) {
          subscriptionItemUpdates.push({
            id: planItem.id,
            price_data: {
              currency: 'usd',
              product: productId,
              unit_amount: newPlanPrice * 100,
              recurring: { interval: targetInterval },
            },
          });
          updates.push(`Plan upgrade: ${formatPlanName(subscription.plan_type, subscription.client_limit)} → ${newPlanDisplayName}`);
        } else if (isPlanDowngrade) {
          // For downgrades, update Stripe with the new price (takes effect next billing cycle)
          // but don't include in the immediate update batch
          // NOTE: We do NOT update Stripe metadata here - that would trigger webhook to update DB immediately
          // Instead, metadata is updated at renewal when the downgrade actually takes effect
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            items: [
              {
                id: planItem.id,
                price_data: {
                  currency: 'usd',
                  product: productId,
                  unit_amount: newPlanPrice * 100,
                  recurring: { interval: targetInterval },
                },
              },
            ],
            proration_behavior: 'none', // No refund for downgrade
          });
          logger.info({ coachId, plan: targetPlan, clientLimit: targetClientLimit }, 'Plan downgrade scheduled in Stripe');
        }
      }
    }

    // ─── Handle New Addons ──────────────────────────────────────
    for (const addon of newAddonsToAdd) {
      const price = getAddonPricing(addon, targetInterval);

      // Find or create addon product
      const existingAddonProducts = await stripe.products.search({
        query: `metadata['athli_addon_type']:'${addon}'`,
      });

      let productId: string;
      if (existingAddonProducts.data.length > 0 && existingAddonProducts.data[0].active) {
        productId = existingAddonProducts.data[0].id;
      } else {
        const product = await stripe.products.create({
          name: addonNames[addon],
          metadata: { athli_addon_type: addon },
        });
        productId = product.id;
      }

      const newPrice = await stripe.prices.create({
        product: productId,
        currency: 'usd',
        unit_amount: price * 100,
        recurring: { interval: targetInterval },
      });

      subscriptionItemUpdates.push({
        price: newPrice.id,
        quantity: 1,
      });

      updates.push(`Add-on: ${addonNames[addon]}`);
    }

    // ─── Handle Addon Removals (Schedule for period end) ────────
    const itemsToRemove: Stripe.SubscriptionUpdateParams.Item[] = [];
    for (const addon of addonsToRemove) {
      if (addon.stripe_subscription_item_id) {
        itemsToRemove.push({
          id: addon.stripe_subscription_item_id,
          deleted: true,
        });
      }
    }

    // ─── Handle Interval Change for Existing Addons ─────────────
    // When switching to annual, all existing addon subscription items need to be updated
    if (isIntervalChanging) {
      for (const existingAddon of (currentAddons || [])) {
        if (!targetAddons.includes(existingAddon.addon_type as AddonType)) continue; // Skip if being removed
        if (newAddonsToAdd.includes(existingAddon.addon_type as AddonType)) continue; // Skip if already handled as new

        const addonItem = stripeSubscription.items.data.find(
          item => (item.price.product as any).metadata?.athli_addon_type === existingAddon.addon_type
        );

        if (addonItem) {
          const addonPrice = getAddonPricing(existingAddon.addon_type as AddonType, targetInterval);

          // Find or create addon product
          const existingAddonProducts = await stripe.products.search({
            query: `metadata['athli_addon_type']:'${existingAddon.addon_type}'`,
          });

          let productId: string;
          if (existingAddonProducts.data.length > 0 && existingAddonProducts.data[0].active) {
            productId = existingAddonProducts.data[0].id;
          } else {
            const product = await stripe.products.create({
              name: addonNames[existingAddon.addon_type as AddonType],
              metadata: { athli_addon_type: existingAddon.addon_type },
            });
            productId = product.id;
          }

          subscriptionItemUpdates.push({
            id: addonItem.id,
            price_data: {
              currency: 'usd',
              product: productId,
              unit_amount: addonPrice * 100,
              recurring: { interval: targetInterval },
            },
          });

          // Update addon in DB
          await supabase
            .from('platform_addons')
            .update({
              price_cents: addonPrice * 100,
              billing_interval: targetInterval,
            })
            .eq('coach_id', coachId)
            .eq('addon_type', existingAddon.addon_type);
        }
      }
    }

    // ─── Apply Stripe Subscription Updates ──────────────────────
    if (subscriptionItemUpdates.length > 0 || itemsToRemove.length > 0 || isIntervalChanging) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [...subscriptionItemUpdates, ...itemsToRemove],
        proration_behavior: 'none',
        metadata: {
          plan_type: targetPlan,
          client_limit: targetClientLimit.toString(),
          billing_interval: targetInterval,
        },
      });
    }

    // ─── Create Single Invoice for All Upgrade Charges ──────────
    if (totalChargeCents > 0) {
      const paymentMethodId = stripeSubscription.default_payment_method as string;
      if (!paymentMethodId) {
        throw new Error('No payment method on file. Please update your payment method.');
      }

      // Create single invoice
      const invoice = await stripe.invoices.create({
        customer: stripeSubscription.customer as string,
        collection_method: 'charge_automatically',
        default_payment_method: paymentMethodId,
      });

      // Add line items for each upgrade component
      // Include the billing period so invoices display correctly
      // For upgrades, period should be from today to end of billing cycle
      const now = Math.floor(Date.now() / 1000);
      const billingPeriod = stripeSubscription.current_period_end
        ? {
            start: now,
            end: stripeSubscription.current_period_end,
          }
        : undefined;

      logger.info({
        coachId,
        billingPeriod,
        periodStart: now,
        periodEnd: stripeSubscription.current_period_end,
      }, 'Creating upgrade invoice with billing period');

      if (planPriceDifferenceCents > 0) {
        const description = isSwitchingToAnnual
          ? `Switch to annual billing: ${formatPlanName(targetPlan, targetClientLimit)} (1 year)`
          : `Plan upgrade: ${formatPlanName(subscription.plan_type, subscription.client_limit)} → ${formatPlanName(targetPlan, targetClientLimit)}`;

        await stripe.invoiceItems.create({
          customer: stripeSubscription.customer as string,
          invoice: invoice.id,
          amount: planPriceDifferenceCents,
          currency: 'usd',
          description,
          ...(billingPeriod && { period: billingPeriod }),
        });
      }

      if (addonPriceCents > 0) {
        const addonNamesList = newAddonsToAdd.map(a => addonNames[a]).join(', ');
        await stripe.invoiceItems.create({
          customer: stripeSubscription.customer as string,
          invoice: invoice.id,
          amount: addonPriceCents,
          currency: 'usd',
          description: `Add-on purchase: ${addonNamesList}`,
          ...(billingPeriod && { period: billingPeriod }),
        });
      }

      // Finalize and pay
      await stripe.invoices.finalizeInvoice(invoice.id);
      const paidInvoice = await stripe.invoices.pay(invoice.id, {
        payment_method: paymentMethodId,
      });

      if (paidInvoice.status !== 'paid') {
        logger.warn({ invoiceId: invoice.id, status: paidInvoice.status }, 'Subscription update invoice payment not completed');
        throw new Error('Payment failed. Please check your payment method.');
      }

      logger.info({ coachId, invoiceId: invoice.id, amount: totalChargeCents }, 'Unified subscription upgrade invoice paid');
    }

    // ─── Update Database Records ────────────────────────────────

    // Update plan in platform_subscriptions
    if (plan || clientLimit || isIntervalChanging) {
      const planUpdates: Record<string, any> = {
        plan_type: targetPlan,
        client_limit: targetClientLimit,
        current_price_cents: newPlanPrice * 100,
        billing_interval: targetInterval,
      };

      // If downgrade, schedule it instead (but NOT for interval changes to annual)
      if (!isPlanUpgrade && !isSwitchingToAnnual && (plan !== subscription.plan_type || clientLimit !== subscription.client_limit)) {
        planUpdates.scheduled_plan_type = targetPlan;
        planUpdates.scheduled_client_limit = targetClientLimit;
        // Don't update current values for downgrades
        delete planUpdates.plan_type;
        delete planUpdates.client_limit;
        delete planUpdates.current_price_cents;
        delete planUpdates.billing_interval;
      } else {
        planUpdates.scheduled_plan_type = null;
        planUpdates.scheduled_client_limit = null;
      }

      await supabase
        .from('platform_subscriptions')
        .update(planUpdates)
        .eq('coach_id', coachId);
    }

    // Add new addons to platform_addons
    for (const addon of newAddonsToAdd) {
      const price = getAddonPricing(addon, targetInterval);
      await supabase.from('platform_addons').upsert({
        coach_id: coachId,
        addon_type: addon,
        price_cents: price * 100,
        billing_interval: targetInterval,
        is_active: true,
        cancel_at_period_end: false,
      }, { onConflict: 'coach_id,addon_type' });
    }

    // Schedule addon removals
    for (const addon of addonsToRemove) {
      await supabase
        .from('platform_addons')
        .update({ cancel_at_period_end: true })
        .eq('coach_id', coachId)
        .eq('addon_type', addon.addon_type);
    }

    // ─── Update Entitlements ────────────────────────────────────
    const entitlementUpdates: Record<string, any> = {};

    // Plan entitlements (only for upgrades)
    if (isPlanUpgrade) {
      entitlementUpdates.plan_type = targetPlan;
      entitlementUpdates.client_limit = targetClientLimit;

      if (targetPlan === 'max') {
        entitlementUpdates.has_ai_workout_builder = true;
        entitlementUpdates.has_custom_exercises = true;
        entitlementUpdates.has_questionnaires = true;
        entitlementUpdates.has_habits_metrics = true;
        entitlementUpdates.storage_limit_gb = 50;
        entitlementUpdates.has_broadcast_messaging = true;
        entitlementUpdates.has_ai_todo_list = true;
        entitlementUpdates.has_priority_support = true;
      } else if (targetPlan === 'pro') {
        entitlementUpdates.has_ai_workout_builder = true;
        entitlementUpdates.has_custom_exercises = true;
        entitlementUpdates.has_questionnaires = true;
        entitlementUpdates.has_habits_metrics = true;
        entitlementUpdates.storage_limit_gb = 10;
        entitlementUpdates.has_broadcast_messaging = false;
        entitlementUpdates.has_ai_todo_list = false;
        entitlementUpdates.has_priority_support = false;
      }
    }

    // Addon entitlements (only for additions)
    for (const addon of newAddonsToAdd) {
      entitlementUpdates[addonToEntitlement[addon]] = true;
    }

    if (Object.keys(entitlementUpdates).length > 0) {
      await supabase
        .from('coach_entitlements')
        .update(entitlementUpdates)
        .eq('coach_id', coachId);
    }

    logger.info({
      coachId,
      planChange: plan ? { from: subscription.plan_type, to: targetPlan } : null,
      addonsAdded: newAddonsToAdd,
      addonsScheduledForRemoval: addonsToRemove.map(a => a.addon_type),
      totalCharged: totalChargeCents,
    }, 'Subscription updated with unified invoice');

    res.json({
      success: true,
      planUpdated: !!(plan || isIntervalChanging),
      isPlanUpgrade,
      isPlanDowngrade: !!isPlanDowngrade,
      intervalUpdated: !!isIntervalChanging,
      newInterval: isIntervalChanging ? targetInterval : undefined,
      addonsAdded: newAddonsToAdd,
      addonsScheduledForRemoval: addonsToRemove.map(a => a.addon_type),
      totalChargedCents: totalChargeCents,
    });
  },

  // ─── Cancel Addon (Schedule for End of Period) ───────────────

  cancelAddon: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { addonType } = req.params as { addonType: AddonType };

    // Validate addon type
    const validAddonTypes: AddonType[] = ['automations', 'ai_assistant', 'payments'];
    if (!validAddonTypes.includes(addonType)) {
      res.status(400).json({ error: 'Invalid addon type' });
      return;
    }

    // Update the addon to schedule cancellation
    const { error } = await supabase
      .from('platform_addons')
      .update({ cancel_at_period_end: true })
      .eq('coach_id', coachId)
      .eq('addon_type', addonType)
      .eq('is_active', true);

    if (error) {
      logger.error({ error, coachId, addonType }, 'Failed to schedule addon cancellation');
      res.status(500).json({ error: 'Failed to schedule addon cancellation' });
      return;
    }

    res.json({ success: true });
  },

  // ─── Reactivate Addon (Undo Scheduled Cancellation) ──────────

  reactivateAddon: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const coachId = (req as any).user.id;
    const { addonType } = req.params as { addonType: AddonType };

    // Validate addon type
    const validAddonTypes: AddonType[] = ['automations', 'ai_assistant', 'payments'];
    if (!validAddonTypes.includes(addonType)) {
      res.status(400).json({ error: 'Invalid addon type' });
      return;
    }

    // Update the addon to cancel the scheduled cancellation
    const { error } = await supabase
      .from('platform_addons')
      .update({ cancel_at_period_end: false })
      .eq('coach_id', coachId)
      .eq('addon_type', addonType)
      .eq('is_active', true);

    if (error) {
      logger.error({ error, coachId, addonType }, 'Failed to reactivate addon');
      res.status(500).json({ error: 'Failed to reactivate addon' });
      return;
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

    // Also reinstate all add-ons that were scheduled for cancellation
    await supabase
      .from('platform_addons')
      .update({ cancel_at_period_end: false })
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .eq('cancel_at_period_end', true);

    res.json({ success: true });
  },

  // ─── Webhook Handler ─────────────────────────────────────────

  webhook: async (req: Request, res: Response) => {
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`[BILLING WEBHOOK] Received webhook request`);
    console.log(`${'#'.repeat(60)}\n`);

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

    console.log(`[BILLING WEBHOOK] Event type: ${event.type}, ID: ${event.id}`);

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from('stripe_billing_webhook_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[BILLING WEBHOOK] DUPLICATE EVENT - skipping: ${event.id}`);
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    console.log(`[BILLING WEBHOOK] Processing new event: ${event.type}`);

    // Extract coach_id from the event object (varies by event type)
    let coachId: string | null = null;
    const eventObject = event.data.object as any;

    // Try to get coach_id from various places depending on event type
    if (eventObject.metadata?.coach_id) {
      coachId = eventObject.metadata.coach_id;
    } else if (eventObject.subscription) {
      // For invoice events, look up the subscription to get coach_id
      const { data: sub } = await supabase
        .from('platform_subscriptions')
        .select('coach_id')
        .eq('stripe_subscription_id', eventObject.subscription)
        .maybeSingle();
      coachId = sub?.coach_id || null;
    } else if (eventObject.customer) {
      // Fallback: look up by customer ID
      const { data: sub } = await supabase
        .from('platform_subscriptions')
        .select('coach_id')
        .eq('stripe_customer_id', eventObject.customer)
        .maybeSingle();
      coachId = sub?.coach_id || null;
    }

    try {
      await handlePlatformWebhookEvent(event, supabase, stripe);

      // Record event for idempotency (with coach_id if found)
      await supabase.from('stripe_billing_webhook_events').insert({
        id: event.id,
        type: event.type,
        payload: event as any,
        coach_id: coachId,
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

  // ─── Public: Lookup Referral Code Info ─────────────────────────
  // No auth required - used on the referral landing page

  lookupReferralCode: async (req: Request, res: Response) => {
    const supabase = getSupabaseClient();
    const { code } = req.params;

    if (!code || code.trim().length === 0) {
      res.status(400).json({ error: 'Referral code is required' });
      return;
    }

    try {
      let coachId: string | null = null;

      // 1. Try coach_unique_codes table first (exact match)
      const { data: codeRecord } = await supabase
        .from('coach_unique_codes')
        .select('coach_id')
        .eq('code', code)
        .maybeSingle();

      if (codeRecord) {
        coachId = codeRecord.coach_id;
      }

      // 2. Fallback: try with uppercase code
      if (!coachId) {
        const { data: codeRecordUpper } = await supabase
          .from('coach_unique_codes')
          .select('coach_id')
          .eq('code', code.toUpperCase())
          .is('onboarding_id', null)
          .maybeSingle();

        if (codeRecordUpper) {
          coachId = codeRecordUpper.coach_id;
        }
      }

      if (!coachId) {
        res.status(404).json({ error: 'Invalid referral code' });
        return;
      }

      // Get referrer's profile info
      const { data: referrerProfile } = await supabase
        .from('coach_profiles_full')
        .select('name, profile_picture_url')
        .eq('id', coachId)
        .single();

      if (!referrerProfile) {
        res.status(404).json({ error: 'Referrer not found' });
        return;
      }

      res.json({
        name: referrerProfile.name || 'A coach',
        profilePictureUrl: referrerProfile.profile_picture_url || null,
      });
    } catch (err: any) {
      logger.error({ err: err.message, code }, 'Failed to lookup referral code');
      res.status(500).json({ error: 'Failed to lookup referral code' });
    }
  },
};

// ─── Webhook Event Handlers ───────────────────────────────────

async function handlePlatformWebhookEvent(event: Stripe.Event, supabase: any, stripe: Stripe) {
  const eventType = event.type;
  console.log(`[BILLING WEBHOOK] handlePlatformWebhookEvent called with: ${eventType}`);

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
      console.log(`[BILLING WEBHOOK] >>> INVOICE.PAID - calling handleInvoicePaid`);
      await handleInvoicePaid(event, supabase);
      console.log(`[BILLING WEBHOOK] <<< INVOICE.PAID - handleInvoicePaid complete`);
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

  // Calculate plan price only (not including addons - those are tracked separately)
  // Use the pricing constants to calculate based on plan type and client limit
  let planPriceCents = 0;
  if (planType !== 'starter' && billingInterval) {
    const planPricing = planType === 'pro' ? PRO_PRICING : MAX_PRICING;
    const planTier = planPricing[clientLimit];
    if (planTier) {
      planPriceCents = billingInterval === 'year' ? planTier[1] * 12 * 100 : planTier[0] * 100;
    }
  }

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
      current_price_cents: planPriceCents,
      status: subscription.status === 'trialing' ? 'trialing' : 'active',
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      stripe_price_id: subscription.items.data[0]?.price.id,
    }, { onConflict: 'coach_id' });

  // Update addons from metadata (product metadata isn't expanded in webhooks)
  // Map addon types to expected prices (cents) for matching subscription items
  const addonPriceMap: Record<AddonType, number> = {
    ai_assistant: 2500,
    automations: 2000,
    payments: 1000,
  };

  for (const addon of addons) {
    // Try to find the matching subscription item by price
    const matchingItem = subscription.items.data.find(
      item => item.price.unit_amount === addonPriceMap[addon]
    );

    await supabase.from('platform_addons').upsert({
      coach_id: coachId,
      addon_type: addon,
      stripe_subscription_item_id: matchingItem?.id || null,
      stripe_price_id: matchingItem?.price.id || null,
      price_cents: matchingItem?.price.unit_amount || addonPriceMap[addon] || 0,
      billing_interval: billingInterval,
      is_active: true,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    }, { onConflict: 'coach_id,addon_type' });
  }

  // Mark free trial as complete since they now have a paid subscription
  await supabase
    .from('coach_profiles')
    .update({ free_trial_completed: true })
    .eq('id', coachId);

  // Backfill any pending referral credits that couldn't be applied earlier
  // (e.g., this coach referred someone who paid while this coach was still on free trial)
  const stripe = getStripeClient();
  await backfillPendingReferralCredits(coachId, subscription.customer as string, supabase, stripe);

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
  const addons = subscription.metadata?.addons?.split(',').filter(Boolean) as AddonType[] || [];

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

  // Calculate plan price only (not including addons - those are tracked separately)
  let planPriceCents = 0;
  if (planType !== 'starter' && billingInterval) {
    const planPricing = planType === 'pro' ? PRO_PRICING : MAX_PRICING;
    const planTier = planPricing[clientLimit];
    if (planTier) {
      planPriceCents = billingInterval === 'year' ? planTier[1] * 12 * 100 : planTier[0] * 100;
    }
  }

  // Update subscription
  await supabase
    .from('platform_subscriptions')
    .update({
      plan_type: planType,
      client_limit: clientLimit,
      billing_interval: billingInterval,
      current_price_cents: planPriceCents,
      status: status,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('coach_id', coachId);

  // Update addons - mark all inactive first, then activate current ones from metadata
  await supabase
    .from('platform_addons')
    .update({ is_active: false })
    .eq('coach_id', coachId);

  // Map addon types to expected prices (cents) for matching subscription items
  const addonPriceMap: Record<AddonType, number> = {
    ai_assistant: 2500,
    automations: 2000,
    payments: 1000,
  };

  for (const addon of addons) {
    // Try to find the matching subscription item by price
    const matchingItem = subscription.items.data.find(
      item => item.price.unit_amount === addonPriceMap[addon]
    );

    await supabase.from('platform_addons').upsert({
      coach_id: coachId,
      addon_type: addon,
      stripe_subscription_item_id: matchingItem?.id || null,
      stripe_price_id: matchingItem?.price.id || null,
      price_cents: matchingItem?.price.unit_amount || addonPriceMap[addon] || 0,
      billing_interval: billingInterval,
      is_active: true,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    }, { onConflict: 'coach_id,addon_type' });
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
  console.log(`[BILLING WEBHOOK] handleInvoicePaid ENTERED`);

  const stripe = getStripeClient();
  const invoice = event.data.object as Stripe.Invoice;

  // In newer Stripe API versions, subscription ID may be in parent.subscription_details.subscription
  // Fall back to the old location for backwards compatibility
  const subscriptionId = (invoice as any).subscription
    || (invoice as any).parent?.subscription_details?.subscription;

  console.log(`[BILLING WEBHOOK] handleInvoicePaid - subscriptionId: ${subscriptionId}`);

  if (!subscriptionId) {
    console.log(`[BILLING WEBHOOK] handleInvoicePaid - NO SUBSCRIPTION, returning early`);
    logger.info({ invoiceId: invoice.id }, 'invoice.paid - no subscription, skipping');
    return;
  }

  // Get coach_id from invoice's subscription metadata (more reliable than DB lookup)
  // invoice.paid can fire before customer.subscription.created, so DB record may not exist yet
  const subscriptionMetadata = (invoice as any).parent?.subscription_details?.metadata;
  const invoiceLineMetadata = invoice.lines?.data?.[0]?.metadata;

  logger.info({
    subscriptionId,
    invoiceId: invoice.id,
    subscriptionMetadata,
    invoiceLineMetadata,
  }, 'invoice.paid - checking metadata sources');

  // Try multiple sources for coach_id
  let coachId = subscriptionMetadata?.coach_id || invoiceLineMetadata?.coach_id;
  let stripeCustomerId = invoice.customer as string;

  // Fallback: try to get from DB if metadata doesn't have it
  if (!coachId) {
    logger.info({ subscriptionId }, 'invoice.paid - metadata empty, looking up from DB');
    const { data: sub, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('coach_id, stripe_customer_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    logger.info({ sub, subError }, 'invoice.paid - DB lookup result');

    if (sub) {
      coachId = sub.coach_id;
      stripeCustomerId = sub.stripe_customer_id || stripeCustomerId;
    }
  }

  // Last resort: retrieve subscription from Stripe to get metadata
  if (!coachId) {
    logger.info({ subscriptionId }, 'invoice.paid - DB empty, retrieving from Stripe');
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      coachId = stripeSubscription.metadata?.coach_id;
      logger.info({ coachId, metadata: stripeSubscription.metadata }, 'invoice.paid - Stripe subscription metadata');
    } catch (err: any) {
      logger.warn({ err: err.message, subscriptionId }, 'invoice.paid - failed to retrieve subscription from Stripe');
    }
  }

  if (!coachId) {
    logger.warn({ subscriptionId, invoiceId: invoice.id }, 'Could not find coach_id for invoice.paid');
    return;
  }

  logger.info({ coachId, subscriptionId, invoiceId: invoice.id }, 'invoice.paid - found coach_id');

  // Log payment
  await logPlatformBillingActivity(supabase, {
    coach_id: coachId,
    event_type: 'payment_succeeded',
    description: `Payment successful - $${(invoice.amount_paid / 100).toFixed(2)}`,
    amount_cents: invoice.amount_paid,
    currency: invoice.currency,
    stripe_event_id: event.id,
    metadata: { invoice_id: invoice.id },
  });

  // Handle referral credits (only on first payment)
  // Check if this is the first invoice (subscription creation)
  const billingReason = (invoice as any).billing_reason;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[REFERRAL] Processing invoice.paid for coach: ${coachId}`);
  console.log(`[REFERRAL] billing_reason: ${billingReason}`);
  console.log(`[REFERRAL] invoice_id: ${invoice.id}`);
  console.log(`${'='.repeat(60)}\n`);

  if (billingReason === 'subscription_create') {
    try {
      console.log(`[REFERRAL] billing_reason is subscription_create - checking for referral...`);

      // Check if this coach was referred and credits haven't been applied yet
      const { data: referral, error: referralError } = await supabase
        .from('coach_referrals')
        .select('id, referrer_coach_id, referrer_credit_applied_at, referred_credit_applied_at, referred_coach_name, referred_coach_profile_picture_url, status')
        .eq('referred_coach_id', coachId)
        .maybeSingle();

      console.log(`[REFERRAL] Lookup result:`, { referral, referralError });

      if (referral && !referral.referrer_credit_applied_at) {
        console.log(`[REFERRAL] Found referral! ID: ${referral.id}, status: ${referral.status}`);
        console.log(`[REFERRAL] referrer_credit_applied_at is null - proceeding with conversion`);

        // Get the referred coach's current info (in case it wasn't stored yet)
        const { data: referredCoachProfile } = await supabase
          .from('user_profiles')
          .select('name, profile_picture_url')
          .eq('id', coachId)
          .eq('user_type', 'coach')
          .maybeSingle();

        const referredCoachName = referral.referred_coach_name || referredCoachProfile?.name || 'Unknown';
        const referredCoachPicture = referral.referred_coach_profile_picture_url || referredCoachProfile?.profile_picture_url;
        // Track whether credits were actually applied to Stripe
        let referrerCreditApplied = false;
        let referredCreditApplied = false;

        // Check if referrer still exists (they might have deleted their account)
        const referrerExists = !!referral.referrer_coach_id;
        console.log(`[REFERRAL] referrerExists: ${referrerExists}, referrer_coach_id: ${referral.referrer_coach_id}`);

        // Get the referrer's Stripe customer ID (only if referrer exists)
        if (referrerExists) {
          const { data: referrerSub } = await supabase
            .from('platform_subscriptions')
            .select('stripe_customer_id')
            .eq('coach_id', referral.referrer_coach_id)
            .maybeSingle();

          if (referrerSub?.stripe_customer_id) {
            console.log(`[REFERRAL] Applying $${REFERRAL_CREDIT_CENTS/100} credit to REFERRER (Coach A) stripe customer: ${referrerSub.stripe_customer_id}`);
            // Apply credit to the referrer's Stripe balance (for their next invoice)
            await stripe.customers.createBalanceTransaction(referrerSub.stripe_customer_id, {
              amount: -REFERRAL_CREDIT_CENTS, // Negative = credit
              currency: 'usd',
              description: 'Referral reward - Your referred coach subscribed!',
            });
            referrerCreditApplied = true;
            console.log(`[REFERRAL] SUCCESS - Applied credit to referrer`);
          } else {
            // Referrer doesn't have Stripe customer yet - credit will be applied when they subscribe
            console.log(`[REFERRAL] Referrer has no Stripe customer yet - credit will be applied when they subscribe`);
          }
        } else {
          console.log(`[REFERRAL] Referrer deleted their account - skipping referrer credit`);
        }

        // Apply credit to the referred coach (Coach B) for their next invoice
        // This happens regardless of whether the referrer still exists
        console.log(`[REFERRAL] Applying $${REFERRAL_CREDIT_CENTS/100} credit to REFERRED (Coach B) stripe customer: ${stripeCustomerId}`);
        if (stripeCustomerId) {
          await stripe.customers.createBalanceTransaction(stripeCustomerId, {
            amount: -REFERRAL_CREDIT_CENTS, // Negative = credit
            currency: 'usd',
            description: 'Referral bonus - $20 credit for your next invoice!',
          });
          referredCreditApplied = true;
          console.log(`[REFERRAL] SUCCESS - Applied credit to referred coach`);
        } else {
          console.log(`[REFERRAL] ERROR - No stripe customer ID for referred coach!`);
        }

        // Update referral status to converted
        // Only mark credits as "applied" if they were actually applied to Stripe
        const convertedAt = new Date().toISOString();
        console.log(`[REFERRAL] Updating referral ${referral.id} to status=converted...`);

        const { error: updateError } = await supabase
          .from('coach_referrals')
          .update({
            status: 'converted',
            converted_at: convertedAt,
            referrer_credit_cents: referrerExists ? REFERRAL_CREDIT_CENTS : 0, // No credit if referrer deleted
            referrer_credit_applied_at: referrerCreditApplied ? convertedAt : null,
            referred_credit_cents: REFERRAL_CREDIT_CENTS,
            referred_credit_applied_at: referredCreditApplied ? convertedAt : null,
            // Store coach info in case they delete their account later
            referred_coach_name: referredCoachName,
            referred_coach_profile_picture_url: referredCoachPicture,
          })
          .eq('id', referral.id);

        if (updateError) {
          console.error(`[REFERRAL] ERROR updating referral status:`, updateError);
        } else {
          console.log(`[REFERRAL] SUCCESS - Referral ${referral.id} updated to converted`);
        }

        // Create 'converted' event for the referrer's activity timeline (only if referrer exists)
        if (referrerExists) {
          console.log(`[REFERRAL] Creating converted event for referrer ${referral.referrer_coach_id}...`);

          const { error: eventError } = await supabase
            .from('coach_referral_events')
            .insert({
              referral_id: referral.id,
              referrer_coach_id: referral.referrer_coach_id,
              event_type: 'converted',
              referred_coach_name: referredCoachName,
              referred_coach_profile_picture_url: referredCoachPicture,
              credit_cents: REFERRAL_CREDIT_CENTS,
              created_at: convertedAt,
            });

          if (eventError) {
            console.error(`[REFERRAL] ERROR creating referral event:`, eventError);
          } else {
            console.log(`[REFERRAL] SUCCESS - Created converted event`);
          }

          // Log referral conversion for referrer
          await logPlatformBillingActivity(supabase, {
            coach_id: referral.referrer_coach_id,
            event_type: 'referral_converted',
            description: `Referral converted - $${(REFERRAL_CREDIT_CENTS / 100).toFixed(2)} credit earned`,
            amount_cents: REFERRAL_CREDIT_CENTS,
            stripe_event_id: event.id,
            metadata: { referred_coach_id: coachId },
          });
        }

        // Log credit earned for referred coach
        await logPlatformBillingActivity(supabase, {
          coach_id: coachId,
          event_type: 'referral_credit_received',
          description: `Referral bonus - $${(REFERRAL_CREDIT_CENTS / 100).toFixed(2)} credit received`,
          amount_cents: REFERRAL_CREDIT_CENTS,
          stripe_event_id: event.id,
          metadata: { referrer_coach_id: referral.referrer_coach_id },
        });

        console.log(`[REFERRAL] ${'*'.repeat(50)}`);
        console.log(`[REFERRAL] CONVERSION COMPLETE for coach ${coachId}`);
        console.log(`[REFERRAL] Referral ID: ${referral.id}`);
        console.log(`[REFERRAL] Referrer: ${referral.referrer_coach_id}`);
        console.log(`[REFERRAL] ${'*'.repeat(50)}\n`);
        logger.info({ coachId, referralId: referral.id, referrerCoachId: referral.referrer_coach_id, referrerExists }, 'Referral converted successfully');
      } else {
        console.log(`[REFERRAL] NOT PROCESSING - referral: ${!!referral}, creditAlreadyApplied: ${referral?.referrer_credit_applied_at}`);
        logger.info({ coachId, referralExists: !!referral, creditAlreadyApplied: referral?.referrer_credit_applied_at }, 'Referral not processed - already applied or no referral');
      }
    } catch (referralError: any) {
      // Don't fail the webhook if referral credit fails
      console.error(`[REFERRAL] EXCEPTION:`, referralError);
      logger.warn({ err: referralError.message, coachId }, 'Failed to process referral credits');
    }
  } else {
    console.log(`[REFERRAL] SKIPPING - billing_reason is '${billingReason}', not 'subscription_create'`);
    logger.info({ coachId, billingReason }, 'Skipping referral processing - not subscription_create');
  }

  // Apply scheduled downgrades on subscription renewal (billing cycle)
  if (billingReason === 'subscription_cycle') {
    try {
      logger.info({ coachId }, 'Checking for scheduled downgrades to apply at renewal');

      // Check for scheduled plan downgrade
      const { data: subscriptionData } = await supabase
        .from('platform_subscriptions')
        .select('scheduled_plan_type, scheduled_client_limit, plan_type, client_limit, billing_interval, stripe_subscription_id')
        .eq('coach_id', coachId)
        .maybeSingle();

      if (subscriptionData?.scheduled_plan_type || subscriptionData?.scheduled_client_limit) {
        const newPlan = subscriptionData.scheduled_plan_type || subscriptionData.plan_type;
        const newClientLimit = subscriptionData.scheduled_client_limit || subscriptionData.client_limit;

        // Apply scheduled plan change to DB
        await supabase
          .from('platform_subscriptions')
          .update({
            plan_type: newPlan,
            client_limit: newClientLimit,
            scheduled_plan_type: null,
            scheduled_client_limit: null,
          })
          .eq('coach_id', coachId);

        // Update Stripe subscription metadata now that the downgrade is taking effect
        if (subscriptionData.stripe_subscription_id) {
          try {
            await stripe.subscriptions.update(subscriptionData.stripe_subscription_id, {
              metadata: {
                plan_type: newPlan,
                client_limit: newClientLimit.toString(),
                billing_interval: subscriptionData.billing_interval || 'month',
              },
            });
            logger.info({ coachId, newPlan, newClientLimit }, 'Updated Stripe metadata for scheduled downgrade');
          } catch (stripeErr: any) {
            logger.warn({ err: stripeErr.message, coachId }, 'Failed to update Stripe metadata for downgrade');
          }
        }

        // Update entitlements to new (downgraded) level
        const entitlementUpdates: Record<string, any> = {
          plan_type: newPlan,
          client_limit: newClientLimit,
        };

        // Set features based on plan
        if (newPlan === 'max') {
          entitlementUpdates.has_ai_workout_builder = true;
          entitlementUpdates.has_custom_exercises = true;
          entitlementUpdates.has_questionnaires = true;
          entitlementUpdates.has_habits_metrics = true;
          entitlementUpdates.storage_limit_gb = 50;
          entitlementUpdates.has_broadcast_messaging = true;
          entitlementUpdates.has_ai_todo_list = true;
          entitlementUpdates.has_priority_support = true;
        } else if (newPlan === 'pro') {
          entitlementUpdates.has_ai_workout_builder = true;
          entitlementUpdates.has_custom_exercises = true;
          entitlementUpdates.has_questionnaires = true;
          entitlementUpdates.has_habits_metrics = true;
          entitlementUpdates.storage_limit_gb = 10;
          entitlementUpdates.has_broadcast_messaging = false;
          entitlementUpdates.has_ai_todo_list = false;
          entitlementUpdates.has_priority_support = false;
        } else if (newPlan === 'starter') {
          entitlementUpdates.has_ai_workout_builder = false;
          entitlementUpdates.has_custom_exercises = false;
          entitlementUpdates.has_questionnaires = false;
          entitlementUpdates.has_habits_metrics = false;
          entitlementUpdates.storage_limit_gb = 1;
          entitlementUpdates.has_broadcast_messaging = false;
          entitlementUpdates.has_ai_todo_list = false;
          entitlementUpdates.has_priority_support = false;
        }

        await supabase
          .from('coach_entitlements')
          .update(entitlementUpdates)
          .eq('coach_id', coachId);

        logger.info({ coachId, newPlan, newClientLimit }, 'Applied scheduled plan downgrade at renewal');
      }

      // Check for scheduled addon removals
      const { data: addonsToRemove } = await supabase
        .from('platform_addons')
        .select('addon_type')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .eq('cancel_at_period_end', true);

      if (addonsToRemove && addonsToRemove.length > 0) {
        // Map addon type to entitlement field
        const addonToEntitlement: Record<string, string> = {
          automations: 'has_automations',
          ai_assistant: 'has_ai_assistant',
          payments: 'has_payments',
        };

        // Deactivate the addons
        for (const addon of addonsToRemove) {
          await supabase
            .from('platform_addons')
            .update({ is_active: false, cancel_at_period_end: false })
            .eq('coach_id', coachId)
            .eq('addon_type', addon.addon_type);
        }

        // Remove entitlements for cancelled addons
        const addonEntitlementUpdates: Record<string, boolean> = {};
        for (const addon of addonsToRemove) {
          const entitlementField = addonToEntitlement[addon.addon_type];
          if (entitlementField) {
            addonEntitlementUpdates[entitlementField] = false;
          }
        }

        if (Object.keys(addonEntitlementUpdates).length > 0) {
          await supabase
            .from('coach_entitlements')
            .update(addonEntitlementUpdates)
            .eq('coach_id', coachId);
        }

        logger.info({ coachId, addons: addonsToRemove.map(a => a.addon_type) }, 'Applied scheduled addon removals at renewal');
      }
    } catch (err: any) {
      logger.warn({ err: err.message, coachId }, 'Failed to apply scheduled downgrades at renewal');
    }
  }

  console.log(`[REFERRAL] invoice.paid processing complete for coach ${coachId}\n`);
  logger.info({ coachId, amount: invoice.amount_paid }, 'Platform invoice paid');
}

async function handleInvoicePaymentFailed(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  // In newer Stripe API versions, subscription ID may be in parent.subscription_details.subscription
  const subscription = (invoice as any).subscription
    || (invoice as any).parent?.subscription_details?.subscription;

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
