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
import { en } from '@/lib/i18n/en';
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
  onSectionComplete: (roundsCompleted: number) => void;
  isPaused: boolean;
  /** If true, this section is already completed - don't run timer, show completed state */
  isSectionCompleted?: boolean;
  isExerciseDataLoading?: boolean;
  /** Callback to show phase overlay at modal level (covers entire screen) */
  onShowPhaseOverlay?: (text: string, durationMs?: number) => void;
  /** Callback to show completion overlay at modal level (covers entire screen) */
  onShowCompletionOverlay?: (message: string) => void;
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
  onSectionComplete,
  isPaused,
  isSectionCompleted = false,
  isExerciseDataLoading = false,
  onShowPhaseOverlay,
  onShowCompletionOverlay,
}: AmrapRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const lottieRef = useRef<LottieView>(null);

  // Refs for timer management
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCompletedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const durationSecRef = useRef(durationSec);
  const isPausedRef = useRef(isPaused);
  const onSectionCompleteRef = useRef(onSectionComplete);
  const pausedDurationRef = useRef(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  const onShowPhaseOverlayRef = useRef(onShowPhaseOverlay);
  const currentRoundRef = useRef(initialRoundsCompleted + 1);

  // Keep refs updated
  useEffect(() => {
    durationSecRef.current = durationSec;
  }, [durationSec]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    onSectionCompleteRef.current = onSectionComplete;
  }, [onSectionComplete]);

  useEffect(() => {
    onShowPhaseOverlayRef.current = onShowPhaseOverlay;
  }, [onShowPhaseOverlay]);

  // Timer state - currentRoundRef is updated after state changes
  // to ensure the timer callbacks have access to the latest value
  // If section is completed, show 0:00, otherwise show full duration
  const [timeRemaining, setTimeRemaining] = useState(isSectionCompleted ? 0 : Math.max(0, durationSec || 0));
  // If section is completed, show the completed rounds count, otherwise show "Round 1" (or resume from initialRoundsCompleted + 1)
  const [currentRound, setCurrentRound] = useState(isSectionCompleted ? initialRoundsCompleted : initialRoundsCompleted + 1);

  // Keep currentRoundRef in sync for timer callbacks
  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  // If section is completed, all exercises should show as completed
  const [exerciseCompletions, setExerciseCompletions] = useState<boolean[]>(
    isSectionCompleted ? exercises.map(() => true) : exercises.map((ex) => ex.completed === 'completed')
  );

  // Completion overlay states
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const completionOverlayOpacity = useSharedValue(0);
  const completionTextScale = useSharedValue(0.5);
  const lastCompletionMessageRef = useRef(-1);

  // Next round overlay states
  const [showNextRoundOverlay, setShowNextRoundOverlay] = useState(false);
  const nextRoundOverlayOpacity = useSharedValue(0);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize timer on mount
  useEffect(() => {
    // If section is already completed, don't start timer - allow normal navigation
    if (isSectionCompleted) {
      hasCompletedRef.current = true;
      setTimeRemaining(0); // Show 0:00 to indicate completed
      return;
    }

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

    // Helper to show completion celebration
    const showCelebration = () => {
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
        setTimeout(() => {
          onSectionCompleteRef.current(currentRoundRef.current - 1);
        }, 1400);
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

      // Auto dismiss and complete after delay
      setTimeout(() => {
        completionOverlayOpacity.value = withTiming(0, { duration: 200 });
        setTimeout(() => {
          setShowCompletionOverlay(false);
          // Pass rounds completed (currentRound - 1 since currentRound is the one being worked on)
          onSectionCompleteRef.current(currentRoundRef.current - 1);
        }, 200);
      }, 1500);
    };

    // Helper to complete the AMRAP
    const completeAmrap = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Show completion celebration overlay
      showCelebration();
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
            // Show completion celebration
            const messages = en.training.session.exerciseComplete;
            if (messages && messages.length > 0) {
              let messageIndex: number;
              do {
                messageIndex = Math.floor(Math.random() * messages.length);
              } while (messageIndex === lastCompletionMessageRef.current && messages.length > 1);
              lastCompletionMessageRef.current = messageIndex;

              const message = messages[messageIndex];

              // Use parent overlay callback if available (covers entire screen)
              if (onShowCompletionOverlay) {
                onShowCompletionOverlay(message);
                setTimeout(() => {
                  onSectionCompleteRef.current(currentRoundRef.current - 1);
                }, 1400);
                return;
              }

              // Fallback to local overlay
              setCompletionMessage(message);
            }
            setShowCompletionOverlay(true);
            completionOverlayOpacity.value = withTiming(1, { duration: 200 });
            completionTextScale.value = withSequence(
              withTiming(1.1, { duration: 250 }),
              withTiming(1, { duration: 150 })
            );
            setTimeout(() => {
              completionOverlayOpacity.value = withTiming(0, { duration: 200 });
              setTimeout(() => {
                setShowCompletionOverlay(false);
                onSectionCompleteRef.current(currentRoundRef.current - 1);
              }, 200);
            }, 1500);
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
    // Use parent overlay callback if available (covers entire screen)
    if (onShowPhaseOverlayRef.current) {
      onShowPhaseOverlayRef.current(t('training.session.circuit.nextRound' as any) || 'Next Round! 💪', 800);
      setTimeout(completeRoundInternal, 1000);
      return;
    }

    // Fallback to local overlay
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
      {/* Completion celebration overlay */}
      {showCompletionOverlay && (
        <Animated.View style={[styles.completionOverlay, completionOverlayAnimatedStyle]}>
          <LottieView
            ref={lottieRef}
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

      {/* Next round overlay */}
      {showNextRoundOverlay && (
        <Animated.View style={[styles.nextRoundOverlay, nextRoundOverlayAnimatedStyle]}>
          <Text style={styles.nextRoundText}>
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
                {isSectionCompleted
                  ? t('training.session.amrap.roundsCompleted' as any, { count: currentRound }) || `${currentRound} Rounds Completed`
                  : currentRound === 1
                    ? t('training.session.amrap.roundOne' as any) || 'Round 1'
                    : t('training.session.amrap.roundX' as any, { round: currentRound }) || `Round ${currentRound}`}
              </Text>
            </View>
            {/* Countdown Timer */}
            <View style={[styles.timerContainer, { backgroundColor: `${getTimerColor()}20` }]}>
              <Text style={[styles.timerText, { color: getTimerColor() }]}>
                {isSectionCompleted ? t('training.session.amrap.complete' as any) || 'Done' : formatTime(timeRemaining)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Complete Round Button - only show if section is not completed */}
        {!isSectionCompleted && (
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
        )}
      </View>

      {/* Exercise Cards */}
      <View style={styles.exerciseList}>
        {exercises.map((exercise, index) => {
          const exerciseData = exerciseDataMap.get(exercise.prescribedExerciseId);
          const isCompleted = exerciseCompletions[index] ?? (exercise.completed === 'completed');
          const exerciseWithSets: RegularExercisePayload = {
            ...exercise,
            sets: [
              {
                setNumber: 1,
                type: 'normal',
                restSec: exercise.restSec || 0,
                completed: isCompleted ? 'completed' : 'not_started',
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
    fontSize: 48,
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
