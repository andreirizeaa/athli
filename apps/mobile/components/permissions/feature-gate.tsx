import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCoachEntitlementsStore } from '@/stores/useCoachEntitlementsStore';
import { useThemePreference } from '@/stores';
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

interface UpgradePromptProps {
  feature: string;
  description: string;
  requiredAddon?: AddonKey;
}

function DefaultUpgradePrompt({ feature, description }: UpgradePromptProps) {
  const { colors } = useThemePreference();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Upgrade to Access {feature}
      </Text>
      <Text style={[styles.description, { color: colors.mutedText }]}>
        {description}
      </Text>
      <Text style={[styles.upgradeText, { color: colors.primary }]}>
        Upgrade your plan in Settings to unlock this feature.
      </Text>
    </View>
  );
}

interface FeatureGateProps {
  feature: LegacyFeatureKey | FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * FeatureGate component that shows content only if user has access to the feature.
 * Falls back to an upgrade prompt if access is denied.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const hasFeature = useCoachEntitlementsStore((state) => state.hasFeature);
  const isLoading = useCoachEntitlementsStore((state) => state.isLoading);

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Check if user has access (hasFeature handles legacy key mapping internally)
  const hasAccess = hasFeature(feature);

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
    <DefaultUpgradePrompt
      feature={info.label}
      description={info.description}
      requiredAddon={requiredAddon}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

// Re-export constants for convenience
export { FEATURE_INFO, FEATURE_ADDON_MAP, FEATURE_TO_ENTITLEMENT };
