import { getStripeClient } from './stripe.service';
import { getSupabaseClient } from './supabase.service';
import { logger } from '../config/logger';

// ─── Helpers ──────────────────────────────────────────────────

export async function getCoachStripeAccountId(coachId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('coach_stripe_accounts')
    .select('stripe_account_id, charges_enabled')
    .eq('coach_id', coachId)
    .maybeSingle();

  if (!data?.stripe_account_id || !data.charges_enabled) return null;
  return data.stripe_account_id;
}

// ─── Package Sync ─────────────────────────────────────────────

export async function syncPackageToStripe(pkg: {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  interval: string;
  interval_count: number | null;
  free_trial_days: number;
  initial_fee_cents: number;
}): Promise<{ stripe_product_id: string; stripe_price_id: string } | null> {
  try {
    const stripeAccountId = await getCoachStripeAccountId(pkg.coach_id);
    if (!stripeAccountId) return null;

    const stripe = getStripeClient();
    const opts = { stripeAccount: stripeAccountId };

    const product = await stripe.products.create({
      name: pkg.name,
      description: pkg.description || undefined,
      metadata: { athli_package_id: pkg.id },
    }, opts);

    const priceData: any = {
      product: product.id,
      currency: pkg.currency,
      unit_amount: pkg.amount_cents,
      metadata: { athli_package_id: pkg.id },
    };

    if (pkg.interval !== 'one_time') {
      priceData.recurring = {
        interval: pkg.interval,
        interval_count: pkg.interval_count || 1,
      };
    }

    const price = await stripe.prices.create(priceData, opts);

    logger.info({ packageId: pkg.id, productId: product.id, priceId: price.id }, 'Package synced to Stripe');
    return { stripe_product_id: product.id, stripe_price_id: price.id };
  } catch (err: any) {
    logger.error({ err: err.message, packageId: pkg.id }, 'Failed to sync package to Stripe');
    return null;
  }
}

export async function updatePackageInStripe(
  oldPkg: { stripe_product_id: string; stripe_price_id: string; amount_cents: number; currency: string; interval: string; interval_count: number | null },
  newPkg: { id: string; coach_id: string; name: string; description: string | null; amount_cents: number; currency: string; interval: string; interval_count: number | null },
): Promise<{ stripe_price_id: string } | null> {
  try {
    const stripeAccountId = await getCoachStripeAccountId(newPkg.coach_id);
    if (!stripeAccountId) return null;

    const stripe = getStripeClient();
    const opts = { stripeAccount: stripeAccountId };

    // Update product name/description
    await stripe.products.update(oldPkg.stripe_product_id, {
      name: newPkg.name,
      description: newPkg.description || '',
    }, opts);

    // If price changed, archive old and create new
    const priceChanged =
      oldPkg.amount_cents !== newPkg.amount_cents ||
      oldPkg.currency !== newPkg.currency ||
      oldPkg.interval !== newPkg.interval ||
      oldPkg.interval_count !== newPkg.interval_count;

    if (priceChanged) {
      await stripe.prices.update(oldPkg.stripe_price_id, { active: false }, opts);

      const priceData: any = {
        product: oldPkg.stripe_product_id,
        currency: newPkg.currency,
        unit_amount: newPkg.amount_cents,
        metadata: { athli_package_id: newPkg.id },
      };

      if (newPkg.interval !== 'one_time') {
        priceData.recurring = {
          interval: newPkg.interval,
          interval_count: newPkg.interval_count || 1,
        };
      }

      const newPrice = await stripe.prices.create(priceData, opts);
      logger.info({ packageId: newPkg.id, newPriceId: newPrice.id }, 'Package price updated in Stripe');
      return { stripe_price_id: newPrice.id };
    }

    logger.info({ packageId: newPkg.id }, 'Package updated in Stripe (no price change)');
    return null;
  } catch (err: any) {
    logger.error({ err: err.message, packageId: newPkg.id }, 'Failed to update package in Stripe');
    return null;
  }
}

export async function archivePackageInStripe(coachId: string, stripeProductId: string): Promise<void> {
  try {
    const stripeAccountId = await getCoachStripeAccountId(coachId);
    if (!stripeAccountId) return;

    const stripe = getStripeClient();
    await stripe.products.update(stripeProductId, { active: false }, { stripeAccount: stripeAccountId });
    logger.info({ stripeProductId }, 'Package archived in Stripe');
  } catch (err: any) {
    logger.error({ err: err.message, stripeProductId }, 'Failed to archive package in Stripe');
  }
}

export async function togglePackageInStripe(coachId: string, stripeProductId: string, active: boolean): Promise<void> {
  try {
    const stripeAccountId = await getCoachStripeAccountId(coachId);
    if (!stripeAccountId) return;

    const stripe = getStripeClient();
    await stripe.products.update(stripeProductId, { active }, { stripeAccount: stripeAccountId });
    logger.info({ stripeProductId, active }, 'Package toggled in Stripe');
  } catch (err: any) {
    logger.error({ err: err.message, stripeProductId }, 'Failed to toggle package in Stripe');
  }
}

// ─── Discount Code Sync ──────────────────────────────────────

