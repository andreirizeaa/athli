import React, { useRef, useState, useEffect } from 'react';
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
}: EmomRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const lottieRef = useRef<LottieView>(null);

  // Refs for timer management - using refs to avoid stale closures
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const intervalSecRef = useRef(intervalSec);
  const isPausedRef = useRef(isPaused);
  const onRoundCompleteRef = useRef(onRoundComplete);

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
  const [showConfetti, setShowConfetti] = useState(false);
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

  // Handle exercise completion toggle (local only for EMOM)
  const handleExerciseComplete = (exerciseIndex: number, setIndex: number, completed: boolean) => {
    onExerciseComplete(exerciseIndex, completed);
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

  // Handle confetti animation finish
  const handleConfettiFinish = () => {
    setShowConfetti(false);
  };

  // Animated style for next round overlay
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Get timer color based on time remaining
  const getTimerColor = (): string => {
    if (timeRemaining <= 10) return '#EF4444'; // Red when < 10 seconds
    if (timeRemaining <= 30) return '#F59E0B'; // Orange when < 30 seconds
    return EMOM_COLOR; // Green otherwise
  };

  return (
    <View style={styles.container}>
      {/* Confetti animation overlay */}
      {showConfetti && (
        <LottieView
          ref={lottieRef}
          source={require('@/assets/animations/confetti.json')}
          autoPlay
          loop={false}
          onAnimationFinish={handleConfettiFinish}
          style={styles.confettiAnimation}
        />
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
  confettiAnimation: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    zIndex: 10,
    pointerEvents: 'none',
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
