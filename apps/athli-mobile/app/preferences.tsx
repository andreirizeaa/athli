import React, { useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronLeft,
  CircleCheck,
  Languages,
  Moon,
  Palette,
  Ruler,
  Settings,
  Sun,
} from 'lucide-react-native';
import { typography, iconSizes } from '@/constants/typography';
import { THEMES, type PresetValue } from '@/constants/theme';
import {
  useColorScheme,
  useThemePreference,
  type ColorSchemePreference,
} from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';

import { Card } from '@/components/card';
import { SettingsOption } from '@/components/settings-option';
import { Separator } from '@/components/separator';
import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { LANGUAGES } from '@/constants/languages';

type PlatformIconProps = {
  sf: string;
  IconComponent: LucideIcon;
  size?: number;
  color?: string;
};

const PlatformIcon = ({ sf, IconComponent, size = 24, color = '#000000' }: PlatformIconProps) => {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf as any} tintColor={color} size={size} type="monochrome" />;
  }
  return <IconComponent {...({ size, color } as any)} />;
};

export default function PreferencesScreen() {
  const router = useRouter();
  const {
    preference,
    setPreference,
    preset,
    setPreset,
    primaryColor,
    colors: themeColors,
  } = useThemePreference();
  const { t } = useTranslations();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isUnitsModalVisible, setIsUnitsModalVisible] = useState(false);
  const [isPaletteModalVisible, setIsPaletteModalVisible] = useState(false);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('en');
  const [selectedUnits, setSelectedUnits] = useState<'metric' | 'imperial'>('metric');

  const handleGoBack = () => {
    router.back();
  };

  const handleBackPress = (_event?: GestureResponderEvent) => {
    handleGoBack();
  };

  const handleAppearanceModePress = (mode: ColorSchemePreference) => {
    setPreference(mode);
  };

  const handleSelectPreset = (value: PresetValue) => {
    setPreset(value);
  };

  const handleOpenLanguageModal = () => {
    setIsLanguageModalVisible(true);
  };

  const handleCloseLanguageModal = () => {
    setIsLanguageModalVisible(false);
  };

  const handleOpenUnitsModal = () => {
    setIsUnitsModalVisible(true);
  };

  const handleCloseUnitsModal = () => {
    setIsUnitsModalVisible(false);
  };

  const handleOpenPaletteModal = () => {
    setIsPaletteModalVisible(true);
  };

  const handleClosePaletteModal = () => {
    setIsPaletteModalVisible(false);
  };

  const renderAppearanceModeCard = (label: string, mode: 'light' | 'dark' | 'system') => {
    const isSelected = preference === mode;

    const iconProps = mode === 'light' 
      ? { sf: 'sun.max.fill', IconComponent: Sun }
      : mode === 'dark' 
      ? { sf: 'moon.fill', IconComponent: Moon }
      : { sf: 'gear', IconComponent: Settings };
    
    const iconColor = isSelected ? themeColors.primary : secondaryTextColor;
    const highlightBorderColor =
      themeColors.pageBackground === '#000000' ? '#FFFFFF' : '#000000';

    const handlePress = () => {
      handleAppearanceModePress(mode);
    };

    return (
      <TouchableOpacity
        key={mode}
        style={[
          styles.modeCard,
          {
            backgroundColor: mutedSurfaceColor,
            borderColor: isSelected ? highlightBorderColor : dividerColor,
            borderWidth: 1,
          },
        ]}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.modeCardContent}>
          <PlatformIcon {...iconProps} size={iconSizes.modalIcons} color={iconColor} />
          <Text style={[styles.modeCardLabel, { color: themeColors.text }]}>
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const dividerColor = themeColors.border;
  const secondaryTextColor = themeColors.mutedText;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.pageBackground }]}>
      <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
          activeOpacity={0.7}
          onPress={handleBackPress}
        >
          <PlatformIcon sf="chevron.left" IconComponent={ChevronLeft} size={iconSizes.navigationChevrons} color={iconColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('preferences.title')}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={[styles.content, { backgroundColor: themeColors.pageBackground }]}>
        {/* Appearance */}
        <Card style={{ paddingVertical: 12 }}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('preferences.appearance')}</Text>
          <Text style={[styles.sectionSubtitle, { color: secondaryTextColor }]}>
            {t('preferences.chooseAppearance')}
          </Text>

          <View style={styles.modeRow}>
            {renderAppearanceModeCard(t('preferences.light'), 'light')}
            {renderAppearanceModeCard(t('preferences.dark'), 'dark')}
            {renderAppearanceModeCard(t('preferences.system'), 'system')}
          </View>
        </Card>

        {/* Language, Units, and Color palette */}
        <Card style={{ paddingVertical: 12 }}>
          <SettingsOption
            icon={<PlatformIcon sf="paintpalette" IconComponent={Palette} size={iconSize} color={iconColor} />}
            title={t('preferences.colorPalette')}
            showChevron
            onPress={handleOpenPaletteModal}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="globe" IconComponent={Languages} size={iconSize} color={iconColor} />}
            title={t('preferences.language')}
            showChevron
            onPress={handleOpenLanguageModal}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="ruler" IconComponent={Ruler} size={iconSize} color={iconColor} />}
            title={t('preferences.units')}
            showChevron
            onPress={handleOpenUnitsModal}
          />
        </Card>
      </View>

      <BottomSheetModal
        visible={isLanguageModalVisible}
        onClose={handleCloseLanguageModal}
        title={t('preferences.selectLanguage')}
      >
        {LANGUAGES.map((language, index) => {
          const isSelected = language.code === selectedLanguageCode;

          const handleSelectLanguage = () => {
            setSelectedLanguageCode(language.code);
            handleCloseLanguageModal();
          };

          return (
            <View key={language.code}>
              <TouchableOpacity
                style={styles.languageRow}
                activeOpacity={0.7}
                onPress={handleSelectLanguage}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <View style={styles.languageTextContainer}>
                    <Text
                      style={[
                        styles.languageNativeName,
                        { color: themeColors.text },
                      ]}
                    >
                      {language.nativeName}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <PlatformIcon sf="checkmark.circle.fill" IconComponent={CircleCheck} size={iconSizes.modalIcons} color={iconColor} />
                )}
              </TouchableOpacity>

              {index !== LANGUAGES.length - 1 && (
                <View style={[styles.modalDivider, { backgroundColor: dividerColor }]} />
              )}
            </View>
          );
        })}
      </BottomSheetModal>

      <BottomSheetModal
        visible={isUnitsModalVisible}
        onClose={handleCloseUnitsModal}
        title={t('preferences.units')}
      >
        {(['metric', 'imperial'] as const).map((unitsType) => {
          const isSelected = unitsType === selectedUnits;

          const handleSelectUnits = () => {
            setSelectedUnits(unitsType);
            handleCloseUnitsModal();
          };

          const label = unitsType === 'metric' ? t('preferences.metric') : t('preferences.imperial');
          const subtitle = unitsType === 'metric' ? t('preferences.metricUnits') : t('preferences.imperialUnits');

          return (
            <View key={unitsType}>
              <TouchableOpacity
                style={styles.languageRow}
                activeOpacity={0.7}
                onPress={handleSelectUnits}
              >
                <View style={styles.languageInfo}>
                  <View style={styles.languageTextContainer}>
                    <Text
                      style={[styles.languageNativeName, { color: themeColors.text }]}
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
                  <PlatformIcon sf="checkmark.circle.fill" IconComponent={CircleCheck} size={iconSizes.modalIcons} color={iconColor} />
                )}
              </TouchableOpacity>

              {unitsType !== 'imperial' && (
                <View style={[styles.modalDivider, { backgroundColor: dividerColor }]} />
              )}
            </View>
          );
        })}
      </BottomSheetModal>

      <BottomSheetModal
        visible={isPaletteModalVisible}
        onClose={handleClosePaletteModal}
        title={t('preferences.colorPalette')}
      >
        {THEMES.map((theme, index) => {
          const isSelected = theme.value === preset;
          const accentColor = theme.colors[0];

          const handleSelectPalette = () => {
            handleSelectPreset(theme.value);
            handleClosePaletteModal();
          };

          return (
            <View key={theme.value}>
              <TouchableOpacity
                style={styles.languageRow}
                activeOpacity={0.7}
                onPress={handleSelectPalette}
              >
                <View style={styles.languageInfo}>
                  <View
                    style={[
                      styles.paletteCircle,
                      { backgroundColor: accentColor, borderColor: dividerColor },
                    ]}
                  />
                  <View style={styles.languageTextContainer}>
                    <Text
                      style={[
                        styles.languageNativeName,
                        { color: themeColors.text },
                      ]}
                    >
                      {theme.name}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <PlatformIcon sf="checkmark.circle.fill" IconComponent={CircleCheck} size={iconSizes.modalIcons} color={iconColor} />
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
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerTitle: {
    ...typography.h5,
  },
  headerRightPlaceholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    ...typography.h6,
  },
  sectionSubtitle: {
    ...typography.p5,
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeCardLabel: {
    ...typography.p5,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  languageFlag: {
    ...typography.h6,
    marginRight: 12,
  },
  languageTextContainer: {
    flexShrink: 1,
  },
  languageNativeName: {
    ...typography.p3,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
  },
  unitsSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  paletteCircle: {
    width: 16,
    height: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    marginTop: 3,
  },
});