export async function syncDiscountCodeToStripe(code: {
  id: string;
  coach_id: string;
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  duration_months: number | null;
  max_redemptions: number | null;
  expires_at: string | null;
}): Promise<{ stripe_coupon_id: string; stripe_promo_code_id: string } | null> {
  try {
    const stripeAccountId = await getCoachStripeAccountId(code.coach_id);
    if (!stripeAccountId) return null;

    const stripe = getStripeClient();
    const opts = { stripeAccount: stripeAccountId };

    const couponData: any = {
      name: code.name,
      metadata: { athli_discount_code_id: code.id },
    };

    if (code.discount_type === 'percentage') {
      couponData.percent_off = code.discount_value;
    } else {
      couponData.amount_off = Math.round(code.discount_value * 100);
      couponData.currency = code.currency;
    }

    if (code.duration_months === null) {
      couponData.duration = 'once';
    } else {
      couponData.duration = 'repeating';
      couponData.duration_in_months = code.duration_months;
    }

    if (code.expires_at) {
      couponData.redeem_by = Math.floor(new Date(code.expires_at).getTime() / 1000);
    }

    if (code.max_redemptions) {
      couponData.max_redemptions = code.max_redemptions;
    }

    const coupon = await stripe.coupons.create(couponData, opts);

    const promoCode = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      code: code.code,
      active: true,
      metadata: { athli_discount_code_id: code.id },
    }, opts);

    logger.info({ codeId: code.id, couponId: coupon.id, promoCodeId: promoCode.id }, 'Discount code synced to Stripe');
    return { stripe_coupon_id: coupon.id, stripe_promo_code_id: promoCode.id };
  } catch (err: any) {
    logger.error({ err: err.message, codeId: code.id }, 'Failed to sync discount code to Stripe');
    return null;
  }
}

export async function updateDiscountCodeInStripe(
  oldCode: {
    stripe_coupon_id: string;
    stripe_promo_code_id: string;
    name: string;
    discount_type: string;
    discount_value: number;
    currency: string;
    duration_months: number | null;
  },
  newCode: {
    id: string;
    coach_id: string;
    name: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    currency: string;
    duration_months: number | null;
    max_redemptions: number | null;
    expires_at: string | null;
    is_active: boolean;
  },
): Promise<{ stripe_coupon_id: string; stripe_promo_code_id: string } | null> {
  try {
    const stripeAccountId = await getCoachStripeAccountId(newCode.coach_id);
    if (!stripeAccountId) return null;

    const stripe = getStripeClient();
    const opts = { stripeAccount: stripeAccountId };

    // Check if core coupon fields changed (requires re-create)
    const coreFieldsChanged =
      oldCode.discount_type !== newCode.discount_type ||
      oldCode.discount_value !== newCode.discount_value ||
      oldCode.currency !== newCode.currency ||
      oldCode.duration_months !== newCode.duration_months;

    if (coreFieldsChanged) {
      // Delete old coupon (auto-deletes promo codes)
      try {
        await stripe.coupons.del(oldCode.stripe_coupon_id, opts);
      } catch { /* coupon may already be deleted */ }

      // Create new coupon + promo code
      return await syncDiscountCodeToStripe(newCode);
    }

    // Only name or is_active changed — update in place
    if (oldCode.name !== newCode.name) {
      await stripe.coupons.update(oldCode.stripe_coupon_id, { name: newCode.name }, opts);
    }

    // Toggle promo code active state
    await stripe.promotionCodes.update(oldCode.stripe_promo_code_id, { active: newCode.is_active }, opts);

    logger.info({ codeId: newCode.id }, 'Discount code updated in Stripe');
    return null; // IDs unchanged
  } catch (err: any) {
    logger.error({ err: err.message, codeId: newCode.id }, 'Failed to update discount code in Stripe');
    return null;
  }
}

export async function deleteDiscountCodeInStripe(coachId: string, stripeCouponId: string): Promise<void> {
  try {
    const stripeAccountId = await getCoachStripeAccountId(coachId);
    if (!stripeAccountId) return;

    const stripe = getStripeClient();
    await stripe.coupons.del(stripeCouponId, { stripeAccount: stripeAccountId });
    logger.info({ stripeCouponId }, 'Discount code deleted from Stripe');
  } catch (err: any) {
    logger.error({ err: err.message, stripeCouponId }, 'Failed to delete discount code from Stripe');
  }
}

// ─── Backfill ─────────────────────────────────────────────────

export async function backfillStripeForCoach(coachId: string): Promise<{
  packages: { synced: number; failed: number };
  codes: { synced: number; failed: number };
}> {
  const supabase = getSupabaseClient();
  const result = { packages: { synced: 0, failed: 0 }, codes: { synced: 0, failed: 0 } };

  // Backfill packages without Stripe IDs
  const { data: packages } = await supabase
    .from('coach_packages')
    .select('*')
    .eq('coach_id', coachId)
    .is('stripe_product_id', null);

  for (const pkg of packages || []) {
    const ids = await syncPackageToStripe(pkg);
    if (ids) {
      await supabase
        .from('coach_packages')
        .update({ stripe_product_id: ids.stripe_product_id, stripe_price_id: ids.stripe_price_id })
        .eq('id', pkg.id);
      result.packages.synced++;
    } else {
      result.packages.failed++;
    }
  }

  // Backfill discount codes without Stripe IDs
  const { data: codes } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('coach_id', coachId)
    .is('stripe_coupon_id', null);

  for (const code of codes || []) {
    const ids = await syncDiscountCodeToStripe(code);
    if (ids) {
      await supabase
        .from('discount_codes')
        .update({ stripe_coupon_id: ids.stripe_coupon_id, stripe_promo_code_id: ids.stripe_promo_code_id })
        .eq('id', code.id);
      result.codes.synced++;
    } else {
      result.codes.failed++;
    }
  }

  logger.info({ coachId, result }, 'Stripe backfill completed');
  return result;
}
