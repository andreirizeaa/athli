'use client';

import { useEntitlements } from './entitlements-provider';
import { UpgradePrompt } from '@/components/app/upgrade-prompt';
import {
  FEATURE_TO_ENTITLEMENT,
  FEATURE_ADDON_MAP,
  FEATURE_INFO,
  normalizeFeatureKey,
} from '@athli/shared-types/entitlements-schema';
import type {
  FeatureKey,
  LegacyFeatureKey,
  AddonKey,
} from '@athli/shared-types/entitlements-schema';

type FeatureGateProps = {
  /** Feature to check access for */
  feature: LegacyFeatureKey | FeatureKey;
  /** Content to render if access is granted */
  children: React.ReactNode;
  /** Custom fallback content (defaults to UpgradePrompt) */
  fallback?: React.ReactNode;
  /** Variant for the default upgrade prompt */
  fallbackVariant?: 'card' | 'inline' | 'banner' | 'overlay';
};

/**
 * FeatureGate component that shows content only if user has access to the feature.
 * Falls back to an upgrade prompt if access is denied.
 */
export function FeatureGate({ feature, children, fallback, fallbackVariant = 'overlay' }: FeatureGateProps) {
  const { hasFeature, isLoading } = useEntitlements();

  // Map legacy feature keys to new entitlement keys
  const entitlementKey = normalizeFeatureKey(feature);

  // Show loading state or nothing while checking
  if (isLoading) {
    return null;
  }

  // Check if user has access
  const hasAccess = hasFeature(entitlementKey);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback or default upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  const info = FEATURE_INFO[feature] || { label: feature, description: '' };
  const requiredAddon = FEATURE_ADDON_MAP[feature];

  return (
    <UpgradePrompt
      feature={info.label}
      description={info.description}
      requiredAddon={requiredAddon}
      variant={fallbackVariant}
    />
  );
}

/**
 * Hook to check if a feature is accessible
 */
export function useFeatureAccess(feature: LegacyFeatureKey | FeatureKey) {
  const { hasFeature, isLoading, isOnTrial } = useEntitlements();

  const entitlementKey = normalizeFeatureKey(feature);
  const hasAccess = hasFeature(entitlementKey);
  const requiredAddon = FEATURE_ADDON_MAP[feature];
  const info = FEATURE_INFO[feature] || { label: feature, description: '' };

  return {
    hasAccess,
    isLoading,
    isOnTrial,
    requiredAddon,
    featureLabel: info.label,
    featureDescription: info.description,
  };
}

/**
 * Hook to check addon access specifically
 */
export function useAddonAccess(addon: AddonKey) {
  const { hasAddon, isLoading, isOnTrial } = useEntitlements();

  return {
    hasAccess: hasAddon(addon),
    isLoading,
    isOnTrial,
  };
}
