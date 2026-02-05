import React, { useState, useEffect } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Switch,
} from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronDown,
  ChevronLeft,
  Fingerprint,
  Languages,
  Moon,
  Palette,
  ScanFace,
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
import { useTranslations, useHaptics, useBiometric } from '@/stores';
import { useAuth } from '@/hooks/useAuth';

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
  const {
    biometricEnabled,
    biometricAvailable,
    biometricType,
    isEnrolled,
    enableBiometric,
    disableBiometric,
  } = useBiometric();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;
  const clearCoachProfile = useCoachProfileStore((state) => state.clearProfile);
  const clearClientProfile = useClientProfileStore((state) => state.clearProfile);

  // Dialog state
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLogoutErrorDialog, setShowLogoutErrorDialog] = useState(false);

  // Debug logging for biometric state
  useEffect(() => {
    console.log('[Preferences] Biometric state:', {
      biometricEnabled,
      biometricAvailable,
      biometricType,
      isEnrolled,
      userId,
    });
  }, [biometricEnabled, biometricAvailable, biometricType, isEnrolled, userId]);

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

  const handleBiometricToggle = async (value: boolean) => {
    console.log('[Preferences] handleBiometricToggle called:', { value, userId });
    if (value) {
      if (!userId) {
        console.log('[Preferences] No userId available, cannot enable biometric');
        return;
      }
      const success = await enableBiometric(userId);
      console.log('[Preferences] enableBiometric result:', success);
    } else {
      await disableBiometric();
      console.log('[Preferences] Biometric disabled');
    }
  };

  const getBiometricLabel = (): string => {
    switch (biometricType) {
      case 'faceid':
        return t('preferences.faceId');
      case 'fingerprint':
        return t('preferences.touchId');
      default:
        return t('preferences.biometric');
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    try {
      await signOut();
      clearCoachProfile();
      clearClientProfile();
      router.replace('/welcome');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutErrorDialog(true);
    }
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
              style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
            />
          </View>
          {/* Biometric toggle row - only show if hardware available */}
          {biometricType !== 'none' && (
            <>
              <Separator />
              <View style={styles.switchRow}>
                <View style={styles.switchRowLeft}>
                  <PlatformIcon
                    sf={biometricType === 'faceid' ? 'faceid' : 'touchid'}
                    IconComponent={biometricType === 'faceid' ? ScanFace : Fingerprint}
                    size={iconSize}
                    color={iconColor}
                  />
                  <Text style={[styles.switchRowTitle, { color: themeColors.text }]}>
                    {getBiometricLabel()}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={!biometricAvailable}
                  trackColor={preset === 'default' ? undefined : { false: themeColors.border, true: themeColors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  ios_backgroundColor={preset === 'default' ? undefined : themeColors.border}
                  style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
                />
              </View>
              {/* Show hint if biometric not enrolled */}
              {!isEnrolled && (
                <Text style={[styles.biometricHint, { color: themeColors.mutedText }]}>
                  {t('preferences.biometricNotEnrolled')}
                </Text>
              )}
            </>
          )}
        </Card>
      </View>

      <Dialog
        visible={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        title={t('auth.logout')}
        message={t('auth.logoutConfirmation')}
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowLogoutDialog(false), variant: 'secondary' },
          { label: t('auth.logout'), onPress: handleConfirmLogout, variant: 'destructive' },
        ]}
      />

      <Dialog
        visible={showLogoutErrorDialog}
        onClose={() => setShowLogoutErrorDialog(false)}
        title={t('auth.logoutError')}
        message={t('auth.logoutErrorMessage')}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowLogoutErrorDialog(false), variant: 'primary' }]}
      />
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
  biometricHint: {
    ...typography.p3,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
});


