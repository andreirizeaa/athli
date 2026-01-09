import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function ProgressScreen() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('progress.title')}</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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

