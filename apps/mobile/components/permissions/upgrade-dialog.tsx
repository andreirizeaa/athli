import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { Dialog } from '@/components/ui/dialog';
import { useTranslations, useColorScheme } from '@/stores';

type TargetPlan = 'pro' | 'max' | 'increase' | null;

// Map feature/menu keys to screenshot folder names
export const FEATURE_SCREENSHOTS: Record<string, { light: any; dark: any }> = {
  exercise_history: {
    light: require('@/assets/app-screenshots/exercise-history/light.png'),
    dark: require('@/assets/app-screenshots/exercise-history/dark.png'),
  },
  progress: {
    light: require('@/assets/app-screenshots/exercise-history/light.png'),
    dark: require('@/assets/app-screenshots/exercise-history/dark.png'),
  },
  habits: {
    light: require('@/assets/app-screenshots/habits/light.png'),
    dark: require('@/assets/app-screenshots/habits/dark.png'),
  },
  metrics: {
    light: require('@/assets/app-screenshots/metrics/light.png'),
    dark: require('@/assets/app-screenshots/metrics/dark.png'),
  },
  photo_tracking: {
    light: require('@/assets/app-screenshots/progress-photos/light.png'),
    dark: require('@/assets/app-screenshots/progress-photos/dark.png'),
  },
  photos: {
    light: require('@/assets/app-screenshots/progress-photos/light.png'),
    dark: require('@/assets/app-screenshots/progress-photos/dark.png'),
  },
};

// Preload all screenshots on app startup using expo-asset for local bundled images
export async function preloadUpgradeScreenshots() {
  try {
    const allImages = Object.values(FEATURE_SCREENSHOTS).flatMap(s => [s.light, s.dark]);
    await Asset.loadAsync(allImages);
  } catch (error) {
    console.warn('[UpgradeDialog] Failed to preload screenshots:', error);
  }
}

interface UpgradeDialogProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  /** Feature key for showing relevant screenshot */
  featureKey?: string;
  /** Target plan: 'pro', 'max', 'increase' (for client limit), or null for generic */
  targetPlan?: TargetPlan;
}

/**
 * Simple dialog shown when a user tries to access a feature that requires an upgrade.
 */
export function UpgradeDialog({ visible, onClose, feature, featureKey, targetPlan = 'pro' }: UpgradeDialogProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleUpgradeNow = () => {
    onClose();
    router.push('/settings/billing');
  };

  // Determine title based on target plan
  let title: string;
  if (targetPlan === 'max') {
    title = 'Upgrade to Max';
  } else if (targetPlan === 'pro') {
    title = 'Upgrade to Pro';
  } else if (targetPlan === 'increase') {
    title = 'Increase Client Limit';
  } else {
    title = t('upgrade.dialogTitle') || 'Upgrade Required';
  }

  // Determine message based on target plan and feature
  let message: string;
  if (targetPlan === 'increase') {
    message = feature || 'You\'ve reached your client limit. Upgrade your plan or increase your allowance to add more clients.';
  } else if (featureKey) {
    // Use feature-specific translation if available
    const featureMessage = t(`upgrade.features.${featureKey}` as any);
    message = featureMessage || t('upgrade.dialogMessage') || 'This feature requires a paid plan. Please upgrade to access it.';
  } else if (feature) {
    message = (t('upgrade.dialogMessageWithFeature') || `Upgrade your plan to access ${feature}.`).replace('{feature}', feature);
  } else {
    message = t('upgrade.dialogMessage') || 'This feature requires a paid plan. Please upgrade to access it.';
  }

  // Get screenshot for feature if available
  const screenshots = featureKey ? FEATURE_SCREENSHOTS[featureKey] : null;
  const screenshotSource = screenshots ? (isDark ? screenshots.dark : screenshots.light) : null;

  // Calculate screenshot dimensions (maintain aspect ratio)
  const screenWidth = Dimensions.get('window').width;
  const imageWidth = screenWidth - 56; // Dialog padding only
  const imageHeight = imageWidth * 0.65; // Slightly taller aspect ratio

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      showCloseIcon={false}
      buttonLayout="vertical"
      buttons={[
        {
          label: t('upgrade.maybeLater') || 'Maybe Later',
          onPress: onClose,
          variant: 'secondary',
        },
        {
          label: t('upgrade.upgradeNow') || 'Upgrade Now',
          onPress: handleUpgradeNow,
          variant: 'primary',
        },
      ]}
    >
      {screenshotSource && (
        <View style={styles.screenshotContainer}>
          <Image
            source={screenshotSource}
            style={[styles.screenshot, { width: imageWidth, height: imageHeight }]}
            contentFit="contain"
          />
        </View>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  screenshotContainer: {
    marginBottom: 16,
  },
  screenshot: {
    borderRadius: 12,
    alignSelf: 'center',
  },
});
