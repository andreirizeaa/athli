import React, { useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Repeat } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';
import { en } from '@/lib/i18n/en';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ExerciseSessionCard } from './exercise-session-card';
import type { CircuitExercisePayload, RegularExercisePayload } from '@athli/shared-types';

type ExerciseData = {
  exerciseId: string;
  name: string;
  thumbnailUrl?: string;
};

type CircuitRoundPageProps = {
  sectionName: string;
  sectionType: 'circuits' | 'tabata' | 'hiit' | 'emom';
  currentRound: number;
  totalRounds: number;
  exercises: CircuitExercisePayload[];
  exerciseDataMap: Map<string, ExerciseData>;
  onExerciseComplete: (exerciseIndex: number, completed: boolean) => void;
  onExerciseValueChange: (
    exerciseIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => void;
  onRoundComplete: () => void;
  isExerciseDataLoading?: boolean;
  /** Callback to show phase overlay at modal level (covers entire screen) */
  onShowPhaseOverlay?: (text: string, durationMs?: number) => void;
  /** Callback to show completion overlay at modal level (covers entire screen) */
  onShowCompletionOverlay?: (message: string) => void;
};

// Map section type to color
const SECTION_COLORS: Record<string, string> = {
  circuits: '#EC4899',
  tabata: '#F43F5E', // Rose/pink-red (distinct from timer red)
  hiit: '#8B5CF6',
  emom: '#10B981',
};

export const CircuitRoundPage = ({
  sectionName,
  sectionType,
  currentRound,
  totalRounds,
  exercises,
  exerciseDataMap,
  onExerciseComplete,
  onExerciseValueChange,
  onRoundComplete,
  isExerciseDataLoading = false,
  onShowPhaseOverlay,
  onShowCompletionOverlay,
}: CircuitRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Completion celebration overlay state (for final round)
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const completionOverlayOpacity = useSharedValue(0);
  const completionTextScale = useSharedValue(0.5);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCompletionMessageRef = useRef(-1);
  const hasShownCompletionRef = useRef(false);

  // Simple overlay state (for intermediate rounds)
  const [showNextRoundOverlay, setShowNextRoundOverlay] = useState(false);
  const nextRoundOverlayOpacity = useSharedValue(0);

  const sectionColor = SECTION_COLORS[sectionType] || SECTION_COLORS.circuits;

  // Show completion celebration overlay (for final round)
  const showCompletionCelebration = useCallback(() => {
    // Get messages directly from translations object
    const messages = en.training.session.exerciseComplete;
    if (!messages || messages.length === 0) return;

    // Pick a random message (avoid repeating the last one)
    let messageIndex: number;
    do {
      messageIndex = Math.floor(Math.random() * messages.length);
    } while (messageIndex === lastCompletionMessageRef.current && messages.length > 1);
    lastCompletionMessageRef.current = messageIndex;

    const message = messages[messageIndex];

    // Use parent overlay callback if available (covers entire screen)
    if (onShowCompletionOverlay) {
      onShowCompletionOverlay(message);
      setTimeout(onRoundComplete, 1400);
      return;
    }

    // Fallback to local overlay
    setCompletionMessage(message);
    setShowCompletionOverlay(true);

    // Animate in
    completionOverlayOpacity.value = withTiming(1, { duration: 200 });
    completionTextScale.value = withSequence(
      withTiming(1.1, { duration: 250 }),
      withTiming(1, { duration: 150 })
    );

    // Auto dismiss and navigate after delay
    completionTimeoutRef.current = setTimeout(() => {
      completionOverlayOpacity.value = withTiming(0, { duration: 200 });
      // Call onRoundComplete after fade out completes
      setTimeout(() => {
        setShowCompletionOverlay(false);
        onRoundComplete();
      }, 200);
    }, 1200);
  }, [completionOverlayOpacity, completionTextScale, onRoundComplete, onShowCompletionOverlay]);

  // Show simple next round overlay (for intermediate rounds)
  const showNextRoundTransition = useCallback(() => {
    // Use parent overlay callback if available (covers entire screen)
    if (onShowPhaseOverlay) {
      onShowPhaseOverlay(t('training.session.circuit.nextRound' as any) || 'Next Round! 💪', 800);
      setTimeout(onRoundComplete, 1000);
      return;
    }

    // Fallback to local overlay
    setShowNextRoundOverlay(true);
    nextRoundOverlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 200 }, () => {
        runOnJS(setShowNextRoundOverlay)(false);
        runOnJS(onRoundComplete)();
      })
    );
  }, [nextRoundOverlayOpacity, onRoundComplete, onShowPhaseOverlay, t]);

  // Handle exercise completion toggle
  const handleExerciseComplete = (exerciseIndex: number, setIndex: number, completed: boolean) => {
    // For circuit exercises, there's only one set (setIndex 0)
    onExerciseComplete(exerciseIndex, completed);

    // If unchecking, reset the completion flag
    if (!completed) {
      hasShownCompletionRef.current = false;
      return;
    }

    // Check if this was the last exercise to be completed
    const willAllBeCompleted = exercises.every((ex, idx) =>
      idx === exerciseIndex ? true : ex.set.completed === 'completed'
    );

    if (willAllBeCompleted) {
      // Check if this is the last round
      if (currentRound === totalRounds && !hasShownCompletionRef.current) {
        // Last round - show celebration and complete
        hasShownCompletionRef.current = true;
        showCompletionCelebration();
      } else if (currentRound < totalRounds) {
        // Not the last round - show simple overlay and advance to next round
        showNextRoundTransition();
      }
    }
  };

  // Handle exercise value change
  const handleExerciseValueChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => {
    // For circuit exercises, there's only one set (setIndex 0)
    onExerciseValueChange(exerciseIndex, field, value);
  };

  // Animated styles for completion overlay
  const completionOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completionOverlayOpacity.value,
  }));

  const completionTextAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completionTextScale.value }],
  }));

  // Animated style for next round overlay
  const nextRoundOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nextRoundOverlayOpacity.value,
  }));

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Completion celebration overlay (final round with confetti) */}
      {showCompletionOverlay && (
        <Animated.View style={[styles.completionOverlay, completionOverlayAnimatedStyle]}>
          <LottieView
            source={require('@/assets/animations/confetti.json')}
            autoPlay
            loop={false}
            style={styles.confettiAnimation}
          />
          <Animated.Text style={[styles.completionText, completionTextAnimatedStyle]}>
            {completionMessage}
          </Animated.Text>
        </Animated.View>
      )}

      {/* Next round overlay (intermediate rounds, no confetti) */}
      {showNextRoundOverlay && (
        <Animated.View style={[styles.nextRoundOverlay, nextRoundOverlayAnimatedStyle]}>
          <Text style={[styles.nextRoundText, { color: themeColors.text }]}>
            {t('training.session.circuit.nextRound' as any) || 'Next Round'} 💪
          </Text>
        </Animated.View>
      )}

      {/* Round Indicator Card */}
      <View style={styles.roundCardContainer}>
        <Card style={[styles.roundCard, { borderColor: sectionColor, borderWidth: 2 }]}>
          <View style={styles.roundCardContent}>
            <View style={[styles.roundIconCircle, { backgroundColor: `${sectionColor}20` }]}>
              <PlatformIcon
                sf="repeat"
                IconComponent={Repeat}
                size={24}
                color={sectionColor}
              />
            </View>
            <View style={styles.roundTextContainer}>
              <Text style={[styles.roundLabel, { color: themeColors.mutedText }]}>
                {sectionName}
              </Text>
              <Text style={[styles.roundNumber, { color: themeColors.text }]}>
                {t('training.session.circuit.roundOf' as any, {
                  current: currentRound,
                  total: totalRounds,
                }) || `Round ${currentRound} of ${totalRounds}`}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Exercise Cards */}
      <View style={styles.exerciseList}>
        {exercises.map((exercise, index) => {
          const exerciseData = exerciseDataMap.get(exercise.prescribedExerciseId);
          // Convert CircuitExercisePayload to RegularExercisePayload format for ExerciseSessionCard
          const exerciseWithSets: RegularExercisePayload = {
            ...exercise,
            sets: [exercise.set],
          };

          return (
            <ExerciseSessionCard
              key={exercise.id}
              exercise={exerciseWithSets}
              exerciseName={exerciseData?.name || 'Exercise'}
              exerciseImageUrl={exerciseData?.thumbnailUrl}
              alternatives={[]}
              onSetComplete={(setIndex, completed) => handleExerciseComplete(index, setIndex, completed)}
              onSetValueChange={(setIndex, field, value) => handleExerciseValueChange(index, setIndex, field, value)}
              onAlternativeSelect={() => {}}
              isExerciseDataLoading={isExerciseDataLoading}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  completionOverlay: {
    position: 'absolute',
    top: -500,
    left: -50,
    right: -50,
    bottom: -500,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  confettiAnimation: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    zIndex: 0,
  },
  completionText: {
    ...typography.h1,
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 1,
  },
  nextRoundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  nextRoundText: {
    ...typography.h1,
    textAlign: 'center',
  },
  roundCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  roundCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  roundCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  roundIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundTextContainer: {
    flex: 1,
  },
  roundLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  roundNumber: {
    ...typography.h3,
    fontWeight: '700',
  },
  exerciseList: {
    gap: 16,
  },
});
