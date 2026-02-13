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
          converted_at,
          created_at
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
          status,
          referred_credit_cents,
          referred_credit_applied_at,
          converted_at,
          created_at
        `)
        .eq('referred_coach_id', coachId)
        .maybeSingle() as { data: {
          id: string;
          referrer_coach_id: string;
          status: string;
          referred_credit_cents: number;
          referred_credit_applied_at: string | null;
          converted_at: string | null;
          created_at: string;
        } | null };

      // Get referred coach names
      const referredCoachIds = referrals?.map(r => r.referred_coach_id) || [];
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
      const mappedReferrals = referrals?.map(r => ({
        id: r.id,
        coach_name: coachProfiles[r.referred_coach_id]?.name || 'Unknown',
        profile_picture_url: coachProfiles[r.referred_coach_id]?.profile_picture_url || null,
        status: r.status,
        credit_earned_cents: r.referrer_credit_cents || 0,
        trial_started_at: r.trial_started_at,
        trial_ended_at: r.trial_ended_at,
        converted_at: r.converted_at,
        created_at: r.created_at,
      })) || [];

      // Build referredBy info if this coach was referred and has converted (paid)
      // Show once status is 'converted', regardless of whether credit was applied to Stripe yet
      let referredByInfo = null;
      if (referredBy && referredBy.status === 'converted') {
        referredByInfo = {
          id: referredBy.id,
          coach_name: coachProfiles[referredBy.referrer_coach_id]?.name || 'Unknown',
          profile_picture_url: coachProfiles[referredBy.referrer_coach_id]?.profile_picture_url || null,
          status: 'credit_received' as const,
          credit_earned_cents: referredBy.referred_credit_cents || 0,
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

        return {
          id: invoice.id,
          number: invoice.number,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          created: invoice.created,
          period_start: periodStart,
          period_end: periodEnd,
          hosted_invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
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

      // Backfill any pending referral credits that couldn't be applied earlier
      // (e.g., this coach referred someone who paid while this coach was still on free trial)
      await backfillPendingReferralCredits(coachId, stripeCustomerId, supabase, stripe);
    }

    // Build line items with inline pricing to show client count in product name
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Calculate plan price
    const planPricing = plan === 'pro' ? PRO_PRICING : MAX_PRICING;
    const planTier = planPricing[clientLimit];
    const planPriceCents = planTier
      ? (interval === 'year' ? planTier[1] * 12 * 100 : planTier[0] * 100)
      : 0;

    // Plan names for display
    const planDisplayName = plan === 'pro' ? 'Athli Pro Plan' : 'Athli Max Plan';

    // Main plan with client count in description
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
      .from('stripe_billing_webhook_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();

    if (existingEvent) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

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
  const stripe = getStripeClient();
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) return;

  // Get coach_id from invoice's subscription metadata (more reliable than DB lookup)
  // invoice.paid can fire before customer.subscription.created, so DB record may not exist yet
  const subscriptionMetadata = (invoice as any).parent?.subscription_details?.metadata;
  const invoiceLineMetadata = invoice.lines?.data?.[0]?.metadata;

  // Try multiple sources for coach_id
  let coachId = subscriptionMetadata?.coach_id || invoiceLineMetadata?.coach_id;
  let stripeCustomerId = invoice.customer as string;

  // Fallback: try to get from DB if metadata doesn't have it
  if (!coachId) {
    const { data: sub } = await supabase
      .from('platform_subscriptions')
      .select('coach_id, stripe_customer_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (sub) {
      coachId = sub.coach_id;
      stripeCustomerId = sub.stripe_customer_id || stripeCustomerId;
    }
  }

  if (!coachId) {
    logger.warn({ subscriptionId, invoiceId: invoice.id }, 'Could not find coach_id for invoice.paid');
    return;
  }

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
  if ((invoice as any).billing_reason === 'subscription_create') {
    try {
      // Check if this coach was referred and credits haven't been applied yet
      const { data: referral } = await supabase
        .from('coach_referrals')
        .select('id, referrer_coach_id, referrer_credit_applied_at, referred_credit_applied_at')
        .eq('referred_coach_id', coachId)
        .maybeSingle();

      if (referral && !referral.referrer_credit_applied_at) {
        // Track whether credits were actually applied to Stripe
        let referrerCreditApplied = false;
        let referredCreditApplied = false;

        // Get the referrer's Stripe customer ID
        const { data: referrerSub } = await supabase
          .from('platform_subscriptions')
          .select('stripe_customer_id')
          .eq('coach_id', referral.referrer_coach_id)
          .maybeSingle();

        if (referrerSub?.stripe_customer_id) {
          // Apply credit to the referrer's Stripe balance (for their next invoice)
          await stripe.customers.createBalanceTransaction(referrerSub.stripe_customer_id, {
            amount: -REFERRAL_CREDIT_CENTS, // Negative = credit
            currency: 'usd',
            description: 'Referral reward - Your referred coach subscribed!',
          });
          referrerCreditApplied = true;

          logger.info(
            { referrerCoachId: referral.referrer_coach_id, creditCents: REFERRAL_CREDIT_CENTS },
            'Applied referral credit to referrer'
          );
        } else {
          // Referrer doesn't have Stripe customer yet - credit will be applied when they subscribe
          logger.info(
            { referrerCoachId: referral.referrer_coach_id, creditCents: REFERRAL_CREDIT_CENTS },
            'Referrer credit pending - no Stripe customer yet'
          );
        }

        // Apply credit to the referred coach (Coach B) for their next invoice
        if (stripeCustomerId) {
          await stripe.customers.createBalanceTransaction(stripeCustomerId, {
            amount: -REFERRAL_CREDIT_CENTS, // Negative = credit
            currency: 'usd',
            description: 'Referral bonus - $20 credit for your next invoice!',
          });
          referredCreditApplied = true;

          logger.info(
            { referredCoachId: coachId, creditCents: REFERRAL_CREDIT_CENTS },
            'Applied referral credit to referred coach'
          );
        }

        // Update referral status to converted
        // Only mark credits as "applied" if they were actually applied to Stripe
        await supabase
          .from('coach_referrals')
          .update({
            status: 'converted',
            converted_at: new Date().toISOString(),
            referrer_credit_cents: REFERRAL_CREDIT_CENTS,
            referrer_credit_applied_at: referrerCreditApplied ? new Date().toISOString() : null,
            referred_credit_cents: REFERRAL_CREDIT_CENTS,
            referred_credit_applied_at: referredCreditApplied ? new Date().toISOString() : null,
          })
          .eq('id', referral.id);

        // Log referral conversion for referrer
        await logPlatformBillingActivity(supabase, {
          coach_id: referral.referrer_coach_id,
          event_type: 'referral_converted',
          description: `Referral converted - $${(REFERRAL_CREDIT_CENTS / 100).toFixed(2)} credit earned`,
          amount_cents: REFERRAL_CREDIT_CENTS,
          stripe_event_id: event.id,
          metadata: { referred_coach_id: coachId },
        });

        // Log credit earned for referred coach
        await logPlatformBillingActivity(supabase, {
          coach_id: coachId,
          event_type: 'referral_credit_received',
          description: `Referral bonus - $${(REFERRAL_CREDIT_CENTS / 100).toFixed(2)} credit received`,
          amount_cents: REFERRAL_CREDIT_CENTS,
          stripe_event_id: event.id,
          metadata: { referrer_coach_id: referral.referrer_coach_id },
        });
      }
    } catch (referralError: any) {
      // Don't fail the webhook if referral credit fails
      logger.warn({ err: referralError.message, coachId }, 'Failed to process referral credits');
    }
  }

  logger.info({ coachId, amount: invoice.amount_paid }, 'Platform invoice paid');
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
