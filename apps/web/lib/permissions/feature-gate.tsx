'use client';

import { useEntitlements, type FeatureKey, type AddonKey } from './entitlements-provider';
import { UpgradePrompt } from '@/components/app/upgrade-prompt';

// Mapping of legacy feature keys to new entitlement keys
const FEATURE_TO_ENTITLEMENT: Record<string, FeatureKey> = {
  forms: 'questionnaires',
  flows: 'automations',
  packages: 'payments',
  lyra: 'ai_assistant',
};

// Which addon is required for each feature
const FEATURE_ADDON_MAP: Record<string, AddonKey | undefined> = {
  flows: 'automations',
  packages: 'payments',
  lyra: 'ai_assistant',
  automations: 'automations',
  ai_assistant: 'ai_assistant',
  payments: 'payments',
};

// Feature labels and descriptions
const FEATURE_INFO: Record<string, { label: string; description: string }> = {
  forms: {
    label: 'Forms',
    description: 'Check-in forms and questionnaires',
  },
  flows: {
    label: 'Automations',
    description: 'Automated workflow sequences and onboarding flows',
  },
  packages: {
    label: 'Packages & Payments',
    description: 'Create packages and accept payments from clients',
  },
  lyra: {
    label: 'AI Assistant',
    description: 'Lyra AI-powered workout generation and insights',
  },
  automations: {
    label: 'Automations',
    description: 'Automated workflow sequences and onboarding flows',
  },
  ai_assistant: {
    label: 'AI Assistant',
    description: 'Lyra AI-powered workout generation and insights',
  },
  payments: {
    label: 'Packages & Payments',
    description: 'Create packages and accept payments from clients',
  },
  custom_sections: {
    label: 'Custom Sections',
    description: 'Create custom workout sections',
  },
  custom_exercises: {
    label: 'Custom Exercises',
    description: 'Create your own exercises',
  },
  ai_workout_builder: {
    label: 'AI Workout Builder',
    description: 'Generate workouts using AI',
  },
  questionnaires: {
    label: 'Questionnaires & Check-ins',
    description: 'Assign questionnaires and check-ins to clients',
  },
  habits_metrics: {
    label: 'Habits & Metrics',
    description: 'Track client habits and metrics',
  },
  file_storage: {
    label: 'File Storage',
    description: 'Upload and share files with clients',
  },
  broadcast_messaging: {
    label: 'Broadcast Messaging',
    description: 'Send messages to multiple clients at once',
  },
  ai_todo_list: {
    label: 'AI Todo List',
    description: 'AI-generated task suggestions',
  },
};

type LegacyFeatureKey = 'forms' | 'flows' | 'packages' | 'lyra';

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
  const entitlementKey = FEATURE_TO_ENTITLEMENT[feature] || feature;

  // Show loading state or nothing while checking
  if (isLoading) {
    return null;
  }

  // Check if user has access
  const hasAccess = hasFeature(entitlementKey as FeatureKey);

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

  const entitlementKey = FEATURE_TO_ENTITLEMENT[feature] || feature;
  const hasAccess = hasFeature(entitlementKey as FeatureKey);
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
