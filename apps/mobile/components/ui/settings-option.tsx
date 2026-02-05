import React from 'react';
import type { JSX } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from 'pressto';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { haptics } from '@/utils/haptics';

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
  onPress?: () => void;
  showChevron?: boolean;
  style?: object;
  chevronSize?: number;
  chevronIcon?: {
    sf: string;
    IconComponent: LucideIcon;
  };
  rightElement?: JSX.Element;
  disabled?: boolean;
}

export function SettingsOption({ icon, title, subtitle, subtitleRight, onPress, showChevron, style, chevronSize, chevronIcon, rightElement, disabled }: SettingsOptionProps) {
  const { colors: themeColors } = useThemePreference();

  const handleOptionPress = () => {
    if (!onPress || disabled) {
      return;
    }

    haptics.medium();
    onPress();
  };

  const defaultChevronIcon = {
    sf: 'chevron.right',
    IconComponent: ChevronRight,
  };

  const chevron = chevronIcon || defaultChevronIcon;

  return (
    <PressableScale
      style={[
        styles.optionRow,
        style,
        disabled && { opacity: 0.4 },
      ]}
      onPress={onPress && !disabled ? handleOptionPress : undefined}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.textContainer}>
        <Text style={[styles.optionTitle, { color: themeColors.text }]}>{title}</Text>
        {subtitle && !subtitleRight && (
          <Text style={[styles.optionSubtitle, { color: themeColors.mutedText }]}>{subtitle}</Text>
        )}
      </View>
      {subtitle && subtitleRight && !rightElement && (
        <View style={styles.subtitleRightContainer}>
          <Text style={[styles.optionSubtitleRight, { color: themeColors.mutedText }]}>{subtitle}</Text>
        </View>
      )}
      {rightElement && (
        <View style={styles.subtitleRightContainer}>
          {rightElement}
        </View>
      )}
      {showChevron && (
        <View style={styles.chevronContainer}>
          <PlatformIcon sf={chevron.sf} IconComponent={chevron.IconComponent} size={chevronSize || iconSizes.extraSmallIcons} color={themeColors.mutedText} />
        </View>
      )}
    </PressableScale>
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
    justifyContent: 'center',
  },
  subtitleRightContainer: {
    marginRight: 4,
    justifyContent: 'center',
  },
  chevronContainer: {
    marginLeft: 4,
  },
  optionTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
  optionSubtitle: {
    ...typography.p6,
    marginTop: 2,
  },
  optionSubtitleRight: {
    ...typography.p3,
  },
});

