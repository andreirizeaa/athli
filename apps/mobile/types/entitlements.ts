/**
 * Coach entitlements types for feature gating
 * Re-exports from shared package for convenience
 */

export type {
  PlanType,
  PlatformSubscriptionStatus,
  AddonKey,
  FeatureKey,
  LegacyFeatureKey,
  CoachEntitlements,
} from '@athli/shared-types/entitlements-schema';

export {
  DEFAULT_ENTITLEMENTS,
  TRIAL_ENTITLEMENTS,
  PRO_ENTITLEMENTS,
  TRIAL_DURATION_DAYS,
  FEATURE_TO_ENTITLEMENT,
  FEATURE_ADDON_MAP,
  FEATURE_INFO,
  calculateIsOnTrial,
  calculateTrialEndDate,
  normalizeFeatureKey,
  checkFeatureAccess,
  checkAddonAccess,
  getFeatureInfo,
} from '@athli/shared-types/entitlements-schema';
