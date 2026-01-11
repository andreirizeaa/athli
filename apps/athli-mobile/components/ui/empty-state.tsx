import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

interface EmptyStateProps {
  message: string;
  style?: ViewStyle;
}

export const EmptyState = ({ message, style }: EmptyStateProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.message, { color: themeColors.mutedText }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  message: {
    ...typography.h5,
    textAlign: 'center',
  },
});
