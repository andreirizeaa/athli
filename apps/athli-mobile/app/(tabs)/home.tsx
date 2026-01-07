import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';

export default function HomeScreen() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('home.title')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
});
