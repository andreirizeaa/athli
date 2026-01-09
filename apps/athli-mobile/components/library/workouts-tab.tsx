import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';

export const WorkoutsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: themeColors.text }]}>
        {t('library.tabs.workouts')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.h4,
  },
});
