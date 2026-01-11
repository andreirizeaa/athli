import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image, type ImageSource } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

interface EmptyStateProps {
  image: ImageSource;
  message: string;
  style?: ViewStyle;
}

export const EmptyState = ({ image, message, style }: EmptyStateProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View style={[styles.container, style]}>
      <Image
        source={image}
        style={styles.image}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
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
  image: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  message: {
    ...typography.h5,
    textAlign: 'center',
    marginTop: -56
  },
});

