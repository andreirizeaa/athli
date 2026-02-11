import { apiFetch } from '@/api/api-client';
import { createClient } from '@/supabase/client';
import type { CoachStripeAccount, CoachPackage, Coupon, CoachPaymentDashboard, PaymentActivityRow, PackagePaymentStats, PackageCouponRedemption } from '@athli/shared-types';

interface GetStripeStatusResponse {
  data: {
    stripeAccount: CoachStripeAccount | null;
  };
}

interface GetPackagesResponse {
  data: {
    packages: CoachPackage[];
  };
}

interface OnboardResponse {
  data: {
    url: string;
  };
}

interface DashboardLinkResponse {
  data: {
    url: string;
  };
}

export async function getStripeConnectionStatus(): Promise<CoachStripeAccount | null> {
  const response = await apiFetch<GetStripeStatusResponse>('/payments/connect/status');
  return response.data.stripeAccount;
}

export async function startStripeOnboarding(): Promise<string> {
  const response = await apiFetch<OnboardResponse>('/payments/connect/onboard', {
    method: 'POST',
    body: {},
  });
  return response.data.url;
}

export async function getStripeDashboardLink(): Promise<string> {
  const response = await apiFetch<DashboardLinkResponse>('/payments/connect/dashboard-link', {
    method: 'POST',
    body: {},
  });
  return response.data.url;
}

export async function disconnectStripe(): Promise<void> {
  await apiFetch('/payments/connect/disconnect', { method: 'DELETE' });
}

export async function getCoachPackages(): Promise<CoachPackage[]> {
  const response = await apiFetch<GetPackagesResponse>('/payments/packages');
  return response.data.packages;
}

export async function syncPackages(): Promise<CoachPackage[]> {
  const response = await apiFetch<GetPackagesResponse>('/payments/packages/sync', {
    method: 'POST',
    body: {},
  });
  return response.data.packages;
}

// --- Package Stats ---

interface GetAllPackageStatsResponse {
  data: { stats: Record<string, PackagePaymentStats> };
}

export async function getAllPackageStats(): Promise<Record<string, PackagePaymentStats>> {
  const response = await apiFetch<GetAllPackageStatsResponse>('/payments/packages/stats');
  return response.data.stats;
}

// --- Package Coupon Redemptions ---

interface GetPackageCouponRedemptionsResponse {
  data: { redemptions: PackageCouponRedemption[] };
}

export async function getPackageCouponRedemptions(packageId: string): Promise<PackageCouponRedemption[]> {
  const response = await apiFetch<GetPackageCouponRedemptionsResponse>(`/payments/packages/${packageId}/redemptions`);
  return response.data.redemptions;
}

// --- Package CRUD ---

interface PackageResponse {
  data: { package: CoachPackage };
}

export interface CreatePackageData {
  name: string;
  description?: string;
  amount_cents: number;
  currency: string;
  interval: string;
  interval_count?: number;
  features?: string[];
  free_trial_days?: number;
  initial_fee_cents?: number;
  onboarding_id?: string | null;
  sequence_id?: string | null;
  image_url?: string | null;
}

export async function createPackage(data: CreatePackageData): Promise<CoachPackage> {
  const response = await apiFetch<PackageResponse>('/payments/packages', {
    method: 'POST',
    body: data as unknown as Record<string, unknown>,
  });
  return response.data.package;
}

export async function updatePackage(id: string, data: Partial<CreatePackageData>): Promise<CoachPackage> {
  const response = await apiFetch<PackageResponse>(`/payments/packages/${id}`, {
    method: 'PATCH',
    body: data as unknown as Record<string, unknown>,
  });
  return response.data.package;
}

export async function deletePackage(id: string): Promise<void> {
  await apiFetch(`/payments/packages/${id}`, { method: 'DELETE' });
}

export async function togglePackage(id: string, field: 'is_active' | 'is_visible', value: boolean): Promise<CoachPackage> {
  const response = await apiFetch<PackageResponse>(`/payments/packages/${id}/toggle`, {
    method: 'PATCH',
    body: { field, value },
  });
  return response.data.package;
}

