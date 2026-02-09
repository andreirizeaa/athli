import { Request, Response } from 'express';
import { success, unauthorized, internalError, badRequest, notFound, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { getStripeClient } from '../../../services/stripe.service';
import { logger } from '../../../config/logger';
import {
  syncPackageToStripe,
  updatePackageInStripe,
  archivePackageInStripe,
  togglePackageInStripe,
  syncDiscountCodeToStripe,
  updateDiscountCodeInStripe,
  deleteDiscountCodeInStripe,
  backfillStripeForCoach,
} from '../../../services/stripe-sync.service';
import Stripe from 'stripe';

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
    const webAppUrl = process.env.CORS_ORIGIN || 'http://localhost:3001';

    try {
      const { data: existing } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id')
        .eq('coach_id', userId)
        .maybeSingle();

      let stripeAccountId: string;

      if (existing?.stripe_account_id) {
        stripeAccountId = existing.stripe_account_id;
      } else {
        const account = await stripe.accounts.create({ type: 'express' });
        stripeAccountId = account.id;

        await supabase
          .from('coach_stripe_accounts')
          .insert({
            coach_id: userId,
            stripe_account_id: stripeAccountId,
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
        .select('stripe_account_id')
        .eq('coach_id', userId)
        .maybeSingle();

      if (!account?.stripe_account_id) {
        return notFound(res, { message: 'No Stripe account connected' });
      }

      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);

      success(res, {
        message: 'Stripe dashboard link created',
        data: { url: loginLink.url },
      });
    } catch (error: any) {
      return internalError(res, { message: 'Failed to create Stripe dashboard link' });
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
    const stripe = getStripeClient();

    try {
      const { data: account } = await supabase
        .from('coach_stripe_accounts')
        .select('stripe_account_id')
        .eq('coach_id', userId)
        .maybeSingle();

      if (!account?.stripe_account_id) {
        return badRequest(res, { message: 'No Stripe account connected. Please connect Stripe first.' });
      }

      const stripeAccountId = account.stripe_account_id;

      const products = await stripe.products.list(
        { limit: 100, active: true },
        { stripeAccount: stripeAccountId }
      );

      const upsertRows: any[] = [];

      for (const product of products.data) {
        const prices = await stripe.prices.list(
          { product: product.id, active: true, limit: 100 },
          { stripeAccount: stripeAccountId }
        );

        for (const price of prices.data) {
          upsertRows.push({
            coach_id: userId,
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            name: product.name,
            description: product.description || null,
            amount_cents: price.unit_amount || 0,
            currency: price.currency,
            interval: price.recurring ? price.recurring.interval : 'one_time',
            interval_count: price.recurring?.interval_count || null,
            is_active: true,
          });
        }
      }

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('coach_packages')
          .upsert(upsertRows, {
            onConflict: 'coach_id,stripe_product_id,stripe_price_id',
          });

        if (upsertError) {
          return internalError(res, { message: 'Failed to save synced packages' });
        }
      }

      const syncedKeys = upsertRows.map(r => `${r.stripe_product_id}:${r.stripe_price_id}`);

      const { data: allPackages } = await supabase
        .from('coach_packages')
        .select('id, stripe_product_id, stripe_price_id')
        .eq('coach_id', userId)
        .eq('is_active', true)
        .not('stripe_product_id', 'is', null);

      const toDeactivate = (allPackages || [])
        .filter(p => p.stripe_product_id && p.stripe_price_id && !syncedKeys.includes(`${p.stripe_product_id}:${p.stripe_price_id}`))
        .map(p => p.id);

      if (toDeactivate.length > 0) {
        await supabase
          .from('coach_packages')
          .update({ is_active: false })
          .in('id', toDeactivate);
      }

      const { data: packages } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('coach_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      success(res, {
        message: `Synced ${upsertRows.length} packages from Stripe`,
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

  // ─── Package CRUD ──────────────────────────────────────

  createPackage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { name, description, amount_cents, currency, interval, benefits, free_trial_days, duration_months, onboarding_id, sequence_id, initial_fee_cents } = req.body;

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
          is_active: false,
          is_visible: true,
          benefits: benefits || [],
          free_trial_days: free_trial_days || 0,
          initial_fee_cents: initial_fee_cents || 0,
          duration_months: duration_months || null,
          onboarding_id: onboarding_id || null,
          sequence_id: sequence_id || null,
        })
        .select()
        .single();

      if (error) {
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

  // ─── Discount Codes ───────────────────────────────────

  getCodes: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('coach_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return internalError(res, { message: 'Failed to fetch discount codes' });
      }

      success(res, {
        message: 'Discount codes retrieved',
        data: { codes: data || [] },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  createCode: async (req: Request, res: Response) => {
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
        .from('discount_codes')
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
          return badRequest(res, { message: 'A discount code with this code already exists' });
        }
        return internalError(res, { message: 'Failed to create discount code' });
      }

      // Sync to Stripe (best-effort)
      const stripeIds = await syncDiscountCodeToStripe(data);
      if (stripeIds) {
        const { data: updated } = await supabase
          .from('discount_codes')
          .update({ stripe_coupon_id: stripeIds.stripe_coupon_id, stripe_promo_code_id: stripeIds.stripe_promo_code_id })
          .eq('id', data.id)
          .select()
          .single();

        return success(res, {
          message: 'Discount code created',
          data: { code: updated || data },
        });
      }

      success(res, {
        message: 'Discount code created',
        data: { code: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  updateCode: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { codeId } = req.params;
    const updates = req.body;
    const supabase = getSupabaseClient();

    try {
      // Normalize code if being updated
      if (updates.code) {
        updates.code = updates.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      }

      // Fetch current state before update (for Stripe sync)
      const { data: oldCode } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('id', codeId)
        .eq('coach_id', userId)
        .maybeSingle();

      const { data, error } = await supabase
        .from('discount_codes')
        .update(updates)
        .eq('id', codeId)
        .eq('coach_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return badRequest(res, { message: 'A discount code with this code already exists' });
        }
        return internalError(res, { message: 'Failed to update discount code' });
      }

      if (!data) {
        return notFound(res, { message: 'Discount code not found' });
      }

      // Sync to Stripe (best-effort)
      if (oldCode?.stripe_coupon_id && oldCode?.stripe_promo_code_id) {
        const newIds = await updateDiscountCodeInStripe(oldCode, data);
        if (newIds) {
          const { data: updated } = await supabase
            .from('discount_codes')
            .update({ stripe_coupon_id: newIds.stripe_coupon_id, stripe_promo_code_id: newIds.stripe_promo_code_id })
            .eq('id', data.id)
            .select()
            .single();

          return success(res, {
            message: 'Discount code updated',
            data: { code: updated || data },
          });
        }
      }

      success(res, {
        message: 'Discount code updated',
        data: { code: data },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  deleteCode: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { codeId } = req.params;
    const supabase = getSupabaseClient();

    try {
      // Fetch current code (for Stripe sync)
      const { data: code } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('id', codeId)
        .eq('coach_id', userId)
        .maybeSingle();

      if (!code) {
        return notFound(res, { message: 'Discount code not found' });
      }

      // Delete from Stripe (best-effort)
      if (code.stripe_coupon_id) {
        await deleteDiscountCodeInStripe(userId, code.stripe_coupon_id);
      }

      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', codeId)
        .eq('coach_id', userId);

      if (error) {
        return internalError(res, { message: 'Failed to delete discount code' });
      }

      success(res, { message: 'Discount code deleted' });
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

      // Get visible packages (includes inactive ones so they can be shown as unavailable)
      const { data: packages } = await supabase
        .from('coach_packages')
        .select('id, name, description, amount_cents, currency, interval, interval_count, is_active, benefits, free_trial_days, duration_months')
        .eq('coach_id', coachId)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      // Get coach display info
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, profile_picture_url')
        .eq('id', coachId)
        .maybeSingle();

      const { data: company } = await supabase
        .from('coach_company_information')
        .select('company_name, logo_url')
        .eq('coach_id', coachId)
        .maybeSingle();

      success(res, {
        message: 'Public packages retrieved',
        data: {
          packages: packages || [],
          coach: {
            name: company?.company_name || profile?.name || 'Coach',
            logo_url: company?.logo_url || profile?.profile_picture_url || null,
          },
        },
      });
    } catch (error: any) {
      return internalError(res, { message: 'An unexpected error occurred' });
    }
  },

  // ─── Webhook ────────────────────────────────────────────

  webhook: async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
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
      logger.warn({ err: err.message }, 'Webhook signature verification failed');
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
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

    case 'product.updated':
    case 'price.updated':
      await handleProductOrPriceUpdated(event, supabase, stripe);
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

  // If charges_enabled just became true, backfill packages/codes created before Stripe was connected
  if (!wasChargesEnabled && account.charges_enabled && existing?.coach_id) {
    try {
      const result = await backfillStripeForCoach(existing.coach_id);
      logger.info({ coachId: existing.coach_id, result }, 'Backfill triggered on charges_enabled transition');
    } catch (err: any) {
      logger.error({ err: err.message, coachId: existing.coach_id }, 'Backfill failed on charges_enabled transition');
    }
  }
}

async function handleCheckoutCompleted(event: Stripe.Event, supabase: any) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  if (session.mode === 'payment') {
    // One-time payment
    await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      })
      .eq('stripe_checkout_session_id', session.id);

    logger.info({ sessionId: session.id }, 'Payment succeeded via checkout');
  } else if (session.mode === 'subscription') {
    // Subscription created
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
    const customerId = typeof session.customer === 'string' ? session.customer : null;

    if (subscriptionId && metadata.coach_id && metadata.client_id) {
      await supabase
        .from('client_subscriptions')
        .insert({
          coach_id: metadata.coach_id,
          client_id: metadata.client_id,
          package_id: metadata.package_id || null,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId || '',
          status: 'active',
        });

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

      logger.info({ sessionId: session.id, subscriptionId }, 'Subscription created via checkout');
    }
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
    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', paymentIntentId);

    logger.info({ paymentIntentId }, 'Payment refunded');
  }
}

async function handleDisputeCreated(event: Stripe.Event, supabase: any) {
  const dispute = event.data.object as Stripe.Dispute;
  const paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;

  if (paymentIntentId) {
    await supabase
      .from('payments')
      .update({ status: 'disputed' })
      .eq('stripe_payment_intent_id', paymentIntentId);

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
    .select('coach_id, client_id, package_id')
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

    logger.info({ subscriptionId, invoiceId: invoice.id }, 'Subscription invoice paid');
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;

  if (subscriptionId) {
    await supabase
      .from('client_subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subscriptionId);

    logger.info({ subscriptionId, invoiceId: invoice.id }, 'Subscription invoice payment failed');
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;

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
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', subscription.id);

  logger.info({ subscriptionId: subscription.id, status }, 'Subscription updated');
}

async function handleSubscriptionDeleted(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;

  await supabase
    .from('client_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  logger.info({ subscriptionId: subscription.id }, 'Subscription deleted/cancelled');
}

async function handleProductOrPriceUpdated(event: Stripe.Event, supabase: any, stripe: Stripe) {
  // Determine which connected account this event is for
  const stripeAccountId = event.account;
  if (!stripeAccountId) return;

  // Find the coach for this Stripe account
  const { data: coachAccount } = await supabase
    .from('coach_stripe_accounts')
    .select('coach_id')
    .eq('stripe_account_id', stripeAccountId)
    .maybeSingle();

  if (!coachAccount) return;

  if (event.type === 'product.updated') {
    const product = event.data.object as Stripe.Product;

    // Update all packages for this product
    await supabase
      .from('coach_packages')
      .update({
        name: product.name,
        description: product.description || null,
        is_active: product.active,
      })
      .eq('coach_id', coachAccount.coach_id)
      .eq('stripe_product_id', product.id);

    logger.info({ productId: product.id }, 'Product updated via webhook');
  } else if (event.type === 'price.updated') {
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
      .eq('coach_id', coachAccount.coach_id)
      .eq('stripe_price_id', price.id);

    logger.info({ priceId: price.id }, 'Price updated via webhook');
  }
}
