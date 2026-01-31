import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, AppState, AppStateStatus } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
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
import type { RegularExercisePayload } from '@athli/shared-types';

type ExerciseData = {
  exerciseId: string;
  name: string;
  thumbnailUrl?: string;
};

type SupersetRoundPageProps = {
  sectionId?: string;
  sectionName?: string;
  exercises: RegularExercisePayload[];
  exerciseDataMap: Map<string, ExerciseData>;
  currentSet: number;
  totalSets: number;
  restSec: number;
  onExerciseComplete: (exerciseIndex: number, setIndex: number, completed: boolean) => void;
  onExerciseValueChange: (
    exerciseIndex: number,
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => void;
  onSetComplete: () => void;
  isPaused: boolean;
};

const SUPERSET_COLOR = '#F97316'; // Orange for superset

type TimerPhase = 'rest' | 'complete';

export const SupersetRoundPage = ({
  sectionId,
  sectionName,
  exercises,
  exerciseDataMap,
  currentSet,
  totalSets,
  restSec,
  onExerciseComplete,
  onExerciseValueChange,
  onSetComplete,
  isPaused,
}: SupersetRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Refs for timer management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const restStartTimeRef = useRef<number>(Date.now());
  const currentPhaseRef = useRef<TimerPhase | null>(null);
  const restSecRef = useRef(restSec);
  const isPausedRef = useRef(isPaused);
  const onSetCompleteRef = useRef(onSetComplete);
  const currentSetRef = useRef(currentSet);
  const totalSetsRef = useRef(totalSets);
  const tickFunctionRef = useRef<(() => void) | null>(null);

  // State
  const [timeRemaining, setTimeRemaining] = useState(restSec);
  const [showRestOverlay, setShowRestOverlay] = useState(false);
  const [showNextSetOverlay, setShowNextSetOverlay] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [exerciseCompletions, setExerciseCompletions] = useState<boolean[][]>(
    exercises.map(() => new Array(exercises[0]?.sets.length || 0).fill(false))
  );
  const lastCompletionMessageRef = useRef(-1);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownCompletionRef = useRef(false);

  // Overlay animations
  const restOverlayOpacity = useSharedValue(0);
  const nextSetOverlayOpacity = useSharedValue(0);
  const completionOverlayOpacity = useSharedValue(0);
  const completionTextScale = useSharedValue(0.5);

  // Keep refs updated
  useEffect(() => {
    restSecRef.current = restSec;
  }, [restSec]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    onSetCompleteRef.current = onSetComplete;
  }, [onSetComplete]);

  useEffect(() => {
    currentSetRef.current = currentSet;
    // Reset completion flag when set changes
    hasShownCompletionRef.current = false;
  }, [currentSet]);

  useEffect(() => {
    totalSetsRef.current = totalSets;
  }, [totalSets]);

  // Check if all exercises in current set are completed
  const checkSetCompletion = (wasCompleted: boolean) => {
    const currentSetIndex = currentSetRef.current - 1;
    // Check both the exercises prop and local state
    const allCompleted = exercises.every((exercise, exerciseIdx) => {
      const set = exercise.sets[currentSetIndex];
      const localCompleted = exerciseCompletions[exerciseIdx]?.[currentSetIndex];
      return set?.completed === true || localCompleted === true;
    });

    // If unchecking, reset the completion flag
    if (!wasCompleted) {
      hasShownCompletionRef.current = false;
    }

    if (allCompleted && currentSetRef.current < totalSetsRef.current) {
      // Start rest timer
      startRestTimer();
    } else if (allCompleted && currentSetRef.current === totalSetsRef.current && wasCompleted && !hasShownCompletionRef.current) {
      // All sets completed - show celebration and complete (only if completing, not uncompleting)
      hasShownCompletionRef.current = true;
      showCompletionCelebration();
    }
  };

  // Start rest timer
  const startRestTimer = () => {
    if (hasCompletedRef.current || currentPhaseRef.current === 'rest') return;

    currentPhaseRef.current = 'rest';
    setTimeRemaining(restSecRef.current);
    restStartTimeRef.current = Date.now();
    setShowRestOverlay(true);
    restOverlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 200 }, () => {
        runOnJS(setShowRestOverlay)(false);
      })
    );

    // Start countdown
    const tick = () => {
      if (hasCompletedRef.current || isPausedRef.current) return;

      const now = Date.now();
      const elapsed = Math.floor((now - restStartTimeRef.current) / 1000);
      const remaining = Math.max(0, restSecRef.current - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        // Rest complete - move to next set
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        currentPhaseRef.current = null;
        transitionToNextSet();
      }
    };

    tickFunctionRef.current = tick;
    timerRef.current = setInterval(tick, 100);
  };

  // Transition to next set
  const transitionToNextSet = () => {
    setShowNextSetOverlay(true);
    nextSetOverlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 200 }, () => {
        runOnJS(setShowNextSetOverlay)(false);
        runOnJS(onSetCompleteRef.current)();
      })
    );
  };

  // Show completion celebration overlay
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

    setCompletionMessage(messages[messageIndex]);
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
      // Call onSetComplete after fade out completes
      setTimeout(() => {
        setShowCompletionOverlay(false);
        onSetCompleteRef.current();
      }, 200);
    }, 1200);
  }, [completionOverlayOpacity, completionTextScale]);

  // Handle exercise completion
  const handleExerciseComplete = (exerciseIndex: number, setIndex: number, completed: boolean) => {
    // Prevent unchecking when rest phase is active
    if (!completed && currentPhaseRef.current === 'rest') {
      return;
    }

    onExerciseComplete(exerciseIndex, setIndex, completed);
    
    // Update local state
    setExerciseCompletions((prev) => {
      const newCompletions = [...prev];
      if (!newCompletions[exerciseIndex]) {
        newCompletions[exerciseIndex] = [];
      }
      newCompletions[exerciseIndex][setIndex] = completed;
      return newCompletions;
    });

    // Check if set is complete after a short delay
    setTimeout(() => {
      checkSetCompletion(completed);
    }, 100);
  };

  // Initialize timer on mount
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && currentPhaseRef.current === 'rest' && !isPausedRef.current) {
        // Recalculate time remaining when app becomes active
        const now = Date.now();
        const elapsed = Math.floor((now - restStartTimeRef.current) / 1000);
        const remaining = Math.max(0, restSecRef.current - elapsed);
        setTimeRemaining(remaining);

        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          transitionToNextSet();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer color based on time remaining
  const getTimerColor = (): string => {
    if (restSecRef.current === 0) {
      return SUPERSET_COLOR;
    }

    if (timeRemaining <= 0) {
      return '#EF4444'; // Red when time is up
    }

    const clampedTime = Math.min(timeRemaining, restSecRef.current);
    const ratio = clampedTime / restSecRef.current;

    // Green: > 40% remaining
    if (ratio > 0.4) {
      return '#22C55E';
    }
    // Amber: 20-40% remaining
    if (ratio > 0.2) {
      return '#F59E0B';
    }
    // Red: < 20% remaining
    return '#EF4444';
  };

  // Animated styles
  const restOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: restOverlayOpacity.value,
  }));

  const nextSetOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nextSetOverlayOpacity.value,
  }));

  const completionOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completionOverlayOpacity.value,
  }));

  const completionTextAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completionTextScale.value }],
  }));

  // Get current set exercises (only show current set)
  const getCurrentSetExercises = () => {
    const setIndex = currentSet - 1;
    return exercises.map((exercise) => ({
      ...exercise,
      sets: [exercise.sets[setIndex]],
    }));
  };

  const currentSetExercises = getCurrentSetExercises();
  const isLastSet = currentSet === totalSets;

  return (
    <View style={styles.container}>
      {/* Completion celebration overlay */}
      {showCompletionOverlay && (
        <Animated.View style={[styles.completionOverlay, completionOverlayAnimatedStyle]}>
          <LottieView
            source={require('@/assets/animations/confetti.json')}
            autoPlay
            loop={false}
            style={styles.confettiAnimation}
          />
          <Animated.Text style={[styles.completionText, { color: themeColors.text }, completionTextAnimatedStyle]}>
            {completionMessage}
          </Animated.Text>
        </Animated.View>
      )}

      {/* Rest overlay */}
      {showRestOverlay && (
        <Animated.View style={[styles.overlay, restOverlayAnimatedStyle]}>
          <View style={styles.overlayContent}>
            <Text style={[styles.overlayText, { color: themeColors.text }]}>
              {t('training.session.rest' as any) || 'REST'} 😮‍💨
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Next set overlay */}
      {showNextSetOverlay && (
        <Animated.View style={[styles.overlay, nextSetOverlayAnimatedStyle]}>
          <View style={styles.overlayContent}>
            <Text style={[styles.overlayText, { color: themeColors.text }]}>
              {t('training.session.nextSet' as any) || 'Next Set'} 💪
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Superset Header Card */}
      <View style={styles.headerContainer}>
        <Card style={[styles.supersetCard, { borderColor: SUPERSET_COLOR, borderWidth: 2 }]}>
          <View style={styles.supersetCardContent}>
            <View style={[styles.roundIconCircle, { backgroundColor: `${SUPERSET_COLOR}20` }]}>
              <PlatformIcon
                sf="dumbbell"
                IconComponent={Dumbbell}
                size={24}
                color={SUPERSET_COLOR}
              />
            </View>
            <View style={styles.roundTextContainer}>
              <Text style={[styles.roundLabel, { color: themeColors.mutedText }]}>
                {t('training.session.superset' as any) || 'Superset'}
              </Text>
              <Text style={[styles.roundNumber, { color: themeColors.text }]}>
                {t('training.session.setXOfY' as any, { current: currentSet.toString(), total: totalSets.toString() }) ||
                  `Set ${currentSet} of ${totalSets}`}
              </Text>
            </View>
            {/* Rest Timer (shown when rest phase is active) */}
            {currentPhaseRef.current === 'rest' && (
              <View style={[styles.timerContainer, { backgroundColor: `${getTimerColor()}20` }]}>
                <Text style={[styles.timerText, { color: getTimerColor() }]}>
                  {formatTime(timeRemaining)}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </View>

      {/* Exercise Cards */}
      <View style={styles.exerciseList}>
        {currentSetExercises.map((exercise, index) => {
          const exerciseData = exerciseDataMap.get(exercise.prescribedExerciseId);
          const supersetLabel = index === 0 ? 'A' : index === 1 ? 'B' : String.fromCharCode(67 + index - 2);

          // Get alternatives
          const exerciseAlternatives = exercise.alternatives
            ? Array.from(exerciseDataMap.values())
                .filter((ex) => exercise.alternatives?.includes(ex.exerciseId))
                .map((ex) => ({
                  id: ex.exerciseId,
                  name: ex.name,
                  thumbnailUrl: ex.thumbnailUrl,
                }))
            : [];

          return (
            <ExerciseSessionCard
              key={`${exercise.id}-${currentSet}`}
              exercise={exercise}
              exerciseName={exerciseData?.name || 'Exercise'}
              exerciseImageUrl={exerciseData?.thumbnailUrl}
              alternatives={exerciseAlternatives}
              isSuperset={true}
              supersetLabel={supersetLabel}
              onSetComplete={(setIdx, completed) => {
                handleExerciseComplete(index, currentSet - 1, completed);
              }}
              onSetValueChange={(setIdx, field, value) => {
                onExerciseValueChange(index, currentSet - 1, field, value);
              }}
              onAlternativeSelect={(alternativeId) => {
                // Handle alternative selection if needed
              }}
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
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  supersetCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  supersetCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    ...typography.h4,
    fontWeight: '700',
  },
  timerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    ...typography.h3,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  exerciseList: {
    flex: 1,
    gap: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    paddingHorizontal: 32,
  },
  overlayText: {
    ...typography.h1,
    textAlign: 'center',
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    textAlign: 'center',
    zIndex: 1,
  },
});
