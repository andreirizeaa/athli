import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemePreference } from '@/contexts/useColorScheme';

export interface SeparatorProps {
  style?: object;
}

export function Separator({ style }: SeparatorProps) {
  const { colors: themeColors } = useThemePreference();

  return <View style={[styles.separator, { backgroundColor: themeColors.border }, style]} />;
}

const styles = StyleSheet.create({
  separator: {
    height: 1,
    marginVertical: 4,
  },
});

