import React from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronDown,
  ChevronLeft,
  Languages,
  Moon,
  Palette,
  Sun,
  Vibrate,
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
import { useHaptics } from '@/stores';

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
  const { hapticsEnabled, setHapticsEnabled } = useHaptics();
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

  const handleHapticsToggle = (value: boolean) => {
    setHapticsEnabled(value);
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
          backgroundColor: themeColors.backgroundPrimary,
          paddingTop: insets.top,
          paddingBottom: 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('preferences.title')}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={[styles.content, { backgroundColor: themeColors.backgroundPrimary }]}>
        {/* Theme, Color Palette, Language, Units */}
        <Card style={{ paddingVertical: 12 }}>
          {/* Theme row with dropdown */}
          <DropdownMenuWrapper options={themeOptions}>
            <SettingsOption
              icon={
                <PlatformIcon
                  sf={preference === 'light' ? 'sun.max' : preference === 'dark' ? 'moon' : 'circle.lefthalf.filled'}
                  IconComponent={preference === 'light' ? Sun : Moon}
                  size={iconSize}
                  color={iconColor}
                />
              }
              title={t('preferences.appearance')}
              subtitle={getThemeLabel()}
              subtitleRight
              showChevron
              chevronSize={14}
              chevronIcon={{ sf: 'chevron.down', IconComponent: ChevronDown }}
              onPress={() => {}}
            />
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
          {/* Haptics toggle row */}
          <View style={styles.switchRow}>
            <View style={styles.switchRowLeft}>
              <PlatformIcon sf="waveform" IconComponent={Vibrate} size={iconSize} color={iconColor} />
              <Text style={[styles.switchRowTitle, { color: themeColors.text }]}>
                {t('preferences.haptics')}
              </Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={handleHapticsToggle}
              trackColor={preset === 'default' ? undefined : { false: themeColors.border, true: themeColors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              ios_backgroundColor={preset === 'default' ? undefined : themeColors.border}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchRowTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
});


