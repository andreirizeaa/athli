import React from 'react';
import { View, StyleSheet } from 'react-native';
import { X, Pause, Play } from 'lucide-react-native';

import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';

type WorkoutSessionHeaderProps = {
  progressPercent: number;
  onClose: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
};

export const WorkoutSessionHeader = ({
  progressPercent,
  onClose,
  isPaused,
  onTogglePause,
}: WorkoutSessionHeaderProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View style={styles.header}>
      <IconButton
        icon={{ sf: 'xmark', IconComponent: X }}
        onPress={onClose}
        size="md"
        color={themeColors.text}
      />
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarBase,
            { backgroundColor: themeColors.surfacePrimary },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: themeColors.primary,
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>
      </View>
      <IconButton
        icon={{
          sf: isPaused ? 'play' : 'pause',
          IconComponent: isPaused ? Play : Pause,
        }}
        onPress={onTogglePause}
        size="md"
        color={themeColors.text}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBase: {
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
});
