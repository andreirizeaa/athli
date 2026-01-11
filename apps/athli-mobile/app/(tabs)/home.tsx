import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

export default function HomeScreen() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('home.title')}</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
});
