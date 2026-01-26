import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';

type WorkoutSessionPageTitleProps = {
  title: string;
};

export const WorkoutSessionPageTitle = ({
  title,
}: WorkoutSessionPageTitleProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    ...typography.h2,
  },
});
