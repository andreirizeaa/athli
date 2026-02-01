import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, AppState, AppStateStatus } from 'react-native';
import { Timer } from 'lucide-react-native';
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
import { Storage } from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ExerciseSessionCard } from './exercise-session-card';
import type { CircuitExercisePayload, RegularExercisePayload } from '@athli/shared-types';

// MMKV keys for EMOM timer persistence
const EMOM_TIMER_KEY_PREFIX = 'emom_timer_';

type ExerciseData = {
  exerciseId: string;
  name: string;
  thumbnailUrl?: string;
};

type EmomRoundPageProps = {
  sectionId: string;
  sectionName: string;
  intervalSec: number;
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
  isPaused: boolean;
  /** If true, this round is already completed - don't run timer, allow normal navigation */
  isRoundCompleted?: boolean;
};

const EMOM_COLOR = '#10B981';

export const EmomRoundPage = ({
  sectionId,
  sectionName,
  intervalSec,
  currentRound,
  totalRounds,
  exercises,
  exerciseDataMap,
  onExerciseComplete,
  onExerciseValueChange,
  onRoundComplete,
  isPaused,
  isRoundCompleted = false,
}: EmomRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Refs for timer management - using refs to avoid stale closures
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const intervalSecRef = useRef(intervalSec);
  const isPausedRef = useRef(isPaused);
  const onRoundCompleteRef = useRef(onRoundComplete);

  // Completion celebration overlay state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const completionOverlayOpacity = useSharedValue(0);
  const completionTextScale = useSharedValue(0.5);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCompletionMessageRef = useRef(-1);
  const hasShownCompletionRef = useRef(false);

  // Keep refs updated with latest prop values
  useEffect(() => {
    intervalSecRef.current = intervalSec;
  }, [intervalSec]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    onRoundCompleteRef.current = onRoundComplete;
  }, [onRoundComplete]);

  // Countdown timer state - initialize to intervalSec
  const [timeRemaining, setTimeRemaining] = useState(intervalSec);

  // Overlay states
  const [showNextRoundOverlay, setShowNextRoundOverlay] = useState(false);
  const overlayOpacity = useSharedValue(0);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize timer on mount - runs once per component instance (key change = new instance)
  useEffect(() => {
    // If round is already completed, don't start timer - allow normal navigation
    if (isRoundCompleted) {
      hasCompletedRef.current = true;
      setTimeRemaining(intervalSec); // Show full interval time
      return;
    }

    // Set up refs for this round
    hasCompletedRef.current = false;
    startTimeRef.current = Date.now();

    // Set initial time remaining
    setTimeRemaining(intervalSec);

    // Storage key for background/foreground recovery
    const storageKey = `${EMOM_TIMER_KEY_PREFIX}${sectionId}_${currentRound}`;

    // Clear any stale storage and set fresh start time
    Storage.removeItem(storageKey);
    Storage.setItem(storageKey, startTimeRef.current.toString());

    // Helper to calculate remaining time
    const calculateRemaining = (): number => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      return Math.max(0, intervalSecRef.current - elapsed);
    };

    // Helper to complete the round
    const doCompleteRound = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Clear storage
      Storage.removeItem(storageKey);

      // Show next round overlay
      setShowNextRoundOverlay(true);
      overlayOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 600 }),
        withTiming(0, { duration: 200 }, () => {
          runOnJS(setShowNextRoundOverlay)(false);
          runOnJS(onRoundCompleteRef.current)();
        })
      );
    };

    // Tick function called every second
    const tick = () => {
      if (hasCompletedRef.current || isPausedRef.current) return;

      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        doCompleteRound();
      }
    };

    // Start the countdown timer
    timerRef.current = setInterval(tick, 1000);

    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !isPausedRef.current && !hasCompletedRef.current) {
        const remaining = calculateRemaining();
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          doCompleteRound();
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      appStateSubscription.remove();
    };
    // Empty dependency array - this effect runs once on mount only
    // We use refs to access latest values inside callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle pause state changes
  useEffect(() => {
    if (hasCompletedRef.current) return;

    if (isPaused) {
      // Pause: clear the interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (timerRef.current === null) {
      // Resume: restart interval if not already running
      const calculateRemaining = (): number => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        return Math.max(0, intervalSecRef.current - elapsed);
      };

      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        // Already expired while paused
        return;
      }

      timerRef.current = setInterval(() => {
        if (hasCompletedRef.current || isPausedRef.current) return;
        
        const newRemaining = calculateRemaining();
        setTimeRemaining(newRemaining);

        if (newRemaining <= 0 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setShowNextRoundOverlay(true);
          overlayOpacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(1, { duration: 600 }),
            withTiming(0, { duration: 200 }, () => {
              runOnJS(setShowNextRoundOverlay)(false);
              runOnJS(onRoundCompleteRef.current)();
            })
          );
        }
      }, 1000);
    }
  }, [isPaused, overlayOpacity]);

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
      // Call onRoundComplete after fade out completes
      setTimeout(() => {
        setShowCompletionOverlay(false);
        onRoundCompleteRef.current();
      }, 200);
    }, 1200);
  }, [completionOverlayOpacity, completionTextScale]);

  // Handle exercise completion toggle (local only for EMOM)
  const handleExerciseComplete = (exerciseIndex: number, setIndex: number, completed: boolean) => {
    onExerciseComplete(exerciseIndex, completed);

    // If unchecking, reset the completion flag
    if (!completed) {
      hasShownCompletionRef.current = false;
      return;
    }

    // Check if all exercises will be completed (accounting for the one just completed)
    const willAllBeCompleted = exercises.every((ex, idx) =>
      idx === exerciseIndex ? true : ex.set.completed === 'completed'
    );

    if (willAllBeCompleted) {
      // Check if this is the last round
      if (currentRound === totalRounds && !hasShownCompletionRef.current) {
        // Last round - show celebration and complete immediately (ignore timer)
        hasShownCompletionRef.current = true;
        // Stop the timer if it's running
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        hasCompletedRef.current = true;
        showCompletionCelebration();
      }
      // For non-last rounds: don't advance immediately - let the timer dictate navigation
      // The timer's doCompleteRound() function will handle advancing when time expires
    }
  };

  // Handle exercise value change
  const handleExerciseValueChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => {
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
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  // Get timer color based on time remaining
  const getTimerColor = (): string => {
    if (timeRemaining <= 10) return '#EF4444'; // Red when < 10 seconds
    if (timeRemaining <= 30) return '#F59E0B'; // Orange when < 30 seconds
    return EMOM_COLOR; // Green otherwise
  };

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

      {/* Next Round Overlay */}
      {showNextRoundOverlay && (
        <Animated.View style={[styles.nextRoundOverlay, overlayAnimatedStyle]}>
          <Text style={styles.nextRoundText}>
            {currentRound < totalRounds
              ? t('training.session.emom.nextRound' as any) || 'Next Round!'
              : t('training.session.emom.complete' as any) || 'Complete!'}
          </Text>
        </Animated.View>
      )}

      {/* Round Indicator Card with Timer */}
      <View style={styles.roundCardContainer}>
        <Card style={[styles.roundCard, { borderColor: EMOM_COLOR, borderWidth: 2 }]}>
          <View style={styles.roundCardContent}>
            <View style={[styles.roundIconCircle, { backgroundColor: `${EMOM_COLOR}20` }]}>
              <PlatformIcon
                sf="clock"
                IconComponent={Timer}
                size={24}
                color={EMOM_COLOR}
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
            {/* Countdown Timer */}
            <View style={[styles.timerContainer, { backgroundColor: `${getTimerColor()}20` }]}>
              <Text style={[styles.timerText, { color: getTimerColor() }]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Exercise Cards */}
      <View style={styles.exerciseList}>
        {exercises.map((exercise, index) => {
          const exerciseData = exerciseDataMap.get(exercise.prescribedExerciseId);
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
  nextRoundOverlay: {
    position: 'absolute',
    top: -500,
    left: -50,
    right: -50,
    bottom: -500,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextRoundText: {
    ...typography.h1,
    color: '#FFFFFF',
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
  },
  timerText: {
    ...typography.h3,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  exerciseList: {
    gap: 16,
  },
});
