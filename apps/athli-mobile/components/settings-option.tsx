import React from 'react';
import type { JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';

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

export interface SettingsOptionProps {
  icon: JSX.Element;
  title: string;
  subtitle?: string;
  subtitleRight?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  showChevron?: boolean;
}

export function SettingsOption({ icon, title, subtitle, subtitleRight, onPress, showChevron }: SettingsOptionProps) {
  const { colors: themeColors } = useThemePreference();

  const handleOptionPress = (event: GestureResponderEvent) => {
    if (!onPress) {
      return;
    }

    onPress(event);
  };

  return (
    <PressableOpacity
      style={styles.optionRow}
      onPress={onPress ? () => handleOptionPress({} as GestureResponderEvent) : undefined}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.textContainer}>
        <Text style={[styles.optionTitle, { color: themeColors.text }]}>{title}</Text>
        {subtitle && !subtitleRight && (
          <Text style={[styles.optionSubtitle, { color: themeColors.mutedText }]}>{subtitle}</Text>
        )}
      </View>
      {subtitle && subtitleRight && (
        <View style={styles.subtitleRightContainer}>
          <Text style={[styles.optionSubtitleRight, { color: themeColors.mutedText }]}>{subtitle}</Text>
        </View>
      )}
      {showChevron && (
        <View style={styles.chevronContainer}>
          <PlatformIcon sf="chevron.right" IconComponent={ChevronRight} size={iconSizes.navigationChevrons} color={themeColors.mutedText} />
        </View>
      )}
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  textContainer: {
    flex: 1,
  },
  subtitleRightContainer: {
    marginRight: 4,
  },
  chevronContainer: {
    marginLeft: 4,
  },
  optionTitle: {
    ...typography.p1,
  },
  optionSubtitle: {
    ...typography.p6,
    marginTop: 2,
  },
  optionSubtitleRight: {
    ...typography.p6,
  },
});

