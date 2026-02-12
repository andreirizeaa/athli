import { Request, Response } from 'express';
import { success, unauthorized, internalError, badRequest, notFound, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { getStripeClient } from '../../../services/stripe.service';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import {
  syncPackageToStripe,
  updatePackageInStripe,
  archivePackageInStripe,
  togglePackageInStripe,
  syncCouponToStripe,
  updateCouponInStripe,
  deleteCouponInStripe,
  backfillStripeForCoach,
  syncProductsFromStripe,
} from '../../../services/stripe-sync.service';
import Stripe from 'stripe';
import { sequenceExecutor } from '../../../services/sequence-executor.service';

export const paymentsController = {
  // ─── Connect ────────────────────────────────────────────

  getStatus: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('coach_stripe_accounts')
        .select('*')
        .eq('coach_id', userId)
        .maybeSingle();

      if (error) {
        return internalError(res, { message: 'Failed to fetch Stripe account status' });
      }

      // If account exists but onboarding isn't complete, sync from Stripe directly
      if (data?.stripe_account_id && !data.onboarding_complete) {
        try {
          const stripe = getStripeClient();
          const account = await stripe.accounts.retrieve(data.stripe_account_id);

          const updates = {
            charges_enabled: account.charges_enabled ?? false,
            payouts_enabled: account.payouts_enabled ?? false,
            details_submitted: account.details_submitted ?? false,
            onboarding_complete: (account.charges_enabled && account.details_submitted) ?? false,
            default_currency: account.default_currency || null,
            country: account.country || null,
          };

          await supabase
            .from('coach_stripe_accounts')
            .update(updates)
            .eq('coach_id', userId);

          // If charges just became enabled, backfill packages to Stripe
          if (!data.charges_enabled && updates.charges_enabled) {
            backfillStripeForCoach(userId).catch((err: any) => {
              logger.error({ err: err.message, coachId: userId }, 'Backfill failed after status sync');
            });
          }

          return success(res, {
            message: 'Stripe account status retrieved',
            data: { stripeAccount: { ...data, ...updates } },
          });
        } catch (stripeErr: any) {
          logger.warn({ err: stripeErr.message }, 'Failed to sync Stripe account status');
        }
      }

      success(res, {
        message: 'Stripe account status retrieved',
        data: { stripeAccount: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  onboard: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();
    const stripe = getStripeClient();
    const webAppUrl = env.WEB_APP_URL;

    try {
      const { data: existing } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id, account_type')
        .eq('coach_id', userId)
        .maybeSingle();

      let stripeAccountId: string;

      if (existing?.stripe_account_id) {
        stripeAccountId = existing.stripe_account_id;
      } else {
        // Create a Standard account — coach will log in to their own Stripe
        const account = await stripe.accounts.create({ type: 'standard' });
        stripeAccountId = account.id;

        await supabase
          .from('coach_stripe_accounts')
          .insert({
            coach_id: userId,
            stripe_account_id: stripeAccountId,
            account_type: 'standard',
          });
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        type: 'account_onboarding',
        return_url: `${webAppUrl}/business/packages?stripe_onboarding=complete`,
        refresh_url: `${webAppUrl}/business/packages?stripe_onboarding=refresh`,
      });

      success(res, {
        message: 'Stripe onboarding link created',
        data: { url: accountLink.url },
      });
    } catch (error: any) {
      logger.error({ err: error.message, stack: error.stack }, 'Failed to create Stripe onboarding link');
      return internalError(res, { message: 'Failed to create Stripe onboarding link' });
    }
  },

  dashboardLink: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();
    const stripe = getStripeClient();

    try {
      const { data: account } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id, account_type')
        .eq('coach_id', userId)
        .maybeSingle();

      if (!account?.stripe_account_id) {
        return notFound(res, { message: 'No Stripe account connected' });
      }

      // Standard accounts use the regular Stripe dashboard
      if (account.account_type === 'standard') {
        return success(res, {
          message: 'Stripe dashboard link created',
          data: { url: 'https://dashboard.stripe.com' },
        });
      }

      // Express accounts use a login link
      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);

      success(res, {
        message: 'Stripe dashboard link created',
        data: { url: loginLink.url },
      });
    } catch (error: any) {
      return internalError(res, { message: 'Failed to create Stripe dashboard link' });
    }
  },

  disconnect: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data: account } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id')
        .eq('coach_id', userId)
        .maybeSingle();

      if (!account) {
        return notFound(res, { message: 'No Stripe account connected' });
      }

      // Clear Stripe IDs on local packages so they get re-synced to the next account
      await supabase
        .from('coach_packages')
        .update({ stripe_product_id: null, stripe_price_id: null })
        .eq('coach_id', userId);

      // Clear Stripe IDs on local coupons so they get re-synced to the next account
      await supabase
        .from('coach_coupons')
        .update({ stripe_coupon_id: null, stripe_promo_code_id: null })
        .eq('coach_id', userId);

      const { error } = await supabase
        .from('coach_stripe_accounts')
        .delete()
        .eq('coach_id', userId);

      if (error) {
        return internalError(res, { message: 'Failed to disconnect Stripe account' });
      }

      success(res, { message: 'Stripe account disconnected' });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to disconnect Stripe account');
      return internalError(res, { message: 'Failed to disconnect Stripe account' });
    }
  },

  // ─── Summary Dashboard ─────────────────────────────────

  getSummaryAnalytics: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      // Get coach's default currency
      const { data: stripeAccount } = await supabase
        .from('coach_stripe_accounts')
        .select('default_currency')
        .eq('coach_id', userId)
        .maybeSingle();

      const currency = stripeAccount?.default_currency || 'usd';

      // All-time gross revenue
      const { data: grossData } = await supabase
        .from('payments')
        .select('amount_cents')
        .eq('coach_id', userId)
        .eq('status', 'succeeded');

      const gross_revenue_cents = (grossData || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);

      // This month revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: thisMonthData } = await supabase
        .from('payments')
        .select('amount_cents')
        .eq('coach_id', userId)
        .eq('status', 'succeeded')
        .gte('paid_at', startOfMonth);

      const this_month_revenue_cents = (thisMonthData || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);

      // Last month revenue
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = startOfMonth;

      const { data: lastMonthData } = await supabase
        .from('payments')
        .select('amount_cents')
        .eq('coach_id', userId)
        .eq('status', 'succeeded')
        .gte('paid_at', startOfLastMonth)
        .lt('paid_at', endOfLastMonth);

      const last_month_revenue_cents = (lastMonthData || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);

      // Active subscriptions count (includes both active and trialing)
      const { count: active_subscriptions_count } = await supabase
        .from('client_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', userId)
        .in('status', ['active', 'trialing']);

      // Paying clients count (distinct client_id from succeeded payments)
      const { data: payingClients } = await supabase
        .from('payments')
        .select('client_id')
        .eq('coach_id', userId)
        .eq('status', 'succeeded');

      const paying_clients_count = new Set((payingClients || []).map(p => p.client_id)).size;

      success(res, {
        message: 'Summary analytics retrieved',
        data: {
          analytics: {
            gross_revenue_cents,
            this_month_revenue_cents,
            last_month_revenue_cents,
            active_subscriptions_count: active_subscriptions_count || 0,
            paying_clients_count,
            currency,
          },
        },
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to fetch summary analytics');
      return internalError(res, { message: 'Failed to fetch summary analytics' });
    }
  },

  getSummaryActivity: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      // Fetch billing activity
      const { data: activities, error: activitiesError } = await supabase
        .from('billing_activity')
        .select('*')
        .eq('coach_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (activitiesError) {
        return internalError(res, { message: 'Failed to fetch billing activity' });
      }

      // Extract unique client and package IDs
      const clientIds = [...new Set((activities || []).map(a => a.client_id).filter(Boolean))];
      const packageIds = [...new Set((activities || []).map(a => a.package_id).filter(Boolean))];

      // Batch fetch client profiles
      const clientMap: Record<string, { name: string | null; email: string | null; avatar_url: string | null }> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('user_profiles')
          .select('id, name, email, profile_picture_url')
          .in('id', clientIds);

        for (const c of clients || []) {
          clientMap[c.id] = { name: c.name, email: c.email, avatar_url: c.profile_picture_url };
        }
      }

      // Batch fetch packages
      const packageMap: Record<string, string> = {};
      if (packageIds.length > 0) {
        const { data: packages } = await supabase
          .from('coach_packages')
          .select('id, name')
          .in('id', packageIds);

        for (const p of packages || []) {
          packageMap[p.id] = p.name;
        }
      }

      const rows = (activities || []).map((a: any) => ({
        id: a.id,
        client_id: a.client_id,
        client_name: clientMap[a.client_id]?.name || null,
        client_email: clientMap[a.client_id]?.email || null,
        client_avatar_url: clientMap[a.client_id]?.avatar_url || null,
        package_id: a.package_id,
        package_name: packageMap[a.package_id] || null,
        event_type: a.event_type,
        description: a.description,
        amount_cents: a.amount_cents || 0,
        currency: a.currency || 'usd',
        metadata: a.metadata || {},
        created_at: a.created_at,
      }));

      success(res, {
        message: 'Billing activity retrieved',
        data: { activity: rows },
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to fetch billing activity');
      return internalError(res, { message: 'Failed to fetch billing activity' });
    }
  },

  // ─── Package Stats ─────────────────────────────────────

  getAllPackageStats: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      // Get all payments for this coach that have a package_id
      const { data: payments } = await supabase
        .from('payments')
        .select('package_id, status, amount_cents')
        .eq('coach_id', userId)
        .not('package_id', 'is', null);

      // Get cancelled subscriptions for this coach
      const { data: subscriptions } = await supabase
        .from('client_subscriptions')
        .select('package_id, status')
        .eq('coach_id', userId)
        .eq('status', 'cancelled')
        .not('package_id', 'is', null);

      // Get currency from packages
      const { data: packages } = await supabase
        .from('coach_packages')
        .select('id, currency')
        .eq('coach_id', userId);

      const currencyMap: Record<string, string> = {};
      for (const pkg of packages || []) {
        currencyMap[pkg.id] = pkg.currency;
      }

      // Aggregate per package
      const statsMap: Record<string, { total_purchases: number; total_refunds: number; total_cancellations: number; total_revenue_cents: number; currency: string }> = {};

      for (const p of payments || []) {
        const pid = p.package_id!;
        if (!statsMap[pid]) {
          statsMap[pid] = { total_purchases: 0, total_refunds: 0, total_cancellations: 0, total_revenue_cents: 0, currency: currencyMap[pid] || 'usd' };
        }
        if (p.status === 'succeeded') {
          statsMap[pid].total_purchases++;
          statsMap[pid].total_revenue_cents += p.amount_cents || 0;
        } else if (p.status === 'refunded') {
          statsMap[pid].total_refunds++;
        }
      }

      // Count cancellations from subscriptions
      for (const sub of subscriptions || []) {
        const pid = sub.package_id!;
        if (!statsMap[pid]) {
          statsMap[pid] = { total_purchases: 0, total_refunds: 0, total_cancellations: 0, total_revenue_cents: 0, currency: currencyMap[pid] || 'usd' };
        }
        statsMap[pid].total_cancellations++;
      }

      success(res, {
        message: 'Package stats retrieved',
        data: { stats: statsMap },
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to fetch package stats');
      return internalError(res, { message: 'Failed to fetch package stats' });
    }
  },

  // Get coupon redemptions for a specific package
  getPackageCouponRedemptions: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { packageId } = req.params;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      // Verify package belongs to coach
      const { data: pkg } = await supabase
        .from('coach_packages')
        .select('id')
        .eq('id', packageId)
        .eq('coach_id', userId)
        .single();

      if (!pkg) {
        return notFound(res, { message: 'Package not found' });
      }

      // Get all payments for this package that have a coupon_id
      const { data: payments } = await supabase
        .from('payments')
        .select('coupon_id')
        .eq('coach_id', userId)
        .eq('package_id', packageId)
        .eq('status', 'succeeded')
        .not('coupon_id', 'is', null);

      // Count redemptions per coupon
      const couponCounts: Record<string, number> = {};
      for (const p of payments || []) {
        const cid = p.coupon_id!;
        couponCounts[cid] = (couponCounts[cid] || 0) + 1;
      }

      // Get coupon details
      const couponIds = Object.keys(couponCounts);
      if (couponIds.length === 0) {
        return success(res, {
          message: 'Package coupon redemptions retrieved',
          data: { redemptions: [] },
        });
      }

      const { data: coupons } = await supabase
        .from('coach_coupons')
        .select('id, name, code, discount_type, discount_value, currency')
        .in('id', couponIds);

      const redemptions = (coupons || []).map((c: any) => ({
        coupon_id: c.id,
        coupon_name: c.name,
        coupon_code: c.code,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        currency: c.currency,
        redemption_count: couponCounts[c.id] || 0,
      }));

      // Sort by redemption count descending
      redemptions.sort((a: any, b: any) => b.redemption_count - a.redemption_count);

      success(res, {
        message: 'Package coupon redemptions retrieved',
        data: { redemptions },
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to fetch package coupon redemptions');
      return internalError(res, { message: 'Failed to fetch package coupon redemptions' });
    }
  },

  // ─── Packages ───────────────────────────────────────────

  getPackages: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data: packages, error } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('coach_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        return internalError(res, { message: 'Failed to fetch packages' });
      }

      success(res, {
        message: 'Packages retrieved',
        data: { packages: packages || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  syncPackages: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const result = await syncProductsFromStripe(userId);

      const { data: packages } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('coach_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      success(res, {
        message: `Synced ${result.synced} packages from Stripe`,
        data: { packages: packages || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'Failed to sync packages from Stripe' });
    }
  },

  // ─── Package Assignments ────────────────────────────────

  assignPackage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { packageId } = req.params;
    const { clientIds } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return badRequest(res, { message: 'clientIds is required and must be a non-empty array' });
    }

    const supabase = getSupabaseClient();

    try {
      // Verify package belongs to this coach
      const { data: pkg } = await supabase
        .from('coach_packages')
        .select('id, coach_id')
        .eq('id', packageId)
        .eq('coach_id', userId)
        .maybeSingle();

      if (!pkg) {
        return notFound(res, { message: 'Package not found' });
      }

      // Verify all clients are assigned to this coach
      const { data: assignments } = await supabase
        .from('coach_client_assignments')
        .select('client_id')
        .eq('coach_id', userId)
        .eq('status', 'accepted')
        .in('client_id', clientIds);

      const validClientIds = (assignments || []).map(a => a.client_id);
      if (validClientIds.length === 0) {
        return badRequest(res, { message: 'No valid clients found' });
      }

      const rows = validClientIds.map(clientId => ({
        coach_id: userId,
        client_id: clientId,
        package_id: packageId,
      }));

      const { error } = await supabase
        .from('client_package_assignments')
        .upsert(rows, {
          onConflict: 'coach_id,client_id,package_id',
          ignoreDuplicates: true,
        });

      if (error) {
        // If upsert fails due to no unique constraint, fall back to insert with conflict handling
        for (const row of rows) {
          await supabase
            .from('client_package_assignments')
            .insert(row)
            .select();
        }
      }

      success(res, {
        message: `Package assigned to ${validClientIds.length} client(s)`,
        data: { assignedClientIds: validClientIds },
      });
    } catch (error: any) {
      return internalError(res, { message: 'Failed to assign package' });
    }
  },

  unassignPackage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { packageId, clientId } = req.params;
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase
        .from('client_package_assignments')
        .update({ is_active: false })
        .eq('coach_id', userId)
        .eq('package_id', packageId)
        .eq('client_id', clientId);

      if (error) {
        return internalError(res, { message: 'Failed to unassign package' });
      }

      success(res, { message: 'Package unassigned' });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  getPackageAssignments: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { packageId } = req.params;
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('client_package_assignments')
        .select('*, client:user_profiles!client_package_assignments_client_id_fkey(id, name, email, profile_picture_url)')
        .eq('coach_id', userId)
        .eq('package_id', packageId)
        .eq('is_active', true);

      if (error) {
        // Fallback without join if FK name doesn't match
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('client_package_assignments')
          .select('*')
          .eq('coach_id', userId)
          .eq('package_id', packageId)
          .eq('is_active', true);

        if (fallbackError) {
          return internalError(res, { message: 'Failed to fetch assignments' });
        }

        return success(res, {
          message: 'Assignments retrieved',
          data: { assignments: fallbackData || [] },
        });
      }

      success(res, {
        message: 'Assignments retrieved',
        data: { assignments: data || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  getClientAssignments: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { clientId } = req.params;
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('client_package_assignments')
        .select('*, package:coach_packages(*)')
        .eq('coach_id', userId)
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (error) {
        return internalError(res, { message: 'Failed to fetch client assignments' });
      }

      success(res, {
        message: 'Client assignments retrieved',
        data: { assignments: data || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // ─── Client Self-Service ────────────────────────────────

  // Get packages for the authenticated client (self-service)
  getMyPackages: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    logger.info({ userId }, '[getMyPackages] Fetching packages for client');

    const supabase = getSupabaseClient();

    try {
      // Fetch package assignments with package details and subscription info
      const { data: assignments, error: assignmentsError } = await supabase
        .from('client_package_assignments')
        .select(`
          id,
          coach_id,
          package_id,
          assigned_at,
          is_active,
          package:coach_packages(
            id,
            name,
            description,
            amount_cents,
            currency,
            interval,
            interval_count,
            image_url,
            features
          )
        `)
        .eq('client_id', userId)
        .eq('is_active', true);

      logger.info({ userId, assignmentsCount: assignments?.length || 0, error: assignmentsError?.message }, '[getMyPackages] Query result');

      if (assignmentsError) {
        logger.error({ err: assignmentsError.message }, 'Failed to fetch client packages');
        return internalError(res, { message: 'Failed to fetch packages' });
      }

      // Fetch subscriptions for this client
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('client_subscriptions')
        .select('*')
        .eq('client_id', userId);

      if (subscriptionsError) {
        logger.warn({ err: subscriptionsError.message }, 'Failed to fetch subscriptions');
      }

      // Merge subscription info into assignments
      const packagesWithSubscriptions = (assignments || []).map((assignment: any) => {
        const subscription = (subscriptions || []).find(
          (s: any) => s.package_id === assignment.package_id && s.coach_id === assignment.coach_id
        );
        return {
          ...assignment,
          subscription: subscription || null,
        };
      });

      success(res, {
        message: 'Packages retrieved',
        data: { packages: packagesWithSubscriptions },
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error fetching client packages');
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // Create Stripe Customer Portal session for a client
  createBillingPortalSession: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { subscriptionId } = req.body;
    if (!subscriptionId) {
      return badRequest(res, { message: 'subscriptionId is required' });
    }

    const supabase = getSupabaseClient();
    const stripe = getStripeClient();

    try {
      // Get the subscription to find stripe_customer_id and coach's stripe account
      const { data: subscription, error: subError } = await supabase
        .from('client_subscriptions')
        .select('stripe_customer_id, coach_id')
        .eq('id', subscriptionId)
        .eq('client_id', userId)
        .single();

      if (subError || !subscription) {
        return notFound(res, { message: 'Subscription not found' });
      }

      // Get the coach's Stripe connected account
      const { data: stripeAccount, error: accountError } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id')
        .eq('coach_id', subscription.coach_id)
        .single();

      if (accountError || !stripeAccount?.stripe_account_id) {
        return badRequest(res, { message: 'Coach Stripe account not found' });
      }

      // Get the web app URL for return
      const webAppUrl = env.WEB_APP_URL;

      // Create billing portal session on the connected account
      const session = await stripe.billingPortal.sessions.create(
        {
          customer: subscription.stripe_customer_id,
          return_url: webAppUrl,
        },
        { stripeAccount: stripeAccount.stripe_account_id }
      );

      logger.info({ userId, subscriptionId }, 'Billing portal session created');

      success(res, {
        message: 'Billing portal session created',
        data: { url: session.url },
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to create billing portal session');
      return internalError(res, { message: 'Failed to create billing portal session' });
    }
  },

  // ─── Package CRUD ──────────────────────────────────────

  createPackage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { name, description, amount_cents, currency, interval, interval_count, features, free_trial_days, onboarding_id, sequence_id, image_url } = req.body;

    if (!name || amount_cents == null || !currency || !interval) {
      return badRequest(res, { message: 'name, amount_cents, currency, and interval are required' });
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('coach_packages')
        .insert({
          coach_id: userId,
          name,
          description: description || null,
          amount_cents,
          currency: currency || 'usd',
          interval,
          interval_count: interval_count || 1,
          is_active: true,
          is_visible: true,
          features: features || [],
          free_trial_days: free_trial_days || 0,
          onboarding_id: onboarding_id || null,
          sequence_id: sequence_id || null,
          image_url: image_url || null,
        })
        .select()
        .single();

      if (error) {
        logger.error({ err: error.message, code: error.code }, 'Failed to create package');
        return internalError(res, { message: 'Failed to create package' });
      }

      // Sync to Stripe (best-effort)
      const stripeIds = await syncPackageToStripe(data);
      if (stripeIds) {
        const { data: updated } = await supabase
          .from('coach_packages')
          .update({ stripe_product_id: stripeIds.stripe_product_id, stripe_price_id: stripeIds.stripe_price_id })
          .eq('id', data.id)
          .select()
          .single();

        return success(res, {
          message: 'Package created',
          data: { package: updated || data },
        });
      }

      success(res, {
        message: 'Package created',
        data: { package: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  updatePackage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { packageId } = req.params;
    const updates = req.body;
    const supabase = getSupabaseClient();

    try {
      // If trying to activate, verify Stripe is connected
      if (updates.is_active === true) {
        const { data: stripeAccount } = await supabase
          .from('coach_stripe_accounts')
          .select('onboarding_complete, charges_enabled')
          .eq('coach_id', userId)
          .maybeSingle();

        if (!stripeAccount?.onboarding_complete || !stripeAccount?.charges_enabled) {
          return badRequest(res, { message: 'Connect Stripe before activating packages' });
        }
      }

      // Fetch current state before update (for Stripe sync)
      const { data: oldPkg } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('id', packageId)
        .eq('coach_id', userId)
        .maybeSingle();

      const { data, error } = await supabase
        .from('coach_packages')
        .update(updates)
        .eq('id', packageId)
        .eq('coach_id', userId)
        .select()
        .single();

      if (error) {
        logger.error({ err: error.message, code: error.code, packageId, updates }, 'Failed to update package');
        return internalError(res, { message: 'Failed to update package' });
      }

      if (!data) {
        return notFound(res, { message: 'Package not found' });
      }

      // Sync to Stripe (best-effort)
      if (oldPkg?.stripe_product_id && oldPkg?.stripe_price_id) {
        const newPriceResult = await updatePackageInStripe(oldPkg, data);
        if (newPriceResult?.stripe_price_id) {
          const { data: updated } = await supabase
            .from('coach_packages')
            .update({ stripe_price_id: newPriceResult.stripe_price_id })
            .eq('id', data.id)
            .select()
            .single();

          return success(res, {
            message: 'Package updated',
            data: { package: updated || data },
          });
        }
      }

      success(res, {
        message: 'Package updated',
        data: { package: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  deletePackage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { packageId } = req.params;
    const supabase = getSupabaseClient();

    try {
      // Fetch current package (for Stripe sync)
      const { data: pkg } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('id', packageId)
        .eq('coach_id', userId)
        .maybeSingle();

      if (!pkg) {
        return notFound(res, { message: 'Package not found' });
      }

      // Archive in Stripe (best-effort)
      if (pkg.stripe_product_id) {
        await archivePackageInStripe(userId, pkg.stripe_product_id);
      }

      // Check if there are active assignments
      const { data: assignments } = await supabase
        .from('client_package_assignments')
        .select('id')
        .eq('package_id', packageId)
        .eq('is_active', true)
        .limit(1);

      if (assignments && assignments.length > 0) {
        // Soft deactivate instead
        await supabase
          .from('coach_packages')
          .update({ is_active: false })
          .eq('id', packageId)
          .eq('coach_id', userId);

        return success(res, { message: 'Package deactivated (has active assignments)' });
      }

      const { error } = await supabase
        .from('coach_packages')
        .delete()
        .eq('id', packageId)
        .eq('coach_id', userId);

      if (error) {
        return internalError(res, { message: 'Failed to delete package' });
      }

      success(res, { message: 'Package deleted' });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  togglePackage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { packageId } = req.params;
    const { field, value } = req.body;

    if (!field || !['is_active', 'is_visible'].includes(field)) {
      return badRequest(res, { message: 'field must be is_active or is_visible' });
    }

    const supabase = getSupabaseClient();

    try {
      // If activating, verify Stripe is connected
      if (field === 'is_active' && value === true) {
        const { data: stripeAccount } = await supabase
          .from('coach_stripe_accounts')
          .select('onboarding_complete, charges_enabled')
          .eq('coach_id', userId)
          .maybeSingle();

        if (!stripeAccount?.onboarding_complete || !stripeAccount?.charges_enabled) {
          return badRequest(res, { message: 'Connect Stripe before activating packages' });
        }
      }

      const { data, error } = await supabase
        .from('coach_packages')
        .update({ [field]: value })
        .eq('id', packageId)
        .eq('coach_id', userId)
        .select()
        .single();

      if (error) {
        return internalError(res, { message: 'Failed to toggle package' });
      }

      // Stripe sync for is_active toggle (best-effort)
      if (field === 'is_active' && data) {
        if (value === true && !data.stripe_product_id) {
          // Lazy creation — package was created before Stripe was connected
          const stripeIds = await syncPackageToStripe(data);
          if (stripeIds) {
            const { data: updated } = await supabase
              .from('coach_packages')
              .update({ stripe_product_id: stripeIds.stripe_product_id, stripe_price_id: stripeIds.stripe_price_id })
              .eq('id', data.id)
              .select()
              .single();

            return success(res, {
              message: 'Package updated',
              data: { package: updated || data },
            });
          }
        } else if (data.stripe_product_id) {
          await togglePackageInStripe(userId, data.stripe_product_id, value);
        }
      }

      success(res, {
        message: 'Package updated',
        data: { package: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // ─── Coupons ────────────────────────────────────────────

  getCoupons: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('coach_coupons')
        .select('*')
        .eq('coach_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return internalError(res, { message: 'Failed to fetch coupons' });
      }

      success(res, {
        message: 'Coupons retrieved',
        data: { coupons: data || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  createCoupon: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { name, code, discount_type, discount_value, currency, duration_months, max_redemptions, expires_at } = req.body;

    if (!name || !code || !discount_type || discount_value == null) {
      return badRequest(res, { message: 'name, code, discount_type, and discount_value are required' });
    }

    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalizedCode) {
      return badRequest(res, { message: 'Code must contain alphanumeric characters' });
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('coach_coupons')
        .insert({
          coach_id: userId,
          name,
          code: normalizedCode,
          discount_type,
          discount_value,
          currency: currency || 'usd',
          duration_months: duration_months || null,
          max_redemptions: max_redemptions || null,
          expires_at: expires_at || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return badRequest(res, { message: 'A coupon with this code already exists' });
        }
        return internalError(res, { message: 'Failed to create coupon' });
      }

      // Sync to Stripe (best-effort)
      const stripeIds = await syncCouponToStripe(data);
      if (stripeIds) {
        const { data: updated } = await supabase
          .from('coach_coupons')
          .update({ stripe_coupon_id: stripeIds.stripe_coupon_id, stripe_promo_code_id: stripeIds.stripe_promo_code_id })
          .eq('id', data.id)
          .select()
          .single();

        return success(res, {
          message: 'Coupon created',
          data: { coupon: updated || data },
        });
      }

      success(res, {
        message: 'Coupon created',
        data: { coupon: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  updateCoupon: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { couponId } = req.params;
    const updates = req.body;
    const supabase = getSupabaseClient();

    try {
      // Normalize code if being updated
      if (updates.code) {
        updates.code = updates.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      }

      // Fetch current state before update (for Stripe sync)
      const { data: oldCoupon } = await supabase
        .from('coach_coupons')
        .select('*')
        .eq('id', couponId)
        .eq('coach_id', userId)
        .maybeSingle();

      const { data, error } = await supabase
        .from('coach_coupons')
        .update(updates)
        .eq('id', couponId)
        .eq('coach_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return badRequest(res, { message: 'A coupon with this code already exists' });
        }
        return internalError(res, { message: 'Failed to update coupon' });
      }

      if (!data) {
        return notFound(res, { message: 'Coupon not found' });
      }

      // Sync to Stripe (best-effort)
      if (oldCoupon?.stripe_coupon_id && oldCoupon?.stripe_promo_code_id) {
        const newIds = await updateCouponInStripe(oldCoupon, data);
        if (newIds) {
          const { data: updated } = await supabase
            .from('coach_coupons')
            .update({ stripe_coupon_id: newIds.stripe_coupon_id, stripe_promo_code_id: newIds.stripe_promo_code_id })
            .eq('id', data.id)
            .select()
            .single();

          return success(res, {
            message: 'Coupon updated',
            data: { coupon: updated || data },
          });
        }
      }

      success(res, {
        message: 'Coupon updated',
        data: { coupon: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  deleteCoupon: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { couponId } = req.params;
    const supabase = getSupabaseClient();

    try {
      // Fetch current coupon (for Stripe sync)
      const { data: coupon } = await supabase
        .from('coach_coupons')
        .select('*')
        .eq('id', couponId)
        .eq('coach_id', userId)
        .maybeSingle();

      if (!coupon) {
        return notFound(res, { message: 'Coupon not found' });
      }

      // Delete from Stripe (best-effort)
      if (coupon.stripe_coupon_id) {
        await deleteCouponInStripe(userId, coupon.stripe_coupon_id);
      }

      const { error } = await supabase
        .from('coach_coupons')
        .delete()
        .eq('id', couponId)
        .eq('coach_id', userId);

      if (error) {
        return internalError(res, { message: 'Failed to delete coupon' });
      }

      success(res, { message: 'Coupon deleted' });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // ─── Coach Onboardings (for package creation) ─────────

  getOnboardings: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('coach_onboardings')
        .select('id, name')
        .eq('coach_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        return internalError(res, { message: 'Failed to fetch onboardings' });
      }

      success(res, {
        message: 'Onboardings retrieved',
        data: { onboardings: data || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // ─── Coach Sequences (for package creation) ──────────

  getSequences: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('coach_sequences')
        .select('id, name')
        .eq('coach_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        return internalError(res, { message: 'Failed to fetch sequences' });
      }

      success(res, {
        message: 'Sequences retrieved',
        data: { sequences: data || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // ─── Stripe Backfill ────────────────────────────────────

  backfillStripe: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    try {
      const result = await backfillStripeForCoach(userId);

      success(res, {
        message: 'Stripe sync completed',
        data: { result },
      });
    } catch (error: any) {
      return internalError(res, { message: 'Failed to sync to Stripe' });
    }
  },

  // ─── Client Checkout ──────────────────────────────────

  createCheckoutSession: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { packageId, coachCode, email: providedEmail } = req.body;

    if (!packageId || !coachCode) {
      return badRequest(res, { message: 'packageId and coachCode are required' });
    }

    const supabase = getSupabaseClient();
    const stripe = getStripeClient();
    const webAppUrl = env.WEB_APP_URL;

    try {
      // Look up coach by code
      let coachId: string | null = null;

      const { data: codeRow } = await supabase
        .from('coach_unique_codes')
        .select('coach_id, onboarding_id')
        .eq('code', coachCode)
        .maybeSingle();

      if (codeRow) {
        coachId = codeRow.coach_id;
      } else {
        // Fallback: try coach_profiles_full view
        const { data: profileMatch } = await supabase
          .from('coach_profiles_full')
          .select('id')
          .eq('unique_code', coachCode.toUpperCase())
          .maybeSingle();

        if (profileMatch) {
          coachId = profileMatch.id;
        }
      }

      if (!coachId) {
        return notFound(res, { message: 'Coach not found' });
      }

      // Get coach's Stripe account
      const { data: stripeAccount } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id, onboarding_complete, charges_enabled')
        .eq('coach_id', coachId)
        .maybeSingle();

      if (!stripeAccount?.stripe_account_id || !stripeAccount.charges_enabled) {
        return badRequest(res, { message: 'Coach has not set up payments' });
      }

      // Get the package
      const { data: pkg } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('id', packageId)
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .maybeSingle();

      if (!pkg) {
        return notFound(res, { message: 'Package not found or not available' });
      }

      if (!pkg.stripe_price_id) {
        return badRequest(res, { message: 'Package not synced to Stripe' });
      }

      // Check if user already has an active assignment for this package
      const { data: existingAssignment } = await supabase
        .from('client_package_assignments')
        .select('id, is_active')
        .eq('coach_id', coachId)
        .eq('client_id', userId)
        .eq('package_id', packageId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingAssignment) {
        return badRequest(res, { message: 'You already have access to this package' });
      }

      // Get client email
      const { data: clientProfile } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();

      // Build line items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price: pkg.stripe_price_id,
          quantity: 1,
        },
      ];

      // Determine checkout mode
      const mode: Stripe.Checkout.SessionCreateParams.Mode =
        pkg.interval === 'one_time' ? 'payment' : 'subscription';

      // Build session params
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode,
        line_items: lineItems,
        success_url: `${webAppUrl}/auth/checkout/${coachCode}/${packageId}/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${webAppUrl}/auth/checkout/${coachCode}/${packageId}`,
        customer_email: clientProfile?.email || providedEmail,
        metadata: {
          coach_id: coachId,
          client_id: userId,
          package_id: packageId,
          coach_code: coachCode,
          onboarding_id: codeRow?.onboarding_id || '',
        },
        allow_promotion_codes: true,
      };

      // Add free trial if applicable (only for subscriptions)
      if (mode === 'subscription' && (pkg.free_trial_days ?? 0) > 0) {
        sessionParams.subscription_data = {
          trial_period_days: pkg.free_trial_days,
          metadata: {
            coach_id: coachId,
            client_id: userId,
            package_id: packageId,
          },
        };
      }

      // Create checkout session on the connected account
      const session = await stripe.checkout.sessions.create(
        sessionParams,
        { stripeAccount: stripeAccount.stripe_account_id }
      );

      // Create a pending payment record
      await supabase
        .from('payments')
        .insert({
          coach_id: coachId,
          client_id: userId,
          package_id: packageId,
          stripe_checkout_session_id: session.id,
          amount_cents: pkg.amount_cents,
          currency: pkg.currency,
          status: 'pending',
        });

      success(res, {
        message: 'Checkout session created',
        data: { url: session.url },
      });
    } catch (error: any) {
      logger.error({ err: error.message, stack: error.stack }, 'Failed to create checkout session');
      return internalError(res, { message: 'Failed to create checkout session' });
    }
  },

  // ─── Public Packages ──────────────────────────────────

  getPublicPackages: async (req: Request, res: Response) => {
    const { coachCode } = req.params;
    const supabase = getSupabaseClient();

    try {
      // Look up coach by unique code
      let coachId: string | null = null;

      const { data: codeRow } = await supabase
        .from('coach_unique_codes')
        .select('coach_id')
        .eq('code', coachCode)
        .maybeSingle();

      if (codeRow) {
        coachId = codeRow.coach_id;
      } else {
        // Fallback: try coach_profiles_full view by unique_code
        const { data: profileMatch } = await supabase
          .from('coach_profiles_full')
          .select('id')
          .eq('unique_code', coachCode.toUpperCase())
          .maybeSingle();

        if (profileMatch) {
          coachId = profileMatch.id;
        }
      }

      if (!coachId) {
        return notFound(res, { message: 'Coach not found' });
      }

      // Check if coach has Stripe connected
      const { data: stripeAccount } = await supabase
        .from('coach_stripe_accounts')
        .select('onboarding_complete, charges_enabled')
        .eq('coach_id', coachId)
        .maybeSingle();

      const stripeEnabled = !!(stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled);

      if (!stripeEnabled) {
        return success(res, {
          message: 'Coach does not have payments enabled',
          data: {
            stripe_enabled: false,
            packages: [],
            coach: null,
            company: null,
          },
        });
      }

      // Get visible packages (includes inactive ones so they can be shown as unavailable)
      const { data: packages } = await supabase
        .from('coach_packages')
        .select('id, name, description, amount_cents, currency, interval, interval_count, is_active, features, free_trial_days, image_url')
        .eq('coach_id', coachId)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      // Get coach profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, profile_picture_url')
        .eq('id', coachId)
        .eq('user_type', 'coach')
        .maybeSingle();

      // Get full company details
      const { data: company } = await supabase
        .from('coach_company_information')
        .select('company_name, website, linkedin, location, specialities, logo_url')
        .eq('coach_id', coachId)
        .maybeSingle();

      success(res, {
        message: 'Public packages retrieved',
        data: {
          stripe_enabled: true,
          packages: packages || [],
          coach: {
            name: company?.company_name || profile?.name || 'Coach',
            logo_url: company?.logo_url || profile?.profile_picture_url || null,
          },
          company: company ? {
            company_name: company.company_name,
            website: company.website,
            linkedin: company.linkedin,
            location: company.location,
            specialities: company.specialities,
            logo_url: company.logo_url,
          } : null,
        },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // ─── Public Checkout Session ────────────────────────────────────────────
  // This endpoint allows authenticated users to create checkout sessions
  // Security: Validates client exists, package is active, and checks for duplicates

  createPublicCheckoutSession: async (req: Request, res: Response) => {
    const { packageId, coachCode, clientId, email } = req.body;

    // Validate required fields
    if (!packageId || !coachCode) {
      return badRequest(res, { message: 'packageId and coachCode are required' });
    }

    // clientId is required - we need to know who is purchasing
    if (!clientId) {
      return badRequest(res, { message: 'clientId is required' });
    }

    // Basic input validation
    if (typeof packageId !== 'string' || packageId.length > 100) {
      return badRequest(res, { message: 'Invalid packageId' });
    }
    if (typeof coachCode !== 'string' || coachCode.length > 50) {
      return badRequest(res, { message: 'Invalid coachCode' });
    }
    if (typeof clientId !== 'string' || clientId.length > 100) {
      return badRequest(res, { message: 'Invalid clientId' });
    }
    if (email && (typeof email !== 'string' || email.length > 255)) {
      return badRequest(res, { message: 'Invalid email' });
    }

    const supabase = getSupabaseClient();
    const stripe = getStripeClient();
    const webAppUrl = env.WEB_APP_URL;

    try {
      // SECURITY: Verify the client exists in our database
      const { data: clientProfile } = await supabase
        .from('user_profiles')
        .select('id, email, name')
        .eq('id', clientId)
        .maybeSingle();

      if (!clientProfile) {
        logger.warn({ clientId }, 'Public checkout attempted with non-existent client ID');
        return badRequest(res, { message: 'Invalid client' });
      }

      // Look up coach by code
      let coachId: string | null = null;
      let codeRow: { coach_id: string; onboarding_id?: string } | null = null;

      const { data: codeData } = await supabase
        .from('coach_unique_codes')
        .select('coach_id, onboarding_id')
        .eq('code', coachCode)
        .maybeSingle();

      if (codeData) {
        coachId = codeData.coach_id;
        codeRow = codeData;
      } else {
        // Fallback: try coach_profiles_full view
        const { data: profileMatch } = await supabase
          .from('coach_profiles_full')
          .select('id')
          .eq('unique_code', coachCode.toUpperCase())
          .maybeSingle();

        if (profileMatch) {
          coachId = profileMatch.id;
        }
      }

      if (!coachId) {
        return notFound(res, { message: 'Coach not found' });
      }

      // Get coach's Stripe account
      const { data: stripeAccount } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id, onboarding_complete, charges_enabled')
        .eq('coach_id', coachId)
        .maybeSingle();

      if (!stripeAccount?.stripe_account_id || !stripeAccount.charges_enabled) {
        return badRequest(res, { message: 'Coach has not set up payments' });
      }

      // Get the package
      const { data: pkg } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('id', packageId)
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .maybeSingle();

      if (!pkg) {
        return notFound(res, { message: 'Package not found or not available' });
      }

      if (!pkg.stripe_price_id) {
        return badRequest(res, { message: 'Package not synced to Stripe' });
      }

      // Check if user already has an active assignment for this package
      const { data: existingAssignment } = await supabase
        .from('client_package_assignments')
        .select('id, is_active')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .eq('package_id', packageId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingAssignment) {
        return badRequest(res, { message: 'You already have access to this package' });
      }

      // Build line items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price: pkg.stripe_price_id,
          quantity: 1,
        },
      ];

      // Determine checkout mode
      const mode: Stripe.Checkout.SessionCreateParams.Mode =
        pkg.interval === 'one_time' ? 'payment' : 'subscription';

      // Use provided email or client's email from profile
      const customerEmail = email || clientProfile.email;

      // Build session params
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode,
        line_items: lineItems,
        success_url: `${webAppUrl}/auth/checkout/${coachCode}/${packageId}/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${webAppUrl}/auth/checkout/${coachCode}/${packageId}`,
        customer_email: customerEmail,
        metadata: {
          coach_id: coachId,
          client_id: clientId,
          package_id: packageId,
          coach_code: coachCode,
          onboarding_id: codeRow?.onboarding_id || '',
        },
        allow_promotion_codes: true,
      };

      // Add free trial if applicable (only for subscriptions)
      if (mode === 'subscription' && (pkg.free_trial_days ?? 0) > 0) {
        sessionParams.subscription_data = {
          trial_period_days: pkg.free_trial_days,
          metadata: {
            coach_id: coachId,
            client_id: clientId,
            package_id: packageId,
          },
        };
      }

      // Create checkout session on the connected account
      const session = await stripe.checkout.sessions.create(
        sessionParams,
        { stripeAccount: stripeAccount.stripe_account_id }
      );

      // Create a pending payment record
      await supabase
        .from('payments')
        .insert({
          coach_id: coachId,
          client_id: clientId,
          package_id: packageId,
          stripe_checkout_session_id: session.id,
          amount_cents: pkg.amount_cents,
          currency: pkg.currency,
          status: 'pending',
        });

      logger.info({ coachId, clientId, packageId }, 'Public checkout session created');

      success(res, {
        message: 'Checkout session created',
        data: { url: session.url },
      });
    } catch (error: any) {
      logger.error({ err: error.message, stack: error.stack }, 'Failed to create public checkout session');
      return internalError(res, { message: 'Failed to create checkout session' });
    }
  },

  // ─── Webhook ────────────────────────────────────────────

  webhook: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const secrets = [
      process.env.STRIPE_WEBHOOK_SECRET,
      process.env.STRIPE_WEBHOOK_SECRET_ACCOUNT,
    ].filter(Boolean) as string[];

    if (secrets.length === 0) {
      logger.error('No STRIPE_WEBHOOK_SECRET configured');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }

    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event | null = null;

    for (const secret of secrets) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, secret);
        break;
      } catch {
        // Try next secret
      }
    }

    if (!event) {
      logger.warn('Webhook signature verification failed with all secrets');
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
      // Already processed
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    try {
      await handleWebhookEvent(event, supabase, stripe);

      // Record event for idempotency
      await supabase
        .from('stripe_webhook_events')
        .insert({
          id: event.id,
          type: event.type,
          payload: event as any,
        });
    } catch (err: any) {
      logger.error({ err: err.message, eventType: event.type, eventId: event.id }, 'Webhook processing error');
      // Still return 200 to prevent Stripe retries for application errors
    }

    res.status(200).json({ received: true });
  },
};

// ─── Billing Activity Logging ────────────────────────────────

interface BillingActivityLog {
  coach_id: string;
  client_id?: string | null;
  package_id?: string | null;
  subscription_id?: string | null;
  event_type: string;
  description: string;
  amount_cents?: number | null;
  currency?: string;
  metadata?: Record<string, any>;
  stripe_event_id?: string | null;
}

async function logBillingActivity(supabase: any, activity: BillingActivityLog) {
  try {
    await supabase.from('billing_activity').insert({
      coach_id: activity.coach_id,
      client_id: activity.client_id || null,
      package_id: activity.package_id || null,
      subscription_id: activity.subscription_id || null,
      event_type: activity.event_type,
      description: activity.description,
      amount_cents: activity.amount_cents || null,
      currency: activity.currency || 'usd',
      metadata: activity.metadata || {},
      stripe_event_id: activity.stripe_event_id || null,
    });
  } catch (err: any) {
    logger.warn({ err: err.message, activity }, 'Failed to log billing activity');
  }
}

// Helper to get client name for activity descriptions
async function getClientName(supabase: any, clientId: string): Promise<string> {
  const { data } = await supabase
    .from('user_profiles')
    .select('name')
    .eq('id', clientId)
    .maybeSingle();
  return data?.name || 'A client';
}

// Helper to get package name for activity descriptions
async function getPackageName(supabase: any, packageId: string): Promise<string> {
  const { data } = await supabase
    .from('coach_packages')
    .select('name')
    .eq('id', packageId)
    .maybeSingle();
  return data?.name || 'a package';
}

// Helper to look up local coupon_id from Stripe coupon ID
async function getCouponIdFromStripe(supabase: any, coachId: string, stripeCouponId: string): Promise<string | null> {
  const { data } = await supabase
    .from('coach_coupons')
    .select('id')
    .eq('coach_id', coachId)
    .eq('stripe_coupon_id', stripeCouponId)
    .maybeSingle();
  return data?.id || null;
}

// Helper to update package stats (sales, revenue, cancellations, refunds)
interface PackageStatsUpdate {
  package_id: string;
  sales_count?: number;           // +1 for new sale
  active_subscriptions_count?: number;  // +1 for new, -1 for cancelled
  cancellations_count?: number;   // +1 for cancellation
  refunds_count?: number;         // +1 for refund
  revenue_cents?: number;         // +amount for payment, -amount for refund
}

async function updatePackageStats(supabase: any, update: PackageStatsUpdate) {
  if (!update.package_id) return;

  try {
    // Build the update query dynamically based on what changed
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (update.sales_count !== undefined) {
      updates.push(`sales_count = sales_count + $${paramIndex}`);
      params.push(update.sales_count);
      paramIndex++;
    }
    if (update.active_subscriptions_count !== undefined) {
      updates.push(`active_subscriptions_count = GREATEST(0, active_subscriptions_count + $${paramIndex})`);
      params.push(update.active_subscriptions_count);
      paramIndex++;
    }
    if (update.cancellations_count !== undefined) {
      updates.push(`cancellations_count = cancellations_count + $${paramIndex}`);
      params.push(update.cancellations_count);
      paramIndex++;
    }
    if (update.refunds_count !== undefined) {
      updates.push(`refunds_count = refunds_count + $${paramIndex}`);
      params.push(update.refunds_count);
      paramIndex++;
    }
    if (update.revenue_cents !== undefined) {
      updates.push(`total_revenue_cents = GREATEST(0, total_revenue_cents + $${paramIndex})`);
      params.push(update.revenue_cents);
      paramIndex++;
    }

    if (updates.length === 0) return;

    params.push(update.package_id);
    const query = `UPDATE coach_packages SET ${updates.join(', ')}, updated_at = now() WHERE id = $${paramIndex}`;

    await supabase.rpc('exec_sql', { query, params });
  } catch (err: any) {
    // Fallback to individual updates if RPC not available
    logger.warn({ err: err.message, update }, 'Failed to update package stats via RPC, trying direct update');

    try {
      // Get current stats
      const { data: pkg } = await supabase
        .from('coach_packages')
        .select('sales_count, active_subscriptions_count, cancellations_count, refunds_count, total_revenue_cents')
        .eq('id', update.package_id)
        .single();

      if (!pkg) return;

      const newStats: any = {};
      if (update.sales_count !== undefined) {
        newStats.sales_count = pkg.sales_count + update.sales_count;
      }
      if (update.active_subscriptions_count !== undefined) {
        newStats.active_subscriptions_count = Math.max(0, pkg.active_subscriptions_count + update.active_subscriptions_count);
      }
      if (update.cancellations_count !== undefined) {
        newStats.cancellations_count = pkg.cancellations_count + update.cancellations_count;
      }
      if (update.refunds_count !== undefined) {
        newStats.refunds_count = pkg.refunds_count + update.refunds_count;
      }
      if (update.revenue_cents !== undefined) {
        newStats.total_revenue_cents = Math.max(0, pkg.total_revenue_cents + update.revenue_cents);
      }

      if (Object.keys(newStats).length > 0) {
        await supabase
          .from('coach_packages')
          .update(newStats)
          .eq('id', update.package_id);
      }
    } catch (fallbackErr: any) {
      logger.error({ err: fallbackErr.message, update }, 'Failed to update package stats');
    }
  }
}

// ─── Webhook Event Handlers ────────────────────────────────

async function handleWebhookEvent(event: Stripe.Event, supabase: any, stripe: Stripe) {
  const eventType = event.type;

  switch (eventType) {
    case 'account.updated':
      await handleAccountUpdated(event, supabase);
      break;

    case 'checkout.session.completed':
      await handleCheckoutCompleted(event, supabase);
      break;

    case 'checkout.session.expired':
      await handleCheckoutExpired(event, supabase);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event, supabase);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event, supabase);
      break;

    case 'charge.dispute.created':
      await handleDisputeCreated(event, supabase);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event, supabase);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event, supabase);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event, supabase);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event, supabase);
      break;

    case 'product.created':
    case 'product.updated':
    case 'product.deleted':
    case 'price.created':
    case 'price.updated':
    case 'price.deleted':
      await handleProductOrPriceChange(event, supabase, stripe);
      break;

    case 'coupon.created':
    case 'coupon.updated':
    case 'coupon.deleted':
    case 'promotion_code.created':
    case 'promotion_code.updated':
      await handleCouponOrPromoCodeChange(event, supabase);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event, supabase, stripe);
      break;

    case 'customer.updated':
      await handleCustomerUpdated(event, supabase);
      break;

    case 'payment_method.attached':
      await handlePaymentMethodAttached(event, supabase);
      break;

    case 'payment_method.updated':
      await handlePaymentMethodUpdated(event, supabase);
      break;

    case 'payment_method.detached':
      await handlePaymentMethodDetached(event, supabase);
      break;

    default:
      logger.info({ eventType }, 'Unhandled webhook event type');
  }
}

async function handleAccountUpdated(event: Stripe.Event, supabase: any) {
  const account = event.data.object as Stripe.Account;

  // Fetch current state to detect charges_enabled transition
  const { data: existing } = await supabase
    .from('coach_stripe_accounts')
    .select('coach_id, charges_enabled')
    .eq('stripe_account_id', account.id)
    .maybeSingle();

  const wasChargesEnabled = existing?.charges_enabled ?? false;

  await supabase
    .from('coach_stripe_accounts')
    .update({
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
      onboarding_complete: (account.charges_enabled && account.details_submitted) ?? false,
      default_currency: account.default_currency || null,
      country: account.country || null,
    })
    .eq('stripe_account_id', account.id);

  logger.info({ stripeAccountId: account.id, chargesEnabled: account.charges_enabled }, 'Coach Stripe account updated');

  // If charges_enabled just became true, do a bidirectional sync
  if (!wasChargesEnabled && account.charges_enabled && existing?.coach_id) {
    try {
      // Pull existing products FROM Stripe into our DB
      await syncProductsFromStripe(existing.coach_id);
      // Push Athli-only packages TO Stripe
      const result = await backfillStripeForCoach(existing.coach_id);
      logger.info({ coachId: existing.coach_id, result }, 'Bidirectional sync on charges_enabled transition');
    } catch (err: any) {
      logger.error({ err: err.message, coachId: existing.coach_id }, 'Sync failed on charges_enabled transition');
    }
  }
}

async function handleCheckoutCompleted(event: Stripe.Event, supabase: any) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  logger.info({ sessionId: session.id, mode: session.mode, metadata }, 'handleCheckoutCompleted called');

  // Extract Stripe coupon ID from session discounts
  let stripeCouponId: string | null = null;
  const discounts = (session.total_details as any)?.breakdown?.discounts;
  if (discounts && discounts.length > 0) {
    const discount = discounts[0].discount;
    if (discount?.coupon?.id) {
      stripeCouponId = discount.coupon.id;
    }
  }

  // Look up our local coupon_id if a Stripe coupon was used
  let couponId: string | null = null;
  if (stripeCouponId && metadata.coach_id) {
    couponId = await getCouponIdFromStripe(supabase, metadata.coach_id, stripeCouponId);
    logger.info({ stripeCouponId, couponId }, 'Coupon used in checkout');
  }

  if (session.mode === 'payment') {
    // One-time payment
    await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        coupon_id: couponId,
      })
      .eq('stripe_checkout_session_id', session.id);

    // Log billing activity for one-time payment
    if (metadata.coach_id && metadata.client_id) {
      const clientName = await getClientName(supabase, metadata.client_id);
      const packageName = metadata.package_id ? await getPackageName(supabase, metadata.package_id) : 'a package';
      await logBillingActivity(supabase, {
        coach_id: metadata.coach_id,
        client_id: metadata.client_id,
        package_id: metadata.package_id || null,
        event_type: 'payment_succeeded',
        description: `${clientName} purchased ${packageName}`,
        amount_cents: session.amount_total || 0,
        currency: session.currency || 'usd',
        stripe_event_id: event.id,
      });

      // Update package stats: +1 sale, +revenue
      if (metadata.package_id && session.amount_total) {
        await updatePackageStats(supabase, {
          package_id: metadata.package_id,
          sales_count: 1,
          revenue_cents: session.amount_total,
        });
      }
    }

    logger.info({ sessionId: session.id }, 'Payment succeeded via checkout');
  } else if (session.mode === 'subscription') {
    // Subscription created
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
    const customerId = typeof session.customer === 'string' ? session.customer : null;

    // Update the pending payment record with coupon_id if applicable
    if (couponId) {
      await supabase
        .from('payments')
        .update({ coupon_id: couponId })
        .eq('stripe_checkout_session_id', session.id);
    }

    if (subscriptionId && metadata.coach_id && metadata.client_id) {
      // Fetch subscription from Stripe to get actual recurring price and trial info
      const stripe = getStripeClient();
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscriptionId,
        { stripeAccount: event.account }
      );

      // Get actual recurring amount from subscription items
      const item = stripeSubscription.items.data[0];
      const amount = item?.price?.unit_amount || 0;
      const currency = item?.price?.currency || 'usd';

      // Check for trial
      const isTrialing = stripeSubscription.status === 'trialing';
      const trialEnd = stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000).toISOString()
        : null;

      const { data: insertedSub } = await supabase
        .from('client_subscriptions')
        .insert({
          coach_id: metadata.coach_id,
          client_id: metadata.client_id,
          package_id: metadata.package_id || null,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId || '',
          status: isTrialing ? 'trialing' : 'active',
        })
        .select('id')
        .single();

      // Log billing activity - trial_started OR subscription_created (not both)
      const clientName = await getClientName(supabase, metadata.client_id);
      const packageName = metadata.package_id ? await getPackageName(supabase, metadata.package_id) : 'a package';

      if (isTrialing) {
        // Log trial_started for trial subscriptions
        const trialEndDate = stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })
          : null;
        await logBillingActivity(supabase, {
          coach_id: metadata.coach_id,
          client_id: metadata.client_id,
          package_id: metadata.package_id || null,
          subscription_id: insertedSub?.id || null,
          event_type: 'trial_started',
          description: `${clientName} started a trial for ${packageName}${trialEndDate ? ` (ends ${trialEndDate})` : ''}`,
          amount_cents: amount,  // Show what they'll pay after trial
          currency: currency,
          metadata: { trial_end: trialEnd },
          stripe_event_id: event.id,
        });
      } else {
        // Log subscription_created for non-trial subscriptions
        await logBillingActivity(supabase, {
          coach_id: metadata.coach_id,
          client_id: metadata.client_id,
          package_id: metadata.package_id || null,
          subscription_id: insertedSub?.id || null,
          event_type: 'subscription_created',
          description: `${clientName} subscribed to ${packageName}`,
          amount_cents: amount,
          currency: currency,
          stripe_event_id: event.id,
        });
      }

      // Update package stats: +1 sale, +1 active subscription
      if (metadata.package_id) {
        await updatePackageStats(supabase, {
          package_id: metadata.package_id,
          sales_count: 1,
          active_subscriptions_count: 1,
        });
      }

      // Also mark the payment as succeeded
      if (metadata.payment_id) {
        await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            paid_at: new Date().toISOString(),
          })
          .eq('id', metadata.payment_id);
      }

      logger.info({ sessionId: session.id, subscriptionId, isTrialing, trialEnd }, 'Subscription created via checkout');
    }
  }

  // Create coach-client assignment if needed
  logger.info({ metadata }, 'Processing checkout completion - checking for assignment creation');

  if (metadata.coach_id && metadata.client_id) {
    // 0. Ensure client_profiles entry exists (required by FK on coach_client_assignments)
    const { data: existingClientProfile } = await supabase
      .from('client_profiles')
      .select('client_id')
      .eq('client_id', metadata.client_id)
      .maybeSingle();

    if (!existingClientProfile) {
      const { error: clientProfileError } = await supabase
        .from('client_profiles')
        .insert({
          client_id: metadata.client_id,
          unit_system: 'metric',
        });

      if (clientProfileError && clientProfileError.code !== '23505') {
        logger.error({ err: clientProfileError.message, clientId: metadata.client_id }, 'Failed to create client_profiles entry');
      } else {
        logger.info({ clientId: metadata.client_id }, 'Client profile created via checkout');
      }
    }

    // 1. Coach-client relationship
    const { data: existingAssignment, error: checkError } = await supabase
      .from('coach_client_assignments')
      .select('coach_id')
      .eq('coach_id', metadata.coach_id)
      .eq('client_id', metadata.client_id)
      .maybeSingle();

    if (checkError) {
      logger.error({ err: checkError.message, coachId: metadata.coach_id, clientId: metadata.client_id }, 'Error checking existing coach-client assignment');
    }

    if (!existingAssignment) {
      const { error: insertError } = await supabase
        .from('coach_client_assignments')
        .insert({
          coach_id: metadata.coach_id,
          client_id: metadata.client_id,
          status: 'accepted',
          category: 'online',
          is_active: true,
          connected_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error({ err: insertError.message, coachId: metadata.coach_id, clientId: metadata.client_id }, 'Failed to create coach-client assignment');
      } else {
        logger.info({ coachId: metadata.coach_id, clientId: metadata.client_id }, 'Coach-client assignment created via checkout');
      }
    } else {
      logger.info({ coachId: metadata.coach_id, clientId: metadata.client_id }, 'Coach-client assignment already exists');
    }

    // 2. Client-package assignment (if package_id exists)
    if (metadata.package_id) {
      const { data: existingPkgAssignment, error: pkgCheckError } = await supabase
        .from('client_package_assignments')
        .select('id')
        .eq('coach_id', metadata.coach_id)
        .eq('client_id', metadata.client_id)
        .eq('package_id', metadata.package_id)
        .maybeSingle();

      if (pkgCheckError) {
        logger.error({ err: pkgCheckError.message, coachId: metadata.coach_id, clientId: metadata.client_id, packageId: metadata.package_id }, 'Error checking existing package assignment');
      }

      if (!existingPkgAssignment) {
        const { error: pkgInsertError } = await supabase
          .from('client_package_assignments')
          .insert({
            coach_id: metadata.coach_id,
            client_id: metadata.client_id,
            package_id: metadata.package_id,
            is_active: true,
          });

        if (pkgInsertError) {
          logger.error({ err: pkgInsertError.message, coachId: metadata.coach_id, clientId: metadata.client_id, packageId: metadata.package_id }, 'Failed to create client-package assignment');
        } else {
          logger.info({ coachId: metadata.coach_id, clientId: metadata.client_id, packageId: metadata.package_id }, 'Client-package assignment created via checkout');
        }
      } else {
        logger.info({ coachId: metadata.coach_id, clientId: metadata.client_id, packageId: metadata.package_id }, 'Client-package assignment already exists');
      }

      // 3. Execute package sequence if one is assigned
      const { data: pkg } = await supabase
        .from('coach_packages')
        .select('sequence_id')
        .eq('id', metadata.package_id)
        .single();

      if (pkg?.sequence_id) {
        logger.info({ coachId: metadata.coach_id, clientId: metadata.client_id, packageId: metadata.package_id, sequenceId: pkg.sequence_id }, 'Executing package sequence');

        // Fire-and-forget sequence execution
        sequenceExecutor.execute({
          coachId: metadata.coach_id,
          clientId: metadata.client_id,
          packageId: metadata.package_id,
          sequenceId: pkg.sequence_id,
        }).catch(err => {
          logger.error({ err: err.message, coachId: metadata.coach_id, clientId: metadata.client_id, packageId: metadata.package_id, sequenceId: pkg.sequence_id }, 'Sequence execution failed');
        });
      }
    }
  } else {
    logger.warn({ metadata }, 'Missing coach_id or client_id in checkout metadata - cannot create assignments');
  }
}

async function handleCheckoutExpired(event: Stripe.Event, supabase: any) {
  const session = event.data.object as Stripe.Checkout.Session;

  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('stripe_checkout_session_id', session.id)
    .eq('status', 'pending');

  logger.info({ sessionId: session.id }, 'Checkout session expired');
}

async function handlePaymentFailed(event: Stripe.Event, supabase: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: failureMessage,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  logger.info({ paymentIntentId: paymentIntent.id, reason: failureMessage }, 'Payment failed');
}

async function handleChargeRefunded(event: Stripe.Event, supabase: any) {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;

  if (paymentIntentId) {
    // Get payment data for activity logging
    const { data: payment } = await supabase
      .from('payments')
      .select('coach_id, client_id, package_id, amount_cents, currency')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', paymentIntentId);

    // Log billing activity
    if (payment) {
      const clientName = await getClientName(supabase, payment.client_id);
      const packageName = payment.package_id ? await getPackageName(supabase, payment.package_id) : 'a purchase';
      const refundAmount = charge.amount_refunded || payment.amount_cents;

      await logBillingActivity(supabase, {
        coach_id: payment.coach_id,
        client_id: payment.client_id,
        package_id: payment.package_id,
        event_type: 'refund_issued',
        description: `Refund issued to ${clientName} for ${packageName}`,
        amount_cents: refundAmount,
        currency: payment.currency || 'usd',
        stripe_event_id: event.id,
      });

      // Update package stats: +1 refund, -revenue
      if (payment.package_id) {
        await updatePackageStats(supabase, {
          package_id: payment.package_id,
          refunds_count: 1,
          revenue_cents: -refundAmount,
        });
      }
    }

    logger.info({ paymentIntentId }, 'Payment refunded');
  }
}

async function handleDisputeCreated(event: Stripe.Event, supabase: any) {
  const dispute = event.data.object as Stripe.Dispute;
  const paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;

  if (paymentIntentId) {
    // Get payment data for activity logging
    const { data: payment } = await supabase
      .from('payments')
      .select('coach_id, client_id, package_id, amount_cents, currency')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    await supabase
      .from('payments')
      .update({ status: 'disputed' })
      .eq('stripe_payment_intent_id', paymentIntentId);

    // Log billing activity
    if (payment) {
      const clientName = await getClientName(supabase, payment.client_id);
      const packageName = payment.package_id ? await getPackageName(supabase, payment.package_id) : 'a purchase';

      await logBillingActivity(supabase, {
        coach_id: payment.coach_id,
        client_id: payment.client_id,
        package_id: payment.package_id,
        event_type: 'dispute_created',
        description: `${clientName} disputed payment for ${packageName}`,
        amount_cents: dispute.amount || payment.amount_cents,
        currency: payment.currency || 'usd',
        metadata: { reason: dispute.reason },
        stripe_event_id: event.id,
      });
    }

    logger.info({ paymentIntentId }, 'Payment disputed');
  }
}

async function handleInvoicePaid(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;

  if (!subscriptionId) return;

  // Find the subscription to get coach/client/package IDs
  const { data: sub } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id, status')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (sub) {
    await supabase
      .from('payments')
      .insert({
        coach_id: sub.coach_id,
        client_id: sub.client_id,
        package_id: sub.package_id,
        stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : null,
        amount_cents: invoice.amount_paid || 0,
        currency: invoice.currency || 'usd',
        status: 'succeeded',
        paid_at: new Date().toISOString(),
      });

    // Log billing activity for subscription renewal
    // billing_reason: 'subscription_cycle' = renewal, 'subscription_create' = first payment
    const billingReason = (invoice as any).billing_reason;
    const isRenewal = billingReason === 'subscription_cycle' || billingReason === 'subscription_update';

    // Detect trial conversion: first paid invoice after trial period
    const isTrialConversion = billingReason === 'subscription_cycle' && sub.status === 'trialing';

    const clientName = await getClientName(supabase, sub.client_id);
    const packageName = sub.package_id ? await getPackageName(supabase, sub.package_id) : 'their subscription';

    // Get period_end for metadata
    const periodEnd = (invoice as any).lines?.data?.[0]?.period?.end
      ? new Date((invoice as any).lines.data[0].period.end * 1000).toISOString()
      : null;

    if (isTrialConversion) {
      // Log trial conversion event
      await logBillingActivity(supabase, {
        coach_id: sub.coach_id,
        client_id: sub.client_id,
        package_id: sub.package_id,
        subscription_id: sub.id,
        event_type: 'trial_converted',
        description: `${clientName} converted from trial to paid for ${packageName}`,
        amount_cents: invoice.amount_paid || 0,
        currency: invoice.currency || 'usd',
        metadata: periodEnd ? { current_period_end: periodEnd } : undefined,
        stripe_event_id: event.id,
      });

      // Update subscription status from trialing to active
      await supabase
        .from('client_subscriptions')
        .update({ status: 'active' })
        .eq('id', sub.id);
    } else {
      await logBillingActivity(supabase, {
        coach_id: sub.coach_id,
        client_id: sub.client_id,
        package_id: sub.package_id,
        subscription_id: sub.id,
        event_type: isRenewal ? 'subscription_renewed' : 'payment_succeeded',
        description: isRenewal
          ? `${clientName} renewed ${packageName}`
          : `${clientName} paid for ${packageName}`,
        amount_cents: invoice.amount_paid || 0,
        currency: invoice.currency || 'usd',
        metadata: periodEnd ? { current_period_end: periodEnd } : undefined,
        stripe_event_id: event.id,
      });
    }

    // Update package stats: add revenue
    if (sub.package_id && invoice.amount_paid > 0) {
      await updatePackageStats(supabase, {
        package_id: sub.package_id,
        revenue_cents: invoice.amount_paid,
      });
    }

    logger.info({ subscriptionId, invoiceId: invoice.id, billingReason, isTrialConversion }, 'Subscription invoice paid');
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;

  if (subscriptionId) {
    // Get subscription data for activity logging
    const { data: sub } = await supabase
      .from('client_subscriptions')
      .select('id, coach_id, client_id, package_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    await supabase
      .from('client_subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subscriptionId);

    // Log billing activity
    if (sub) {
      const clientName = await getClientName(supabase, sub.client_id);
      const packageName = sub.package_id ? await getPackageName(supabase, sub.package_id) : 'their subscription';
      const failureMessage = (invoice as any).last_finalization_error?.message || 'Payment declined';

      await logBillingActivity(supabase, {
        coach_id: sub.coach_id,
        client_id: sub.client_id,
        package_id: sub.package_id,
        subscription_id: sub.id,
        event_type: 'payment_failed',
        description: `${clientName}'s payment for ${packageName} failed`,
        amount_cents: invoice.amount_due || 0,
        currency: invoice.currency || 'usd',
        metadata: { reason: failureMessage },
        stripe_event_id: event.id,
      });
    }

    logger.info({ subscriptionId, invoiceId: invoice.id }, 'Subscription invoice payment failed');
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = (event.data as any).previous_attributes || {};

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'unpaid',
    trialing: 'trialing',
    incomplete: 'past_due',
    incomplete_expired: 'cancelled',
    paused: 'cancelled',
  };

  const status = statusMap[subscription.status] || 'active';

  // Handle cancel_at - when the subscription is scheduled to be cancelled
  const cancelAt = subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000).toISOString()
    : null;

  // Get existing subscription data for activity logging
  const { data: existingSub } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id, cancel_at')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  await supabase
    .from('client_subscriptions')
    .update({
      status,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      cancel_at: cancelAt,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', subscription.id);

  // Log billing activity based on what changed
  if (existingSub) {
    const clientName = await getClientName(supabase, existingSub.client_id);
    const packageName = existingSub.package_id ? await getPackageName(supabase, existingSub.package_id) : 'their subscription';
    const cancellationReason = (subscription as any).cancellation_details?.reason;

    // Detect cancellation scheduled (cancel_at newly set)
    if (cancelAt && previousAttributes.cancel_at === null) {
      const cancelDate = new Date(subscription.cancel_at! * 1000).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      await logBillingActivity(supabase, {
        coach_id: existingSub.coach_id,
        client_id: existingSub.client_id,
        package_id: existingSub.package_id,
        subscription_id: existingSub.id,
        event_type: 'subscription_cancelling',
        description: `${clientName} scheduled cancellation for ${packageName} on ${cancelDate}`,
        metadata: { cancel_at: cancelAt, current_period_end: currentPeriodEnd, reason: cancellationReason },
        stripe_event_id: event.id,
      });
    }
    // Detect reactivation (cancel_at was set but now null)
    else if (!cancelAt && previousAttributes.cancel_at !== undefined && previousAttributes.cancel_at !== null) {
      await logBillingActivity(supabase, {
        coach_id: existingSub.coach_id,
        client_id: existingSub.client_id,
        package_id: existingSub.package_id,
        subscription_id: existingSub.id,
        event_type: 'subscription_reactivated',
        description: `${clientName} reactivated ${packageName}`,
        stripe_event_id: event.id,
      });
    }
    // Detect status change to past_due
    else if (status === 'past_due' && previousAttributes.status && previousAttributes.status !== 'past_due') {
      await logBillingActivity(supabase, {
        coach_id: existingSub.coach_id,
        client_id: existingSub.client_id,
        package_id: existingSub.package_id,
        subscription_id: existingSub.id,
        event_type: 'subscription_past_due',
        description: `${clientName}'s subscription for ${packageName} is past due`,
        stripe_event_id: event.id,
      });
    }
  }

  logger.info({ subscriptionId: subscription.id, status, cancelAt }, 'Subscription updated');
}

async function handleSubscriptionDeleted(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;

  // Get subscription data before updating for activity logging
  const { data: existingSub } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  await supabase
    .from('client_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Log billing activity
  if (existingSub) {
    const clientName = await getClientName(supabase, existingSub.client_id);
    const packageName = existingSub.package_id ? await getPackageName(supabase, existingSub.package_id) : 'their subscription';
    const cancellationReason = (subscription as any).cancellation_details?.reason;

    await logBillingActivity(supabase, {
      coach_id: existingSub.coach_id,
      client_id: existingSub.client_id,
      package_id: existingSub.package_id,
      subscription_id: existingSub.id,
      event_type: 'subscription_cancelled',
      description: `${clientName}'s subscription to ${packageName} has ended`,
      metadata: { reason: cancellationReason },
      stripe_event_id: event.id,
    });

    // Update package stats: -1 active subscription, +1 cancellation
    if (existingSub.package_id) {
      await updatePackageStats(supabase, {
        package_id: existingSub.package_id,
        active_subscriptions_count: -1,
        cancellations_count: 1,
      });
    }
  }

  logger.info({ subscriptionId: subscription.id }, 'Subscription deleted/cancelled');
}

async function handleProductOrPriceChange(event: Stripe.Event, supabase: any, stripe: Stripe) {
  const stripeAccountId = event.account;
  if (!stripeAccountId) return;

  const { data: coachAccount } = await supabase
    .from('coach_stripe_accounts')
    .select('coach_id')
    .eq('stripe_account_id', stripeAccountId)
    .maybeSingle();

  if (!coachAccount) return;

  const coachId = coachAccount.coach_id;
  const opts = { stripeAccount: stripeAccountId };

  switch (event.type) {
    // ── Product Created ─────────────────────────────────────
    case 'product.created': {
      const product = event.data.object as Stripe.Product;
      // Skip products we created (they already have a DB row)
      if (product.metadata?.athli_package_id) return;

      // Fetch prices for this new product; read features from product object
      const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 }, opts);
      const features = (product.marketing_features || []).map((f: any) => f.name);

      // Use product image or assign default
      const hasImage = product.images && product.images.length > 0;
      let imageUrl = hasImage ? product.images[0] : null;
      const defaultImageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop';

      logger.info({ productId: product.id, images: product.images, hasImage }, 'Product created - checking images');

      // If no image, assign default and update Stripe product
      if (!hasImage) {
        imageUrl = defaultImageUrl;
        try {
          const updatedProduct = await stripe.products.update(
            product.id,
            { images: [defaultImageUrl] },
            opts
          );
          logger.info({ productId: product.id, updatedImages: updatedProduct.images }, 'Assigned default image to Stripe product');
        } catch (updateErr: any) {
          logger.error({ err: updateErr.message, productId: product.id }, 'Failed to update Stripe product with default image');
        }
      }

      const rows = prices.data.map(price => ({
        coach_id: coachId,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        name: product.name,
        description: product.description || null,
        amount_cents: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring ? price.recurring.interval : 'one_time',
        interval_count: price.recurring?.interval_count || null,
        is_active: true,
        is_visible: true,
        features,
        free_trial_days: 0,
        image_url: imageUrl,
      }));

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('coach_packages')
          .upsert(rows, { onConflict: 'coach_id,stripe_product_id,stripe_price_id' });
        if (upsertErr) {
          logger.error({ err: upsertErr.message, code: upsertErr.code, productId: product.id }, 'Failed to upsert package from product.created webhook');
        }
      }

      logger.info({ productId: product.id, prices: rows.length, hasDefaultImage: !product.images?.[0] }, 'Product created via webhook');
      break;
    }

    // ── Product Updated ─────────────────────────────────────
    case 'product.updated': {
      const product = event.data.object as Stripe.Product;

      // Read features from product object
      const features = (product.marketing_features || []).map((f: any) => f.name);

      // Use product image or assign default
      const hasImage = product.images && product.images.length > 0;
      let imageUrl = hasImage ? product.images[0] : null;
      const defaultImageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop';

      logger.info({ productId: product.id, images: product.images, hasImage }, 'Product updated - checking images');

      // If no image, assign default and update Stripe product
      if (!hasImage) {
        imageUrl = defaultImageUrl;
        try {
          const updatedProduct = await stripe.products.update(
            product.id,
            { images: [defaultImageUrl] },
            opts
          );
          logger.info({ productId: product.id, updatedImages: updatedProduct.images }, 'Assigned default image to Stripe product on update');
        } catch (updateErr: any) {
          logger.error({ err: updateErr.message, productId: product.id }, 'Failed to update Stripe product with default image');
        }
      }

      const { data: updatedRows } = await supabase
        .from('coach_packages')
        .update({
          name: product.name,
          description: product.description || null,
          is_active: product.active,
          features,
          image_url: imageUrl,
        })
        .eq('coach_id', coachId)
        .eq('stripe_product_id', product.id)
        .select('id');

      // If no rows were updated, the product doesn't exist in our DB yet — insert it
      if (!updatedRows || updatedRows.length === 0) {
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 }, opts);
        const rows = prices.data.map(price => ({
          coach_id: coachId,
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          name: product.name,
          description: product.description || null,
          amount_cents: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring ? price.recurring.interval : 'one_time',
          interval_count: price.recurring?.interval_count || null,
          is_active: product.active,
          is_visible: true,
          features,
          free_trial_days: 0,
          image_url: imageUrl,
        }));

        if (rows.length > 0) {
          const { error: upsertErr } = await supabase
            .from('coach_packages')
            .upsert(rows, { onConflict: 'coach_id,stripe_product_id,stripe_price_id' });
          if (upsertErr) {
            logger.error({ err: upsertErr.message, code: upsertErr.code, productId: product.id }, 'Failed to upsert package from product.updated webhook');
          }
        }
      }

      logger.info({ productId: product.id, matched: updatedRows?.length ?? 0 }, 'Product updated via webhook');
      break;
    }

    // ── Product Deleted ─────────────────────────────────────
    case 'product.deleted': {
      const product = event.data.object as Stripe.Product;

      await supabase
        .from('coach_packages')
        .delete()
        .eq('coach_id', coachId)
        .eq('stripe_product_id', product.id);

      logger.info({ productId: product.id }, 'Product deleted via webhook');
      break;
    }

    // ── Price Created ───────────────────────────────────────
    case 'price.created': {
      const price = event.data.object as Stripe.Price;
      // Skip prices we created
      if (price.metadata?.athli_package_id) return;

      const productId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
      if (!productId) return;

      // Fetch product details for the name/description
      let productName = '';
      let productDescription: string | null = null;
      let features: string[] = [];
      let imageUrl: string | null = null;
      try {
        const product = await stripe.products.retrieve(productId, opts);
        productName = product.name;
        productDescription = product.description || null;
        features = (product.marketing_features || []).map((f: any) => f.name);
        imageUrl = product.images?.[0] || null;
      } catch { /* product may not be accessible */ }

      const { error: upsertErr } = await supabase
        .from('coach_packages')
        .upsert({
          coach_id: coachId,
          stripe_product_id: productId,
          stripe_price_id: price.id,
          name: productName,
          description: productDescription,
          amount_cents: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring ? price.recurring.interval : 'one_time',
          interval_count: price.recurring?.interval_count || null,
          is_active: price.active,
          is_visible: true,
          features,
          free_trial_days: 0,
          image_url: imageUrl,
        }, { onConflict: 'coach_id,stripe_product_id,stripe_price_id' });

      if (upsertErr) {
        logger.error({ err: upsertErr.message, code: upsertErr.code, priceId: price.id, productId }, 'Failed to upsert package from price.created webhook');
      }

      logger.info({ priceId: price.id, productId }, 'Price created via webhook');
      break;
    }

    // ── Price Updated ───────────────────────────────────────
    case 'price.updated': {
      const price = event.data.object as Stripe.Price;

      await supabase
        .from('coach_packages')
        .update({
          amount_cents: price.unit_amount || 0,
          currency: price.currency,
          is_active: price.active,
          interval: price.recurring ? price.recurring.interval : 'one_time',
          interval_count: price.recurring?.interval_count || null,
        })
        .eq('coach_id', coachId)
        .eq('stripe_price_id', price.id);

      logger.info({ priceId: price.id }, 'Price updated via webhook');
      break;
    }

    // ── Price Deleted ───────────────────────────────────────
    case 'price.deleted': {
      const price = event.data.object as Stripe.Price;

      await supabase
        .from('coach_packages')
        .delete()
        .eq('coach_id', coachId)
        .eq('stripe_price_id', price.id);

      logger.info({ priceId: price.id }, 'Price deleted via webhook');
      break;
    }
  }
}

async function handleCouponOrPromoCodeChange(event: Stripe.Event, supabase: any) {
  const stripeAccountId = event.account;
  if (!stripeAccountId) return;

  const { data: coachAccount } = await supabase
    .from('coach_stripe_accounts')
    .select('coach_id')
    .eq('stripe_account_id', stripeAccountId)
    .maybeSingle();

  if (!coachAccount) return;

  const coachId = coachAccount.coach_id;

  switch (event.type) {
    // ── Coupon Created / Updated ─────────────────────────────
    case 'coupon.created':
    case 'coupon.updated': {
      const coupon = event.data.object as Stripe.Coupon;

      // For created events, skip coupons we created (they already have a DB row).
      // For updated events, always process — the coach may have edited in Stripe dashboard.
      if (event.type === 'coupon.created' && coupon.metadata?.athli_coupon_id) return;

      // Map Stripe duration to duration_months: 'once' → null, 'forever' → 0, 'repeating' → duration_in_months
      let durationMonths: number | null = null;
      if (coupon.duration === 'forever') {
        durationMonths = 0;
      } else if (coupon.duration === 'repeating') {
        durationMonths = coupon.duration_in_months ?? null;
      }

      const row: any = {
        coach_id: coachId,
        stripe_coupon_id: coupon.id,
        name: coupon.name || coupon.id,
        discount_type: coupon.percent_off ? 'percentage' : 'fixed',
        discount_value: coupon.percent_off ?? (coupon.amount_off ? coupon.amount_off / 100 : 0),
        currency: coupon.currency || 'usd',
        duration_months: durationMonths,
        is_active: coupon.valid !== false,
      };

      if (coupon.max_redemptions) {
        row.max_redemptions = coupon.max_redemptions;
      }

      if (coupon.redeem_by) {
        row.expires_at = new Date(coupon.redeem_by * 1000).toISOString();
      }

      // Try to update first (by stripe_coupon_id or athli_coupon_id), then insert if no match
      let updated: any[] | null = null;

      // First try matching by stripe_coupon_id
      const { data: updatedByStripeId } = await supabase
        .from('coach_coupons')
        .update(row)
        .eq('coach_id', coachId)
        .eq('stripe_coupon_id', coupon.id)
        .select('id');

      updated = updatedByStripeId;

      // If no match by stripe_coupon_id, try by athli_coupon_id from metadata
      if ((!updated || updated.length === 0) && coupon.metadata?.athli_coupon_id) {
        const { data: updatedByAthliId } = await supabase
          .from('coach_coupons')
          .update(row)
          .eq('id', coupon.metadata.athli_coupon_id)
          .eq('coach_id', coachId)
          .select('id');

        updated = updatedByAthliId;
      }

      if (!updated || updated.length === 0) {
        // Need a code for insert — use coupon name uppercased as fallback
        row.code = (coupon.name || coupon.id).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const { error: insertErr } = await supabase
          .from('coach_coupons')
          .insert(row);
        if (insertErr) {
          logger.error({ err: insertErr.message, couponId: coupon.id }, 'Failed to insert coupon from webhook');
        }
      }

      logger.info({ couponId: coupon.id, type: event.type }, 'Coupon synced via webhook');
      break;
    }

    // ── Coupon Deleted ───────────────────────────────────────
    case 'coupon.deleted': {
      const coupon = event.data.object as Stripe.Coupon;

      await supabase
        .from('coach_coupons')
        .delete()
        .eq('coach_id', coachId)
        .eq('stripe_coupon_id', coupon.id);

      logger.info({ couponId: coupon.id }, 'Coupon deleted via webhook');
      break;
    }

    // ── Promotion Code Created / Updated ─────────────────────
    case 'promotion_code.created':
    case 'promotion_code.updated': {
      const promoCode = event.data.object as any;
      const stripeCouponId = typeof promoCode.coupon === 'string'
        ? promoCode.coupon
        : promoCode.coupon?.id;

      if (!stripeCouponId) return;

      const updateData: any = {
        stripe_promo_code_id: promoCode.id,
        code: promoCode.code,
        is_active: promoCode.active,
      };

      if (promoCode.max_redemptions) {
        updateData.max_redemptions = promoCode.max_redemptions;
      }

      if (promoCode.expires_at) {
        updateData.expires_at = new Date(promoCode.expires_at * 1000).toISOString();
      }

      await supabase
        .from('coach_coupons')
        .update(updateData)
        .eq('coach_id', coachId)
        .eq('stripe_coupon_id', stripeCouponId);

      logger.info({ promoCodeId: promoCode.id, stripeCouponId, type: event.type }, 'Promotion code synced via webhook');
      break;
    }
  }
}

// ─── Trial & Customer Portal Webhook Handlers ────────────────────

async function handleTrialWillEnd(event: Stripe.Event, supabase: any, stripe: Stripe) {
  const subscription = event.data.object as Stripe.Subscription;

  // Find our subscription record
  const { data: sub } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (!sub) {
    logger.info({ subscriptionId: subscription.id }, 'Trial will end for unknown subscription');
    return;
  }

  const clientName = await getClientName(supabase, sub.client_id);
  const packageName = sub.package_id ? await getPackageName(supabase, sub.package_id) : 'their subscription';

  // Get trial end date and upcoming charge amount
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  // Get the upcoming charge amount from subscription items
  const item = subscription.items.data[0];
  const upcomingAmount = item?.price?.unit_amount || 0;
  const currency = item?.price?.currency || 'usd';

  await logBillingActivity(supabase, {
    coach_id: sub.coach_id,
    client_id: sub.client_id,
    package_id: sub.package_id,
    subscription_id: sub.id,
    event_type: 'trial_ending',
    description: `${clientName}'s trial for ${packageName} ends in 3 days`,
    amount_cents: upcomingAmount,
    currency: currency,
    metadata: { trial_end: trialEnd },
    stripe_event_id: event.id,
  });

  logger.info({ subscriptionId: subscription.id, trialEnd }, 'Trial ending webhook processed');
}

async function handleCustomerUpdated(event: Stripe.Event, supabase: any) {
  const customer = event.data.object as Stripe.Customer;
  const previousAttributes = (event.data as any).previous_attributes || {};

  // Only log if meaningful fields changed
  const changedFields: string[] = [];
  if (previousAttributes.email !== undefined) changedFields.push('email');
  if (previousAttributes.name !== undefined) changedFields.push('name');
  if (previousAttributes.address !== undefined) changedFields.push('billing address');

  if (changedFields.length === 0) {
    logger.info({ customerId: customer.id }, 'Customer updated but no tracked fields changed');
    return;
  }

  // Find subscription(s) for this customer to get coach/client info
  const { data: subs } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id')
    .eq('stripe_customer_id', customer.id)
    .limit(1);

  if (!subs || subs.length === 0) {
    logger.info({ customerId: customer.id }, 'Customer updated but no subscription found');
    return;
  }

  const sub = subs[0];
  const clientName = await getClientName(supabase, sub.client_id);

  await logBillingActivity(supabase, {
    coach_id: sub.coach_id,
    client_id: sub.client_id,
    event_type: 'customer_updated',
    description: `${clientName} updated their ${changedFields.join(', ')}`,
    metadata: {
      changed_fields: changedFields,
      new_email: previousAttributes.email !== undefined ? customer.email : undefined,
      new_name: previousAttributes.name !== undefined ? customer.name : undefined,
    },
    stripe_event_id: event.id,
  });

  logger.info({ customerId: customer.id, changedFields }, 'Customer updated webhook processed');
}

async function handlePaymentMethodAttached(event: Stripe.Event, supabase: any) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;
  const customerId = typeof paymentMethod.customer === 'string' ? paymentMethod.customer : null;

  if (!customerId) {
    logger.info({ paymentMethodId: paymentMethod.id }, 'Payment method attached but no customer');
    return;
  }

  // Find subscription for this customer
  const { data: subs } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!subs || subs.length === 0) {
    logger.info({ customerId }, 'Payment method attached but no subscription found');
    return;
  }

  const sub = subs[0];
  const clientName = await getClientName(supabase, sub.client_id);

  // Get card details if available
  const cardBrand = paymentMethod.card?.brand || 'card';
  const cardLast4 = paymentMethod.card?.last4 || '****';

  await logBillingActivity(supabase, {
    coach_id: sub.coach_id,
    client_id: sub.client_id,
    event_type: 'payment_method_added',
    description: `${clientName} added a ${cardBrand} ending in ${cardLast4}`,
    metadata: {
      card_brand: cardBrand,
      card_last4: cardLast4,
      payment_method_type: paymentMethod.type,
    },
    stripe_event_id: event.id,
  });

  logger.info({ customerId, paymentMethodId: paymentMethod.id, cardBrand, cardLast4 }, 'Payment method attached webhook processed');
}

async function handlePaymentMethodUpdated(event: Stripe.Event, supabase: any) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;
  const customerId = typeof paymentMethod.customer === 'string' ? paymentMethod.customer : null;

  if (!customerId) {
    logger.info({ paymentMethodId: paymentMethod.id }, 'Payment method updated but no customer');
    return;
  }

  // Find subscription for this customer
  const { data: subs } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!subs || subs.length === 0) {
    logger.info({ customerId }, 'Payment method updated but no subscription found');
    return;
  }

  const sub = subs[0];
  const clientName = await getClientName(supabase, sub.client_id);

  // Get card details if available
  const cardBrand = paymentMethod.card?.brand || 'card';
  const cardLast4 = paymentMethod.card?.last4 || '****';

  await logBillingActivity(supabase, {
    coach_id: sub.coach_id,
    client_id: sub.client_id,
    event_type: 'payment_method_updated',
    description: `${clientName} updated their ${cardBrand} ending in ${cardLast4}`,
    metadata: {
      card_brand: cardBrand,
      card_last4: cardLast4,
      payment_method_type: paymentMethod.type,
    },
    stripe_event_id: event.id,
  });

  logger.info({ customerId, paymentMethodId: paymentMethod.id }, 'Payment method updated webhook processed');
}

async function handlePaymentMethodDetached(event: Stripe.Event, supabase: any) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;
  const previousAttributes = (event.data as any).previous_attributes || {};

  // When detached, customer is null - use previous_attributes to get the original customer
  const customerId = previousAttributes.customer || null;

  if (!customerId) {
    logger.info({ paymentMethodId: paymentMethod.id }, 'Payment method detached but no previous customer');
    return;
  }

  // Find subscription for this customer
  const { data: subs } = await supabase
    .from('client_subscriptions')
    .select('id, coach_id, client_id, package_id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!subs || subs.length === 0) {
    logger.info({ customerId }, 'Payment method detached but no subscription found');
    return;
  }

  const sub = subs[0];
  const clientName = await getClientName(supabase, sub.client_id);

  // Get card details if available
  const cardBrand = paymentMethod.card?.brand || 'card';
  const cardLast4 = paymentMethod.card?.last4 || '****';

  await logBillingActivity(supabase, {
    coach_id: sub.coach_id,
    client_id: sub.client_id,
    event_type: 'payment_method_removed',
    description: `${clientName} removed a ${cardBrand} ending in ${cardLast4}`,
    metadata: {
      card_brand: cardBrand,
      card_last4: cardLast4,
      payment_method_type: paymentMethod.type,
    },
    stripe_event_id: event.id,
  });

  logger.info({ customerId, paymentMethodId: paymentMethod.id, cardBrand, cardLast4 }, 'Payment method detached webhook processed');
}
