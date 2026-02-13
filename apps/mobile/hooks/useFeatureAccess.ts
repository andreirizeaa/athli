import { useCoachEntitlementsStore } from '@/stores/useCoachEntitlementsStore';
import {
  FEATURE_INFO,
  FEATURE_ADDON_MAP,
  normalizeFeatureKey,
} from '@athli/shared-types/entitlements-schema';
import type {
  FeatureKey,
  LegacyFeatureKey,
  AddonKey,
} from '@athli/shared-types/entitlements-schema';

/**
 * Hook to check if a feature is accessible
 */
export function useFeatureAccess(feature: LegacyFeatureKey | FeatureKey) {
  const hasFeature = useCoachEntitlementsStore((state) => state.hasFeature);
  const isLoading = useCoachEntitlementsStore((state) => state.isLoading);
  const isOnTrial = useCoachEntitlementsStore((state) => state.isOnTrial);

  const hasAccess = hasFeature(feature);
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
  const hasAddon = useCoachEntitlementsStore((state) => state.hasAddon);
  const isLoading = useCoachEntitlementsStore((state) => state.isLoading);
  const isOnTrial = useCoachEntitlementsStore((state) => state.isOnTrial);

  return {
    hasAccess: hasAddon(addon),
    isLoading,
    isOnTrial,
  };
}
