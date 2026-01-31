import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';

// Animation constants
const TEXT_ANIMATION_DURATION = 600;
const STAGGER_DELAY = 120;
const TRANSLATE_DISTANCE = 40;

export const CongratulationsPage = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Animation values for text
  const emojiProgress = useSharedValue(0);
  const titleProgress = useSharedValue(0);

  // Trigger text animations on mount
  useEffect(() => {
    const timingConfig = { duration: TEXT_ANIMATION_DURATION, easing: Easing.out(Easing.back(1.5)) };

    emojiProgress.value = withDelay(STAGGER_DELAY * 0, withTiming(1, timingConfig));
    titleProgress.value = withDelay(STAGGER_DELAY * 1, withTiming(1, timingConfig));
  }, []);

  // Animated styles for text
  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    opacity: emojiProgress.value,
    transform: [
      { translateY: (1 - emojiProgress.value) * TRANSLATE_DISTANCE },
      { scale: interpolate(emojiProgress.value, [0, 1], [0.5, 1]) },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: (1 - titleProgress.value) * TRANSLATE_DISTANCE }],
  }));

  return (
    <View style={styles.container}>
      {/* Lottie confetti animation layer */}
      <LottieView
        source={require('@/assets/animations/confetti.json')}
        autoPlay
        loop={false}
        style={styles.lottieAnimation}
      />

      {/* Content layer */}
      <View style={styles.contentContainer}>
        <Animated.Text style={[styles.emoji, emojiAnimatedStyle]}>
          🎉
        </Animated.Text>

        <Animated.Text style={[styles.title, { color: themeColors.text }, titleAnimatedStyle]}>
          {t('training.session.congratulations.title' as any)}
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieAnimation: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    zIndex: 1,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
  },
});
