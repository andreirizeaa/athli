import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, AppState, AppStateStatus } from 'react-native';
import { Flame, Coffee } from 'lucide-react-native';
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

type TabataRoundPageProps = {
  sectionId: string;
  sectionName: string;
  workSec: number;
  restSec: number;
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
  /** If true, all exercises are complete - don't auto-advance, let user use Next button */
  allExercisesComplete?: boolean;
};

const TABATA_COLOR = '#F43F5E'; // Rose/pink-red for Tabata (distinct from timer red)

type TimerPhase = 'work' | 'rest';

export const TabataRoundPage = ({
  sectionId,
  sectionName,
  workSec,
  restSec,
  currentRound,
  totalRounds,
  exercises,
  exerciseDataMap,
  onExerciseComplete,
  onExerciseValueChange,
  onRoundComplete,
  isPaused,
  isRoundCompleted = false,
  allExercisesComplete = false,
}: TabataRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Refs for timer management - using refs to avoid stale closures
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const phaseStartTimeRef = useRef<number>(Date.now());
  const currentPhaseRef = useRef<TimerPhase>('work');
  const workSecRef = useRef(workSec);
  const restSecRef = useRef(restSec);
  const isPausedRef = useRef(isPaused);
  const onRoundCompleteRef = useRef(onRoundComplete);
  const currentRoundRef = useRef(currentRound);
  const totalRoundsRef = useRef(totalRounds);
  const tickFunctionRef = useRef<(() => void) | null>(null);

  // Completion celebration overlay state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const completionOverlayOpacity = useSharedValue(0);
  const completionTextScale = useSharedValue(0.5);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCompletionMessageRef = useRef(-1);
  const hasShownCompletionRef = useRef(false);

  // Ref to track allExercisesComplete
  const allExercisesCompleteRef = useRef(allExercisesComplete);

  // Keep refs updated with latest prop values
  useEffect(() => {
    workSecRef.current = workSec;
  }, [workSec]);

  useEffect(() => {
    restSecRef.current = restSec;
  }, [restSec]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    onRoundCompleteRef.current = onRoundComplete;
  }, [onRoundComplete]);

  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  useEffect(() => {
    totalRoundsRef.current = totalRounds;
  }, [totalRounds]);

  useEffect(() => {
    allExercisesCompleteRef.current = allExercisesComplete;
  }, [allExercisesComplete]);

  // Timer state - ensure we have a valid initial value
  const [currentPhase, setCurrentPhase] = useState<TimerPhase>('work');
  const [timeRemaining, setTimeRemaining] = useState(Math.max(0, workSec || 0));

  // Overlay states
  const [showPhaseOverlay, setShowPhaseOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const overlayOpacity = useSharedValue(0);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize timer on mount - runs once per component instance
  useEffect(() => {
    // If round is already completed, don't start timer - allow normal navigation
    if (isRoundCompleted) {
      hasCompletedRef.current = true;
      setCurrentPhase('work');
      setTimeRemaining(workSec); // Show full work time
      return;
    }

    // Set up refs for this round
    hasCompletedRef.current = false;
    phaseStartTimeRef.current = Date.now();
    currentPhaseRef.current = 'work';

    // Set initial state - ensure valid values
    setCurrentPhase('work');
    setTimeRemaining(Math.max(0, workSec || 0));

    // Helper to calculate remaining time for current phase
    const calculateRemaining = (): number => {
      const phaseDuration = currentPhaseRef.current === 'work' ? workSecRef.current : restSecRef.current;
      const elapsed = Math.floor((Date.now() - phaseStartTimeRef.current) / 1000);
      return Math.max(0, phaseDuration - elapsed);
    };

    // Helper to show phase transition overlay
    const showTransitionOverlay = (text: string, onComplete: () => void) => {
      setOverlayText(text);
      setShowPhaseOverlay(true);
      overlayOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 200 }, () => {
          runOnJS(setShowPhaseOverlay)(false);
          runOnJS(onComplete)();
        })
      );
    };

    // Helper to complete the round
    const completeRound = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // If all exercises are complete, don't auto-advance - let user use Next button
      if (allExercisesCompleteRef.current) {
        return;
      }

      // Check if this is the last round
      const isLastRound = currentRoundRef.current >= totalRoundsRef.current;

      if (isLastRound) {
        // Last round - show complete overlay
        showTransitionOverlay(
          t('training.session.tabata.complete' as any) || 'Complete! 🎉',
          () => {
            onRoundCompleteRef.current();
          }
        );
      } else {
        // Not last round - show "WORK" overlay and advance
        showTransitionOverlay(
          t('training.session.tabata.work' as any) || 'WORK 💪',
          () => {
            onRoundCompleteRef.current();
          }
        );
      }
    };

    // Helper to transition to rest phase
    const transitionToRest = () => {
      // Start rest phase immediately (don't wait for overlay)
      currentPhaseRef.current = 'rest';
      phaseStartTimeRef.current = Date.now();
      setCurrentPhase('rest');
      setTimeRemaining(restSecRef.current);
      
      // Show overlay (non-blocking)
      showTransitionOverlay(
        t('training.session.tabata.rest' as any) || 'REST 😮‍💨',
        () => {
          // Overlay dismissed
        }
      );
      
      // Restart timer for rest phase immediately (after a brief delay to ensure state is updated)
      setTimeout(() => {
        if (!hasCompletedRef.current && !isPausedRef.current && timerRef.current === null && tickFunctionRef.current) {
          timerRef.current = setInterval(tickFunctionRef.current, 1000);
        }
      }, 50);
    };

    // Tick function called every second
    const tick = () => {
      if (hasCompletedRef.current || isPausedRef.current) return;

      const remaining = calculateRemaining();
      const clampedRemaining = Math.max(0, remaining);
      setTimeRemaining(clampedRemaining);

      if (clampedRemaining <= 0) {
        // Clear the interval during transition
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (currentPhaseRef.current === 'work') {
          // Work phase ended, transition to rest
          transitionToRest();
        } else if (currentPhaseRef.current === 'rest') {
          // Rest phase ended, complete round
          completeRound();
        }
      }
    };

    // Store tick function in ref for pause/resume access
    tickFunctionRef.current = tick;

    // Start the countdown timer
    timerRef.current = setInterval(tick, 1000);

    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !isPausedRef.current && !hasCompletedRef.current) {
        const remaining = calculateRemaining();
        setTimeRemaining(remaining);
        // Note: phase transitions will be handled by the next tick
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
    } else if (timerRef.current === null && !showPhaseOverlay) {
      // Resume: restart interval if not already running and not showing overlay
      const calculateRemainingForResume = (): number => {
        const phaseDuration = currentPhaseRef.current === 'work' ? workSecRef.current : restSecRef.current;
        const elapsed = Math.floor((Date.now() - phaseStartTimeRef.current) / 1000);
        return Math.max(0, phaseDuration - elapsed);
      };

      const remaining = calculateRemainingForResume();
      const clampedRemaining = Math.max(0, remaining);
      setTimeRemaining(clampedRemaining);

      // Restart the timer using the tick function from ref
      if (timerRef.current === null && tickFunctionRef.current && !hasCompletedRef.current) {
        // If phase expired while paused, tick will handle the transition
        timerRef.current = setInterval(tickFunctionRef.current, 1000);
      }
    }
  }, [isPaused, showPhaseOverlay, overlayOpacity, t, currentRound, totalRounds]);

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

  // Handle exercise completion toggle
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
      // The timer's completeRound() function will handle advancing when work+rest phases complete
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

  // Animated style for overlay
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

  // Get timer color based on ratio of time remaining
  // For rest phase, always return TABATA_COLOR (rose)
  // For work phase, start with TABATA_COLOR, then amber, then red (like EMOM/HIIT)
  const getTimerColor = (): string => {
    // Rest phase always uses Tabata color
    if (currentPhase === 'rest') {
      return TABATA_COLOR;
    }
    
    // Work phase uses dynamic colors based on time remaining (ratio-based like EMOM/HIIT)
    const phaseDuration = workSec;
    
    // Handle edge cases
    if (phaseDuration === 0) {
      return TABATA_COLOR; // Default to Tabata color if duration is 0
    }
    
    if (timeRemaining <= 0) {
      return '#EF4444'; // Red when time is up
    }
    
    // Ensure timeRemaining doesn't exceed phaseDuration
    const clampedTime = Math.min(timeRemaining, phaseDuration);
    const ratio = clampedTime / phaseDuration;
    
    // Start with TABATA_COLOR (rose) for first 60% (ratio > 0.4, i.e., 40-100% of time remaining)
    // This includes when ratio = 1.0 (full time remaining)
    if (ratio > 0.4) {
      return TABATA_COLOR;
    }
    // Amber: 20-40% (ratio 0.2-0.4, i.e., 20-40% of time remaining)
    if (ratio > 0.2) {
      return '#F59E0B';
    }
    // Red: last 20% (ratio <= 0.2, i.e., 0-20% of time remaining)
    return '#EF4444';
  };

  // Get phase label
  const getPhaseLabel = (): string => {
    return currentPhase === 'work'
      ? t('training.session.tabata.workPhase' as any) || 'WORK'
      : t('training.session.tabata.restPhase' as any) || 'REST';
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

      {/* Phase Transition Overlay */}
      {showPhaseOverlay && (
        <Animated.View style={[styles.phaseOverlay, overlayAnimatedStyle]}>
          <Text style={styles.phaseOverlayText}>{overlayText}</Text>
        </Animated.View>
      )}

      {/* Round Indicator Card with Timer */}
      <View style={styles.roundCardContainer}>
        <Card style={[styles.roundCard, { borderColor: TABATA_COLOR, borderWidth: 2 }]}>
          <View style={styles.roundCardContent}>
            <View style={[styles.roundIconCircle, { backgroundColor: `${TABATA_COLOR}20` }]}>
              <PlatformIcon
                sf={currentPhase === 'work' ? 'flame' : 'cup.and.saucer'}
                IconComponent={currentPhase === 'work' ? Flame : Coffee}
                size={24}
                color={TABATA_COLOR}
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
              <Text style={[styles.timerPhaseLabel, { color: getTimerColor() }]}>
                {getPhaseLabel()}
              </Text>
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
  phaseOverlay: {
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
  phaseOverlayText: {
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
    justifyContent: 'center',
  },
  timerPhaseLabel: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
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
