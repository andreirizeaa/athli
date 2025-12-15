import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck } from 'lucide-react-native';
import { X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';

export default function UnitsModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [selectedUnits, setSelectedUnits] = useState<'metric' | 'imperial'>('metric');

  const dividerColor = themeColors.border;
  const iconColor = themeColors.text;
  const secondaryTextColor = themeColors.mutedText;

  const handleClose = () => {
    router.back();
  };

  const handleSelectUnits = (unitsType: 'metric' | 'imperial') => {
    setSelectedUnits(unitsType);
    // TODO: Implement units change logic
    handleClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: themeColors.surfaceSecondary }]}
          activeOpacity={0.7}
          onPress={handleClose}
        >
          <PlatformIcon sf="xmark" IconComponent={X} size={iconSizes.navigationChevrons} color={iconColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('preferences.units')}</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {(['metric', 'imperial'] as const).map((unitsType) => {
          const isSelected = unitsType === selectedUnits;

          const label = unitsType === 'metric' ? t('preferences.metric') : t('preferences.imperial');
          const subtitle = unitsType === 'metric' ? t('preferences.metricUnits') : t('preferences.imperialUnits');

          return (
            <View key={unitsType}>
              <TouchableOpacity
                style={styles.unitsRow}
                activeOpacity={0.7}
                onPress={() => handleSelectUnits(unitsType)}
              >
                <View style={styles.unitsInfo}>
                  <View style={styles.unitsTextContainer}>
                    <Text
                      style={[styles.unitsLabel, { color: themeColors.text }]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[styles.unitsSubtitle, { color: secondaryTextColor }]}
                    >
                      {subtitle}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <PlatformIcon
                    sf="checkmark.circle.fill"
                    IconComponent={CircleCheck}
                    size={iconSizes.modalIcons}
                    color={iconColor}
                  />
                )}
              </TouchableOpacity>

              {unitsType !== 'imperial' && (
                <View style={[styles.modalDivider, { backgroundColor: dividerColor }]} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  unitsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  unitsTextContainer: {
    flexShrink: 1,
  },
  unitsLabel: {
    ...typography.p2,
    marginTop: 2,
  },
  unitsSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
  },
});
