import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';

export default function TrainingScreen() {
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.pageBackground]
      : [primarySoftColor, themeColors.background];

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('training.title')}</Text>
      </View>
    </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
});