// --- Coupons ---

interface GetCouponsResponse {
  data: { coupons: Coupon[] };
}

interface CouponResponse {
  data: { coupon: Coupon };
}

export interface CreateCouponData {
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency?: string;
  duration_months?: number | null;
  max_redemptions?: number | null;
  expires_at?: string | null;
}

export async function getCoupons(): Promise<Coupon[]> {
  const response = await apiFetch<GetCouponsResponse>('/payments/coupons');
  return response.data.coupons;
}

export async function createCoupon(data: CreateCouponData): Promise<Coupon> {
  const response = await apiFetch<CouponResponse>('/payments/coupons', {
    method: 'POST',
    body: data as unknown as Record<string, unknown>,
  });
  return response.data.coupon;
}

export async function updateCoupon(id: string, data: Partial<CreateCouponData & { is_active: boolean }>): Promise<Coupon> {
  const response = await apiFetch<CouponResponse>(`/payments/coupons/${id}`, {
    method: 'PATCH',
    body: data as unknown as Record<string, unknown>,
  });
  return response.data.coupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  await apiFetch(`/payments/coupons/${id}`, { method: 'DELETE' });
}

// --- Coach Onboardings ---

interface GetOnboardingsResponse {
  data: { onboardings: { id: string; name: string }[] };
}

export async function getCoachOnboardings(): Promise<{ id: string; name: string }[]> {
  const response = await apiFetch<GetOnboardingsResponse>('/payments/onboardings');
  return response.data.onboardings;
}

// --- Coach Sequences ---

interface GetSequencesResponse {
  data: { sequences: { id: string; name: string }[] };
}

export async function getCoachSequences(): Promise<{ id: string; name: string }[]> {
  const response = await apiFetch<GetSequencesResponse>('/payments/sequences');
  return response.data.sequences;
}

// --- Summary Dashboard ---

interface GetSummaryAnalyticsResponse {
  data: { analytics: CoachPaymentDashboard };
}

interface GetSummaryActivityResponse {
  data: { activity: PaymentActivityRow[] };
}

export async function getSummaryAnalytics(): Promise<CoachPaymentDashboard> {
  const response = await apiFetch<GetSummaryAnalyticsResponse>('/payments/summary/analytics');
  return response.data.analytics;
}

export async function getSummaryActivity(): Promise<PaymentActivityRow[]> {
  const response = await apiFetch<GetSummaryActivityResponse>('/payments/summary/activity');
  return response.data.activity;
}

// --- Package Photo Upload ---

export async function uploadPackagePhoto(file: File, coachId: string, packageId: string): Promise<string> {
  const supabase = createClient();

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${packageId}-${Date.now()}.${fileExt}`;
  const filePath = `${coachId}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('package_photos')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  if (!uploadData) {
    throw new Error('Upload succeeded but no data returned');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('package_photos')
    .getPublicUrl(filePath);

  return publicUrl;
}

// --- Public Packages ---

interface PublicCompany {
  company_name: string;
  website: string | null;
  linkedin: string | null;
  location: string | null;
  specialities: string[];
  logo_url: string | null;
}

interface GetPublicPackagesResponse {
  data: {
    stripe_enabled: boolean;
    packages: CoachPackage[];
    coach: { name: string; logo_url: string | null } | null;
    company: PublicCompany | null;
  };
}

export async function getPublicPackages(coachCode: string): Promise<GetPublicPackagesResponse['data']> {
  const response = await apiFetch<GetPublicPackagesResponse>(`/payments/public/packages/${coachCode}`, {
    authenticated: false,
  });
  return response.data;
}

// --- Client Checkout ---

interface CreateCheckoutSessionResponse {
  data: { url: string };
}

export async function createCheckoutSession(
  packageId: string,
  coachCode: string,
  clientId: string,
  email?: string
): Promise<string> {
  const response = await apiFetch<CreateCheckoutSessionResponse>('/payments/public/checkout/session', {
    method: 'POST',
    body: { packageId, coachCode, clientId, email },
    authenticated: false,
  });
  return response.data.url;
}
