import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Timer, Repeat, Zap, Target, Flame, Dumbbell, LucideIcon } from 'lucide-react-native';
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
import { WorkoutSectionPayload, SectionType } from '@athli/shared-types';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';

type SectionInfoPageProps = {
  section: WorkoutSectionPayload;
};

type SectionConfig = {
  sfIcon: string;
  IconComponent: LucideIcon;
  color: string;
};

const SECTION_CONFIG: Record<SectionType, SectionConfig> = {
  regular: { sfIcon: 'dumbbell', IconComponent: Dumbbell, color: '#3B82F6' },
  amrap: { sfIcon: 'flame', IconComponent: Flame, color: '#06B6D4' }, // Cyan (distinct from timer amber)
  tabata: { sfIcon: 'timer', IconComponent: Timer, color: '#F43F5E' }, // Rose/pink-red (distinct from timer red)
  hiit: { sfIcon: 'bolt', IconComponent: Zap, color: '#8B5CF6' },
  emom: { sfIcon: 'clock', IconComponent: Timer, color: '#10B981' },
  circuits: { sfIcon: 'repeat', IconComponent: Repeat, color: '#EC4899' },
  auxiliary: { sfIcon: 'target', IconComponent: Target, color: '#6B7280' },
};

// Animation constants
const ANIMATION_DURATION = 500;
const STAGGER_DELAY = 80;
const TRANSLATE_DISTANCE = 30;

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0 && remainingSeconds > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}`;
  }
  return `${remainingSeconds}s`;
};

export const SectionInfoPage = ({ section }: SectionInfoPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const config = SECTION_CONFIG[section.type] || SECTION_CONFIG.regular;

  // Animation values for each element
  const iconProgress = useSharedValue(0);
  const typeProgress = useSharedValue(0);
  const nameProgress = useSharedValue(0);
  const detailsProgress = useSharedValue(0);
  const cardProgress = useSharedValue(0);
  const notesProgress = useSharedValue(0);

  // Trigger animations on mount
  useEffect(() => {
    // Reset values
    iconProgress.value = 0;
    typeProgress.value = 0;
    nameProgress.value = 0;
    detailsProgress.value = 0;
    cardProgress.value = 0;
    notesProgress.value = 0;

    // Staggered entrance
    const timingConfig = { duration: ANIMATION_DURATION, easing: Easing.out(Easing.cubic) };

    iconProgress.value = withDelay(STAGGER_DELAY * 0, withTiming(1, timingConfig));
    typeProgress.value = withDelay(STAGGER_DELAY * 1, withTiming(1, timingConfig));
    nameProgress.value = withDelay(STAGGER_DELAY * 2, withTiming(1, timingConfig));
    detailsProgress.value = withDelay(STAGGER_DELAY * 3, withTiming(1, timingConfig));
    cardProgress.value = withDelay(STAGGER_DELAY * 4, withTiming(1, timingConfig));
    notesProgress.value = withDelay(STAGGER_DELAY * 5, withTiming(1, timingConfig));
  }, [section.id]);

  // Animated styles
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconProgress.value,
    transform: [{ translateY: (1 - iconProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const typeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: typeProgress.value,
    transform: [{ translateY: (1 - typeProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const nameAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nameProgress.value,
    transform: [{ translateY: (1 - nameProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const detailsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: detailsProgress.value,
    transform: [{ translateY: (1 - detailsProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    transform: [{ translateY: (1 - cardProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const notesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: notesProgress.value,
    transform: [{ translateY: (1 - notesProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const getSectionDetails = (): string[] => {
    const details: string[] = [];

    switch (section.type) {
      case 'amrap':
        details.push(t('training.session.sectionTypes.details.timeCap', { time: formatDuration(section.durationSec) }) as string);
        details.push(t('training.session.sectionTypes.details.exercisesPerRound', { count: section.exercises.length }) as string);
        break;
      case 'tabata':
        details.push(t('training.session.sectionTypes.details.rounds', { count: section.rounds }) as string);
        details.push(t('training.session.sectionTypes.details.workRest', { work: section.workSec, rest: section.restSec }) as string);
        details.push(t('training.session.sectionTypes.details.exercises', { count: section.exercises.length }) as string);
        break;
      case 'hiit':
        details.push(t('training.session.sectionTypes.details.rounds', { count: section.rounds }) as string);
        details.push(t('training.session.sectionTypes.details.workRest', { work: section.workSec, rest: section.restSec }) as string);
        details.push(t('training.session.sectionTypes.details.exercises', { count: section.exercises.length }) as string);
        break;
      case 'emom':
        details.push(t('training.session.sectionTypes.details.duration', { time: section.durationMin }) as string);
        details.push(t('training.session.sectionTypes.details.intervals', { time: section.intervalSec }) as string);
        details.push(t('training.session.sectionTypes.details.exercises', { count: section.exercises.length }) as string);
        break;
      case 'circuits':
        details.push(t('training.session.sectionTypes.details.rounds', { count: section.rounds }) as string);
        details.push(t('training.session.sectionTypes.details.exercisesPerRound', { count: section.exercises.length }) as string);
        break;
      case 'regular':
      case 'auxiliary':
        const exerciseCount = section.exercises.reduce((count, group) => count + group.exercises.length, 0);
        details.push(t('training.session.sectionTypes.details.exercises', { count: exerciseCount }) as string);
        break;
    }

    return details;
  };

  const getSectionTypeLabel = (): string => {
    return t(`training.session.sectionTypes.${section.type}.label` as any) || section.type.toUpperCase();
  };

  const getSectionDescription = (): string => {
    return t(`training.session.sectionTypes.${section.type}.description` as any) || '';
  };

  const details = getSectionDetails();
  const sectionDescription = getSectionDescription();

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
        <View style={[styles.iconCircle, { backgroundColor: `${config.color}20` }]}>
          <PlatformIcon
            sf={config.sfIcon}
            IconComponent={config.IconComponent}
            size={48}
            color={config.color}
          />
        </View>
      </Animated.View>

      <Animated.Text style={[styles.sectionType, { color: config.color }, typeAnimatedStyle]}>
        {getSectionTypeLabel()}
      </Animated.Text>

      <Animated.Text style={[styles.sectionName, { color: themeColors.text }, nameAnimatedStyle]}>
        {section.name}
      </Animated.Text>

      <Animated.View style={[styles.detailsContainer, detailsAnimatedStyle]}>
        {details.map((detail, index) => (
          <View key={index} style={[styles.detailPill, { backgroundColor: `${config.color}20` }]}>
            <Text style={[styles.detailText, { color: config.color }]}>
              {detail}
            </Text>
          </View>
        ))}
      </Animated.View>

      {sectionDescription && (
        <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
          <Card style={styles.descriptionCard}>
            <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
              {sectionDescription}
            </Text>
          </Card>
        </Animated.View>
      )}

      {section.notes && (
        <Animated.View style={[styles.notesContainer, { backgroundColor: themeColors.backgroundSecondary }, notesAnimatedStyle]}>
          <Text style={[styles.notesLabel, { color: themeColors.mutedText }]}>
            {t('general.notes' as any)}
          </Text>
          <Text style={[styles.notesText, { color: themeColors.text }]}>
            {section.notes}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionType: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 2,
  },
  sectionName: {
    ...typography.h1,
    textAlign: 'center',
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  detailPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailText: {
    ...typography.p2,
    fontWeight: '600',
  },
  cardContainer: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  descriptionCard: {
    marginBottom: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  descriptionText: {
    ...typography.p2,
    textAlign: 'center',
    lineHeight: 22,
  },
  notesContainer: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  notesLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  notesText: {
    ...typography.p1,
  },
});
