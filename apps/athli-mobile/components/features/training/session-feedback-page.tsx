import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Star } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { WorkoutPost } from '@athli/shared-types';
import { RatingButton, RATING_COLORS } from './rating-button';
import { TextAreaInput } from '@/components/ui/form-inputs/text-area-input';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { haptics } from '@/utils/haptics';
import { en } from '@/lib/i18n/en';

// Animation constants
const ANIMATION_DURATION = 500;
const STAGGER_DELAY = 80;
const TRANSLATE_DISTANCE = 30;

// Star rating color
const STAR_COLOR = '#FBBF24';

type SessionFeedbackPageProps = {
  values: WorkoutPost;
  onValueChange: (field: keyof WorkoutPost, value: number | string | null) => void;
};

type StarRatingProps = {
  rating: number | null;
  onRatingChange: (rating: number) => void;
};

const StarRating = ({ rating, onRatingChange }: StarRatingProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const ratingLabels = en.training.session.feedback.ratingLabels;

  const handleStarPress = (starIndex: number) => {
    haptics.medium();
    onRatingChange(starIndex + 1);
  };

  return (
    <View style={styles.starRatingContainer}>
      <View style={styles.starsRow}>
        {[0, 1, 2, 3, 4].map((index) => {
          const isFilled = rating !== null && index < rating;
          return (
            <Pressable
              key={index}
              onPress={() => handleStarPress(index)}
              style={styles.starPressable}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${index + 1} stars`}
            >
              <PlatformIcon
                sf={isFilled ? 'star.fill' : 'star'}
                IconComponent={Star}
                size={40}
                color={isFilled ? STAR_COLOR : themeColors.border}
              />
            </Pressable>
          );
        })}
      </View>
      {rating !== null && (
        <Text style={[styles.ratingLabel, { color: STAR_COLOR }]}>
          {ratingLabels[rating - 1]}
        </Text>
      )}
    </View>
  );
};

export const SessionFeedbackPage = ({ values, onValueChange }: SessionFeedbackPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Animation values
  const titleProgress = useSharedValue(0);
  const intensityProgress = useSharedValue(0);
  const ratingProgress = useSharedValue(0);
  const commentsProgress = useSharedValue(0);

  // Intensity labels from translations
  const intensityLabels = en.training.session.feedback.intensityLabels;

  // Trigger animations on mount
  useEffect(() => {
    const timingConfig = { duration: ANIMATION_DURATION, easing: Easing.out(Easing.cubic) };

    titleProgress.value = withDelay(STAGGER_DELAY * 0, withTiming(1, timingConfig));
    intensityProgress.value = withDelay(STAGGER_DELAY * 1, withTiming(1, timingConfig));
    ratingProgress.value = withDelay(STAGGER_DELAY * 2, withTiming(1, timingConfig));
    commentsProgress.value = withDelay(STAGGER_DELAY * 3, withTiming(1, timingConfig));
  }, []);

  // Animated styles
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: (1 - titleProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const intensityAnimatedStyle = useAnimatedStyle(() => ({
    opacity: intensityProgress.value,
    transform: [{ translateY: (1 - intensityProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const ratingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ratingProgress.value,
    transform: [{ translateY: (1 - ratingProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const commentsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: commentsProgress.value,
    transform: [{ translateY: (1 - commentsProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const handleIntensityChange = (value: number) => {
    onValueChange('intensity', value);
  };

  const handleRatingChange = (value: number) => {
    onValueChange('rating', value);
  };

  const handleCommentsChange = (text: string) => {
    onValueChange('sessionComments', text || null);
  };

  return (
    <View style={styles.container}>
      {/* Intensity Section */}
      <Animated.View style={[styles.section, intensityAnimatedStyle]}>
        <Text style={[styles.sectionLabel, { color: themeColors.text }]}>
          {t('training.session.feedback.intensity' as any)}
        </Text>
        <View style={styles.buttonsRow}>
          {[1, 2, 3, 4, 5].map((value, index) => (
            <RatingButton
              key={value}
              value={value}
              label={intensityLabels[index]}
              isSelected={values.intensity === value}
              onPress={() => handleIntensityChange(value)}
              colorIndex={index}
            />
          ))}
        </View>
      </Animated.View>

      {/* Star Rating Section */}
      <Animated.View style={[styles.section, ratingAnimatedStyle]}>
        <Text style={[styles.sectionLabel, { color: themeColors.text }]}>
          {t('training.session.feedback.rating' as any)}
        </Text>
        <StarRating
          rating={values.rating}
          onRatingChange={handleRatingChange}
        />
      </Animated.View>

      {/* Comments Section */}
      <Animated.View style={[styles.section, commentsAnimatedStyle]}>
        <TextAreaInput
          label={t('training.session.feedback.comments' as any)}
          value={values.sessionComments || ''}
          onChangeText={handleCommentsChange}
          placeholder={t('training.session.feedback.commentsPlaceholder' as any)}
          numberOfLines={4}
          minHeight={100}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    ...typography.p1,
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starRatingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starPressable: {
    padding: 4,
  },
  ratingLabel: {
    ...typography.p2,
    fontWeight: '600',
    marginTop: 4,
  },
});
