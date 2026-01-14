import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemePreference } from '@/stores';

export interface CardProps {
  children: React.ReactNode;
  style?: object;
}

export function Card({ children, style }: CardProps) {
  const { colors: themeColors } = useThemePreference();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: themeColors.surfacePrimary,
          borderColor: themeColors.border,
          shadowColor: themeColors.shadowColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    shadowOffset: {
      width: 0,
      height: 0.2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
});

