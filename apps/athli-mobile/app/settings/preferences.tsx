import React from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronLeft,
  Languages,
  Moon,
  Palette,
  Ruler,
  Settings,
  Sun,
} from 'lucide-react-native';
import { typography, iconSizes } from '@/constants/typography';
import {
  useThemePreference,
  type ColorSchemePreference,
} from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';

import { Card } from '@/components/card';
import { IconButton } from '@/components/icon-button';
import { SettingsOption } from '@/components/settings-option';
import { Separator } from '@/components/separator';

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
    colors: themeColors,
  } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const dividerColor = themeColors.border;
  const secondaryTextColor = themeColors.mutedText;

  const handleGoBack = () => {
    router.back();
  };

  const handleBackPress = (_event?: GestureResponderEvent) => {
    handleGoBack();
  };

  const handleAppearanceModePress = (mode: ColorSchemePreference) => {
    setPreference(mode);
  };


  const handleOpenLanguageModal = () => {
    router.push('/language-modal');
  };

  const handleOpenUnitsModal = () => {
    router.push('/units-modal');
  };

  const handleOpenPaletteModal = () => {
    router.push('/palette-modal');
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

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: themeColors.pageBackground,
          paddingTop: insets.top,
          paddingBottom: 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
        <IconButton
          icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
          backgroundColor={mutedSurfaceColor}
        />
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
    </View>
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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
});


