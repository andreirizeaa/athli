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

  const mutedSurfaceColor = themeColors.iconButton;
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
        {/* Appearance */}
        <Card style={{ paddingVertical: 12 }}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('preferences.appearance')}</Text>
          <Text style={[styles.sectionSubtitle, { color: secondaryTextColor }]}>
            {t('preferences.chooseAppearance')}
          </Text>

          <View style={[styles.buttonGroup, { backgroundColor: mutedSurfaceColor }]}>
            <TouchableOpacity
              style={[
                styles.buttonGroupButton,
                preference === 'light' && [
                  styles.buttonGroupButtonActive,
                  { backgroundColor: themeColors.background },
                ],
              ]}
              onPress={() => handleAppearanceModePress('light')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonGroupText,
                  { color: preference === 'light' ? themeColors.text : themeColors.mutedText },
                  preference === 'light' && styles.buttonGroupTextActive,
                ]}
              >
                {t('preferences.light')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buttonGroupButton,
                preference === 'dark' && [
                  styles.buttonGroupButtonActive,
                  { backgroundColor: themeColors.background },
                ],
              ]}
              onPress={() => handleAppearanceModePress('dark')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonGroupText,
                  { color: preference === 'dark' ? themeColors.text : themeColors.mutedText },
                  preference === 'dark' && styles.buttonGroupTextActive,
                ]}
              >
                {t('preferences.dark')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buttonGroupButton,
                preference === 'system' && [
                  styles.buttonGroupButtonActive,
                  { backgroundColor: themeColors.background },
                ],
              ]}
              onPress={() => handleAppearanceModePress('system')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonGroupText,
                  { color: preference === 'system' ? themeColors.text : themeColors.mutedText },
                  preference === 'system' && styles.buttonGroupTextActive,
                ]}
              >
                {t('preferences.system')}
              </Text>
            </TouchableOpacity>
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
  buttonGroup: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 4,
    gap: 4,
    marginTop: 12,
  },
  buttonGroupButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGroupButtonActive: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonGroupText: {
    ...typography.p2,
    fontWeight: '600',
  },
  buttonGroupTextActive: {
    fontWeight: '700',
  },
});


