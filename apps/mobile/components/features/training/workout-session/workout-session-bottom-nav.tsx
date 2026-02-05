import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import SquircleView from 'react-native-fast-squircle';

import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { typography } from '@/constants/typography';

type WorkoutSessionBottomNavProps = {
  canGoBack: boolean;
  canGoNext: boolean;
  timerDisplay: string;
  bottomInset: number;
  onPrevious: () => void;
  onNext: () => void;
};

export const WorkoutSessionBottomNav = ({
  canGoBack,
  canGoNext,
  timerDisplay,
  bottomInset,
  onPrevious,
  onNext,
}: WorkoutSessionBottomNavProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.surfacePrimary },
        ]}
      >
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={onPrevious}
          disabled={!canGoBack}
          size="md"
          variant="primary"
        />

        <SquircleView
          cornerSmoothing={1}
          style={[
            styles.timerContainer,
            {
              borderWidth: 1,
              borderColor: themeColors.border,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <Text style={[styles.timerText, { color: themeColors.text }]}>
            {timerDisplay}
          </Text>
        </SquircleView>

        <IconButton
          icon={{ sf: 'arrow.right', IconComponent: ChevronRight }}
          onPress={onNext}
          disabled={!canGoNext}
          size="md"
          variant="primary"
        />
      </View>
      {/* Safe area fill at the bottom */}
      <View
        style={[
          styles.safeAreaFill,
          {
            height: bottomInset,
            backgroundColor: themeColors.surfacePrimary,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  divider: {
    height: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  safeAreaFill: {
    width: '100%',
  },
  timerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  timerText: {
    ...typography.p1,
    fontVariant: ['tabular-nums'],
  },
});
