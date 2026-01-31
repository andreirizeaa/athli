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
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { FilledButton } from '@/components/ui/buttons/filled-button';
import { ExerciseSessionCard } from './exercise-session-card';
import type { RoundExercisePayload, RegularExercisePayload } from '@athli/shared-types';

type ExerciseData = {
  exerciseId: string;
  name: string;
  thumbnailUrl?: string;
};

type AmrapRoundPageProps = {
  sectionId: string;
  sectionName: string;
  durationSec: number;
  initialRoundsCompleted: number;
  exercises: RoundExercisePayload[];
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

const AMRAP_COLOR = '#06B6D4'; // Cyan for AMRAP

export const AmrapRoundPage = ({
  sectionId,
  sectionName,
  durationSec,
  initialRoundsCompleted,
  exercises,
  exerciseDataMap,
  onExerciseComplete,
  onExerciseValueChange,
  onRoundComplete,
  isPaused,
}: AmrapRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const lottieRef = useRef<LottieView>(null);

  // Refs for timer management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const durationSecRef = useRef(durationSec);
  const isPausedRef = useRef(isPaused);
  const onRoundCompleteRef = useRef(onRoundComplete);
  const pausedDurationRef = useRef(0);
  const pauseStartTimeRef = useRef<number | null>(null);

  // Keep refs updated
  useEffect(() => {
    durationSecRef.current = durationSec;
  }, [durationSec]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    onRoundCompleteRef.current = onRoundComplete;
  }, [onRoundComplete]);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(Math.max(0, durationSec || 0));
  const [currentRound, setCurrentRound] = useState(initialRoundsCompleted + 1);
  const [exerciseCompletions, setExerciseCompletions] = useState<boolean[]>(
    exercises.map((ex) => ex.completed)
  );

  // Overlay states
  const [showConfetti, setShowConfetti] = useState(false);
  const [showNextRoundOverlay, setShowNextRoundOverlay] = useState(false);
  const overlayOpacity = useSharedValue(0);
  const nextRoundOverlayOpacity = useSharedValue(0);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize timer on mount
  useEffect(() => {
    hasCompletedRef.current = false;
    startTimeRef.current = Date.now();
    setTimeRemaining(Math.max(0, durationSec || 0));

    // Helper to calculate remaining time
    const calculateRemaining = (): number => {
      if (pauseStartTimeRef.current !== null) {
        // Currently paused - return last known remaining
        return timeRemaining;
      }
      const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
      return Math.max(0, durationSecRef.current - elapsed);
    };

    // Helper to complete the AMRAP
    const completeAmrap = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Show confetti and complete
      setShowConfetti(true);
      lottieRef.current?.play();

      // Advance after a delay
      setTimeout(() => {
        onRoundCompleteRef.current();
      }, 2000);
    };

    // Tick function
    const tick = () => {
      if (hasCompletedRef.current || isPausedRef.current) return;

      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        completeAmrap();
      }
    };

    // Start timer
    timerRef.current = setInterval(tick, 1000);

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !isPausedRef.current && !hasCompletedRef.current) {
        const remaining = calculateRemaining();
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          completeAmrap();
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      appStateSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle pause state changes
  useEffect(() => {
    if (hasCompletedRef.current) return;

    if (isPaused) {
      // Pause: record pause start time
      pauseStartTimeRef.current = Date.now();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // Resume: calculate paused duration and restart timer
      if (pauseStartTimeRef.current !== null) {
        const pausedDuration = Date.now() - pauseStartTimeRef.current;
        pausedDurationRef.current += pausedDuration;
        pauseStartTimeRef.current = null;
      }

      if (timerRef.current === null) {
        const calculateRemaining = (): number => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
          return Math.max(0, durationSecRef.current - elapsed);
        };

        const remaining = calculateRemaining();
        setTimeRemaining(remaining);

        if (remaining <= 0) {
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
            setShowConfetti(true);
            lottieRef.current?.play();
            setTimeout(() => {
              onRoundCompleteRef.current();
            }, 2000);
          }
        }, 1000);
      }
    }
  }, [isPaused]);

  // Actually complete the round (increment and reset)
  const completeRoundInternal = () => {
    if (hasCompletedRef.current) return;
    
    // Increment round
    setCurrentRound((prev) => prev + 1);
    
    // Reset all exercise completions
    const newCompletions = exercises.map(() => false);
    setExerciseCompletions(newCompletions);
    
    // Reset exercise completions in parent
    exercises.forEach((_, index) => {
      onExerciseComplete(index, false);
    });
  };

  // Show next round overlay
  const showNextRoundTransition = () => {
    setShowNextRoundOverlay(true);
    nextRoundOverlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 200 }, () => {
        runOnJS(setShowNextRoundOverlay)(false);
        runOnJS(completeRoundInternal)();
      })
    );
  };

  // Handle exercise completion
  const handleExerciseComplete = (exerciseIndex: number, setIndex: number, completed: boolean) => {
    const newCompletions = [...exerciseCompletions];
    newCompletions[exerciseIndex] = completed;
    setExerciseCompletions(newCompletions);
    onExerciseComplete(exerciseIndex, completed);

    // Check if all exercises will be completed (accounting for the one just completed)
    const willAllBeCompleted = newCompletions.every((c) => c);

    if (completed && willAllBeCompleted) {
      // All exercises completed - show next round overlay
      showNextRoundTransition();
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

  // Handle complete round button
  const handleCompleteRound = () => {
    if (hasCompletedRef.current) return;
    
    // Mark all exercises as completed in local state so button shows solid color
    const allCompleted = exercises.map(() => true);
    setExerciseCompletions(allCompleted);
    
    // Also update parent state
    exercises.forEach((_, index) => {
      onExerciseComplete(index, true);
    });
    
    // Small delay to allow button to flash to solid color before showing overlay
    setTimeout(() => {
      showNextRoundTransition();
    }, 100);
  };

  // Handle confetti animation finish
  const handleConfettiFinish = () => {
    setShowConfetti(false);
  };

  // Animated style for next round overlay
  const nextRoundOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nextRoundOverlayOpacity.value,
  }));

  // Get timer color based on ratio of time remaining
  const getTimerColor = (): string => {
    const phaseDuration = durationSec;
    
    if (phaseDuration === 0) {
      return AMRAP_COLOR;
    }
    
    if (timeRemaining <= 0) {
      return '#EF4444'; // Red when time is up
    }
    
    const clampedTime = Math.min(timeRemaining, phaseDuration);
    const ratio = clampedTime / phaseDuration;
    
    // Start with AMRAP_COLOR (cyan) for first 60% (ratio > 0.4)
    if (ratio > 0.4) {
      return AMRAP_COLOR;
    }
    // Amber: 20-40% (ratio 0.2-0.4)
    if (ratio > 0.2) {
      return '#F59E0B';
    }
    // Red: last 20% (ratio <= 0.2)
    return '#EF4444';
  };

  // Check if all exercises are completed
  const allExercisesCompleted = exerciseCompletions.every((c) => c);

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

      {/* Next round overlay */}
      {showNextRoundOverlay && (
        <Animated.View style={[styles.nextRoundOverlay, nextRoundOverlayAnimatedStyle]}>
          <Text style={[styles.nextRoundText, { color: themeColors.text }]}>
            {t('training.session.circuit.nextRound' as any) || 'Next Round'} 💪
          </Text>
        </Animated.View>
      )}

      {/* Round Indicator Card with Timer */}
      <View style={styles.roundCardContainer}>
        <Card style={[styles.roundCard, { borderColor: AMRAP_COLOR, borderWidth: 2 }]}>
          <View style={styles.roundCardContent}>
            <View style={[styles.roundIconCircle, { backgroundColor: `${AMRAP_COLOR}20` }]}>
              <PlatformIcon
                sf="timer"
                IconComponent={Timer}
                size={24}
                color={AMRAP_COLOR}
              />
            </View>
            <View style={styles.roundTextContainer}>
              <Text style={[styles.roundLabel, { color: themeColors.mutedText }]}>
                {sectionName}
              </Text>
              <Text style={[styles.roundNumber, { color: themeColors.text }]}>
                {currentRound === 1
                  ? t('training.session.amrap.roundOne' as any) || 'Round 1'
                  : t('training.session.amrap.roundX' as any, { round: currentRound }) || `Round ${currentRound}`}
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
        
        {/* Complete Round Button */}
        <View style={styles.buttonContainer}>
          <FilledButton
            label={t('training.session.amrap.completeRound' as any) || 'Complete Round'}
            onPress={handleCompleteRound}
            disabled={hasCompletedRef.current}
            backgroundColor={allExercisesCompleted ? AMRAP_COLOR : `${AMRAP_COLOR}40`}
            textColor={allExercisesCompleted ? '#FFFFFF' : themeColors.text}
            style={styles.completeRoundButton}
          />
        </View>
      </View>

      {/* Exercise Cards */}
      <View style={styles.exerciseList}>
        {exercises.map((exercise, index) => {
          const exerciseData = exerciseDataMap.get(exercise.prescribedExerciseId);
          const exerciseWithSets: RegularExercisePayload = {
            ...exercise,
            sets: [
              {
                setNumber: 1,
                type: 'normal',
                restSec: exercise.restSec || 0,
                completed: exerciseCompletions[index] ?? exercise.completed,
                skipped: false,
                trackableField1: exercise.trackableField1,
                trackableField2: exercise.trackableField2,
                dropset: null,
              },
            ],
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
    marginBottom: 8,
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
    justifyContent: 'center',
  },
  timerText: {
    ...typography.h3,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  buttonContainer: {
    paddingTop: 8,
  },
  completeRoundButton: {
    width: '100%',
  },
  exerciseList: {
    gap: 16,
  },
});
