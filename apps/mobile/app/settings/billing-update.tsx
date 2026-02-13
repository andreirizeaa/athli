import React from 'react';
import { StyleSheet, Text, View, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Scale } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography, iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';

export default function BillingUpdateScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;

  const iconColor = themeColors.text;
  const iconSize = iconSizes.tabBarIcons;

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleComparePlans = () => {
    haptics.medium();
    const marketingUrl = process.env.EXPO_PUBLIC_MARKETING_APP_URL;
    if (marketingUrl) {
      Linking.openURL(marketingUrl).catch((err) => {
        console.error('Failed to open marketing URL:', err);
      });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Compare Plans Card */}
          <PressableScale onPress={handleComparePlans}>
            <Card>
              <View style={styles.cardRow}>
                <View style={styles.optionIconContainer}>
                  <PlatformIcon
                    sf="doc.on.doc"
                    IconComponent={Scale}
                    size={iconSize}
                    color={iconColor}
                  />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                    {t('settings.billing.comparePlans')}
                  </Text>
                </View>
                <PlatformIcon
                  sf="chevron.right"
                  IconComponent={ChevronRight}
                  size={iconSizes.extraSmallIcons}
                  color={themeColors.mutedText}
                />
              </View>
            </Card>
          </PressableScale>
        </View>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('settings.billing.updatePlan')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
});
