import { apiFetch } from '@/api/api-client';
import type { CoachStripeAccount, CoachPackage, DiscountCode } from '@athli/shared-types';

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
  benefits?: string[];
  free_trial_days?: number;
  initial_fee_cents?: number;
  duration_months?: number | null;
  onboarding_id?: string | null;
  sequence_id?: string | null;
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

// --- Discount Codes ---

interface GetCodesResponse {
  data: { codes: DiscountCode[] };
}

interface CodeResponse {
  data: { code: DiscountCode };
}

export interface CreateCodeData {
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency?: string;
  duration_months?: number | null;
  max_redemptions?: number | null;
  expires_at?: string | null;
}

export async function getDiscountCodes(): Promise<DiscountCode[]> {
  const response = await apiFetch<GetCodesResponse>('/payments/codes');
  return response.data.codes;
}

export async function createDiscountCode(data: CreateCodeData): Promise<DiscountCode> {
  const response = await apiFetch<CodeResponse>('/payments/codes', {
    method: 'POST',
    body: data as unknown as Record<string, unknown>,
  });
  return response.data.code;
}

export async function updateDiscountCode(id: string, data: Partial<CreateCodeData & { is_active: boolean }>): Promise<DiscountCode> {
  const response = await apiFetch<CodeResponse>(`/payments/codes/${id}`, {
    method: 'PATCH',
    body: data as unknown as Record<string, unknown>,
  });
  return response.data.code;
}

export async function deleteDiscountCode(id: string): Promise<void> {
  await apiFetch(`/payments/codes/${id}`, { method: 'DELETE' });
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

// --- Public Packages ---

interface GetPublicPackagesResponse {
  data: {
    packages: CoachPackage[];
    coach: { name: string; logo_url: string | null };
  };
}

export async function getPublicPackages(coachCode: string): Promise<GetPublicPackagesResponse['data']> {
  const response = await apiFetch<GetPublicPackagesResponse>(`/payments/public/packages/${coachCode}`, {
    authenticated: false,
  });
  return response.data;
}
