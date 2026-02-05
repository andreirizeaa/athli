import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { haptics } from '@/utils/haptics';

export const RATING_COLORS = [
  '#EF4444', // 1 - red
  '#F97316', // 2 - orange
  '#FBBF24', // 3 - amber/yellow
  '#84CC16', // 4 - lime
  '#22C55E', // 5 - green
];

type RatingButtonProps = {
  value: number;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  colorIndex: number;
};

export const RatingButton = ({
  value,
  label,
  isSelected,
  onPress,
  colorIndex,
}: RatingButtonProps) => {
  const { colors: themeColors } = useThemePreference();
  const ratingColor = RATING_COLORS[colorIndex];

  const handlePress = () => {
    haptics.medium();
    onPress();
  };

  return (
    <PressableOpacity onPress={handlePress} style={styles.touchable}>
      <SquircleView
        cornerSmoothing={1}
        style={[
          styles.button,
          {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isSelected ? ratingColor : themeColors.border,
          },
          isSelected && { backgroundColor: ratingColor + '20' },
        ]}
      >
        <View style={styles.contentWrapper}>
          <Text style={[styles.number, { color: ratingColor }]}>{value}</Text>
          <Text style={[styles.label, { color: ratingColor }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>
            {label}
          </Text>
        </View>
      </SquircleView>
    </PressableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  button: {
    flex: 1,
    borderRadius: 12,
  },
  contentWrapper: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    ...typography.h5,
    marginBottom: 4,
    textAlign: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});
