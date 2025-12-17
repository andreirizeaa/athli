import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { THEMES, type PresetValue } from '@/constants/theme';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';

export default function PaletteModal() {
  const router = useRouter();
  const { colors: themeColors, preset, setPreset } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const dividerColor = themeColors.border;
  const iconColor = themeColors.text;

  const handleClose = () => {
    router.back();
  };

  const handleSelectPalette = (value: PresetValue) => {
    setPreset(value);
    handleClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>{t('preferences.colorPalette')}</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {THEMES.map((theme, index) => {
          const isSelected = theme.value === preset;
          const accentColor = theme.colors[0];

          return (
            <View key={theme.value}>
              <TouchableOpacity
                style={styles.paletteRow}
                activeOpacity={0.7}
                onPress={() => handleSelectPalette(theme.value)}
              >
                <View style={styles.paletteInfo}>
                  <View
                    style={[
                      styles.paletteCircle,
                      { backgroundColor: accentColor, borderColor: dividerColor },
                    ]}
                  />
                  <View style={styles.paletteTextContainer}>
                    <Text
                      style={[
                        styles.paletteName,
                        { color: themeColors.text },
                      ]}
                    >
                      {theme.name}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <PlatformIcon
                    sf="checkmark"
                    IconComponent={Check}
                    size={iconSizes.modalIcons}
                    color={themeColors.primary}
                  />
                )}
              </TouchableOpacity>

              {index !== THEMES.length - 1 && (
                <View
                  style={[styles.modalDivider, { backgroundColor: dividerColor }]}
                />
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
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  paletteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  paletteCircle: {
    width: 16,
    height: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    marginTop: 3,
  },
  paletteTextContainer: {
    flexShrink: 1,
  },
  paletteName: {
    ...typography.p2,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
  },
});
