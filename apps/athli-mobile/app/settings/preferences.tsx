import React from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronDown,
  ChevronLeft,
  Languages,
  LogOut,
  Moon,
  Palette,
  Ruler,
  Sun,
} from 'lucide-react-native';
import { typography, iconSizes } from '@/constants/typography';
import { THEMES } from '@/constants/theme';
import {
  useThemePreference,
  type ColorSchemePreference,
  useCoachProfileStore,
  useClientProfileStore,
} from '@/stores';
import { useTranslations } from '@/stores';
import { useUnits, type UnitsPreference } from '@/stores';

import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { signOut } from '@/services/auth/supabase-auth';

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
    colors: themeColors,
  } = useThemePreference();
  const { t, locale } = useTranslations();
  const { units, setUnits } = useUnits();
  const insets = useSafeAreaInsets();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;
  const clearCoachProfile = useCoachProfileStore((state) => state.clearProfile);
  const clearClientProfile = useClientProfileStore((state) => state.clearProfile);

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
    router.push('/modals/settings/language-modal');
  };

  const handleOpenPaletteModal = () => {
    router.push('/modals/settings/palette-modal');
  };

  const handleUnitsChange = (newUnits: UnitsPreference) => {
    setUnits(newUnits);
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirmation'),
      [
        {
          text: t('general.cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              clearCoachProfile();
              clearClientProfile();
              router.replace('/welcome');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(
                t('auth.logoutError'),
                t('auth.logoutErrorMessage'),
                [{ text: t('general.ok') }]
              );
            }
          },
        },
      ]
    );
  };

  // Get the display label for current theme preference
  const getThemeLabel = (): string => {
    switch (preference) {
      case 'light':
        return t('preferences.light');
      case 'dark':
        return t('preferences.dark');
      case 'system':
        return t('preferences.system');
      default:
        return t('preferences.system');
    }
  };

  // Get the display label for current color palette
  const getPaletteLabel = (): string => {
    const theme = THEMES.find((th) => th.value === preset);
    return theme?.name ?? 'Default';
  };

  // Get the display label for current language
  const getLanguageLabel = (): string => {
    const languageMap: Record<string, string> = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      ro: 'Română',
    };
    return languageMap[locale] ?? 'English';
  };

  // Get the display label for units
  const getUnitsLabel = (): string => {
    return units === 'metric' ? t('preferences.metric') : t('preferences.imperial');
  };

  // Theme dropdown options
  const themeOptions: DropdownMenuOption[] = [
    {
      label: t('preferences.light'),
      icon: { sf: 'sun.max', IconComponent: Sun },
      onPress: () => handleAppearanceModePress('light'),
    },
    {
      label: t('preferences.dark'),
      icon: { sf: 'moon', IconComponent: Moon },
      onPress: () => handleAppearanceModePress('dark'),
    },
    {
      label: t('preferences.system'),
      icon: { sf: 'circle.lefthalf.filled', IconComponent: Sun },
      onPress: () => handleAppearanceModePress('system'),
    },
  ];

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
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('preferences.title')}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={[styles.content, { backgroundColor: themeColors.pageBackground }]}>
        {/* Account Section */}
        <Card style={{ paddingVertical: 12, marginBottom: 16 }}>
          <SettingsOption
            icon={<PlatformIcon sf="rectangle.portrait.and.arrow.right" IconComponent={LogOut} size={iconSize} color={iconColor} />}
            title={t('auth.logout')}
            showChevron={false}
            onPress={handleLogout}
          />
        </Card>

        {/* Theme, Color Palette, Language, Units */}
        <Card style={{ paddingVertical: 12 }}>
          {/* Theme row with dropdown */}
          <DropdownMenuWrapper options={themeOptions}>
            <View style={styles.themeRow}>
              <View style={styles.themeRowLeft}>
                <View style={styles.themeIconContainer}>
                  <PlatformIcon
                    sf={preference === 'light' ? 'sun.max' : preference === 'dark' ? 'moon' : 'circle.lefthalf.filled'}
                    IconComponent={preference === 'light' ? Sun : Moon}
                    size={iconSize}
                    color={iconColor}
                  />
                </View>
                <Text style={[styles.themeRowTitle, { color: themeColors.text }]}>
                  {t('preferences.appearance')}
                </Text>
              </View>
              <View style={styles.themeRowRight}>
                <Text style={[styles.themeValue, { color: themeColors.mutedText }]}>
                  {getThemeLabel()}
                </Text>
                <PlatformIcon
                  sf="chevron.down"
                  IconComponent={ChevronDown}
                  size={14}
                  color={themeColors.mutedText}
                />
              </View>
            </View>
          </DropdownMenuWrapper>
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="paintpalette" IconComponent={Palette} size={iconSize} color={iconColor} />}
            title={t('preferences.colorPalette')}
            subtitle={getPaletteLabel()}
            subtitleRight
            showChevron
            chevronSize={14}
            onPress={handleOpenPaletteModal}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="globe" IconComponent={Languages} size={iconSize} color={iconColor} />}
            title={t('preferences.language')}
            subtitle={getLanguageLabel()}
            subtitleRight
            showChevron
            chevronSize={14}
            onPress={handleOpenLanguageModal}
          />
          <Separator />
          {/* Units row with dropdown */}
          <DropdownMenuWrapper options={[
            {
              label: t('preferences.metric'),
              icon: { sf: 'ruler', IconComponent: Ruler },
              onPress: () => handleUnitsChange('metric'),
            },
            {
              label: t('preferences.imperial'),
              icon: { sf: 'ruler', IconComponent: Ruler },
              onPress: () => handleUnitsChange('imperial'),
            },
          ]}>
            <View style={styles.themeRow}>
              <View style={styles.themeRowLeft}>
                <View style={styles.themeIconContainer}>
                  <PlatformIcon sf="ruler" IconComponent={Ruler} size={iconSize} color={iconColor} />
                </View>
                <Text style={[styles.themeRowTitle, { color: themeColors.text }]}>
                  {t('preferences.units')}
                </Text>
              </View>
              <View style={styles.themeRowRight}>
                <Text style={[styles.themeValue, { color: themeColors.mutedText }]}>
                  {getUnitsLabel()}
                </Text>
                <PlatformIcon
                  sf="chevron.down"
                  IconComponent={ChevronDown}
                  size={14}
                  color={themeColors.mutedText}
                />
              </View>
            </View>
          </DropdownMenuWrapper>
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
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  themeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  themeRowTitle: {
    ...typography.p1,
  },
  themeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  themeValue: {
    ...typography.p2,
  },
});


