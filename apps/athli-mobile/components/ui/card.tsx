import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useThemePreference, useColorScheme } from '@/stores';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'chart' | 'form' | 'profile' | 'photo' | 'stat' | 'options';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();

  const isForm = variant === 'form';
  const isProfile = variant === 'profile';
  const isPhoto = variant === 'photo';
  const isStat = variant === 'stat';
  const isOptions = variant === 'options';

  return (
    <View
      style={[
        styles.card,
        variant === 'chart' && styles.chartLayout,
        isForm && styles.formLayout,
        isProfile && styles.profileLayout,
        isPhoto && styles.photoLayout,
        isStat && styles.statLayout,
        isOptions && styles.optionsLayout,
        {
          backgroundColor: isForm || isOptions ? 'transparent' : themeColors.cardPrimary,
          borderColor: themeColors.cardSecondary,
          shadowColor: colorScheme === 'light' ? '#000' : '#fff',
          ...((isForm || isPhoto || isOptions) && {
            shadowOpacity: 0,
            elevation: 0,
          }),
          ...(isOptions && {
            backgroundColor: themeColors.surfacePrimary,
            borderWidth: 0,
          }),
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  chartLayout: {
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    alignItems: 'center',
  },
  formLayout: {
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 12,
    marginBottom: 0,
  },
  profileLayout: {
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  photoLayout: {
    borderRadius: 12,
    padding: 0,
    marginBottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLayout: {
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  optionsLayout: {
    borderRadius: 16,
    padding: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
});

