import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

import { useTranslations, useThemePreference } from '@/stores';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { typography } from '@/constants/typography';
import { assignWorkout } from '@/services/client/client-training-service';
import { ReadinessPage } from '@/components/features/training/readiness-page';
import { ExerciseSessionCard } from '@/components/features/training/exercise-session-card';
import {
  WorkoutSessionHeader,
  WorkoutSessionBottomNav,
  WorkoutSessionPageTitle,
} from '@/components/features/training/workout-session';
import {
  WorkoutPre,
  WorkoutPayload,
  WorkoutMeta,
  DEFAULT_EXECUTION_FIELDS,
  RegularExercisePayload,
  WorkoutItem,
} from '@athli/shared-types';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { useExerciseLookup } from '@/hooks/useAllExercises';

// Constants
const BOTTOM_NAV_HEIGHT = 80;
const CONTENT_BOTTOM_PADDING = 24;

// Superset announcement messages
const SUPERSET_MESSAGES = [
  'Killer superset incoming 💪',
  'Superset time! No rest for the brave 🔥',
  'Double trouble ahead 👊',
  'Superset alert! Let\'s go 🚀',
  'Time to feel the burn 🔥',
  'Back to back, no looking back 💥',
  'Superset mode: activated ⚡',
];

export default function WorkoutSessionModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslations();
  const { colors: themeColors } = useThemePreference();

  const params = useLocalSearchParams<{
    workoutId: string;
    date: string;
    clientId: string;
    coachId: string;
    workoutPayload: string;
  }>();

  const [workoutData, setWorkoutData] = useState<WorkoutPayload | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [hasUpdatedStatus, setHasUpdatedStatus] = useState(false);

  // Superset overlay state
  const [showSupersetOverlay, setShowSupersetOverlay] = useState(false);
  const [supersetMessage, setSupersetMessage] = useState('');
  const supersetOverlayOpacity = useSharedValue(0);
  const supersetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStepRef = useRef(currentStep);

  const { formattedTime, isPaused } = useWorkoutTimer(workoutData?.completedSummary ?? null);
  const { findExerciseById, findExercisesByIds } = useExerciseLookup();

  // Type for exercise info
  type ExerciseInfo = { exercise: RegularExercisePayload; itemIndex: number; groupIndex?: number; exerciseIndex?: number };

  // Extract exercises grouped by superset (supersetted exercises appear together)
  const exerciseGroups = useMemo(() => {
    if (!workoutData?.items) {
      console.log('No items in workoutData');
      return [];
    }

    console.log('Processing items:', workoutData.items.length);

    const allExercises: ExerciseInfo[] = [];

    workoutData.items.forEach((item, itemIndex) => {
      if (item.itemType === 'exercise') {
        console.log('Found exercise:', item.data.prescribedExerciseId);
        allExercises.push({ exercise: item.data, itemIndex });
      } else if (item.itemType === 'section') {
        const section = item.data;
        if (section.type === 'regular' || section.type === 'auxiliary') {
          section.exercises.forEach((group, groupIndex) => {
            group.exercises.forEach((ex, exerciseIndex) => {
              allExercises.push({ exercise: ex, itemIndex, groupIndex, exerciseIndex });
            });
          });
        }
      }
    });

    // Group exercises by superset - consecutive exercises with same supersetId go together
    const groups: ExerciseInfo[][] = [];
    let currentGroup: ExerciseInfo[] = [];
    let currentSupersetId: string | null = null;

    allExercises.forEach((exInfo, index) => {
      const supersetId = exInfo.exercise.supersetId || null;
      const nextExInfo = index < allExercises.length - 1 ? allExercises[index + 1] : null;
      const nextSupersetId = nextExInfo?.exercise.supersetId || null;

      if (supersetId && supersetId === currentSupersetId) {
        // Continue current superset group
        currentGroup.push(exInfo);
      } else if (supersetId && currentGroup.length === 0) {
        // Start new superset group
        currentGroup.push(exInfo);
        currentSupersetId = supersetId;
      } else if (currentGroup.length > 0) {
        // Finish current group and start new one
        groups.push(currentGroup);
        currentGroup = [exInfo];
        currentSupersetId = supersetId;
      } else {
        // Standalone exercise
        currentGroup = [exInfo];
        currentSupersetId = supersetId;
      }

      // If this is the last in a superset chain or standalone, push the group
      const isLastInSuperset = !supersetId || supersetId !== nextSupersetId;
      if (isLastInSuperset && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentSupersetId = null;
      }
    });

    // Push any remaining group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    console.log('Exercise groups count:', groups.length, 'from', allExercises.length, 'exercises');
    return groups;
  }, [workoutData?.items]);

  // Flatten for backward compatibility where needed
  const flatExercises = useMemo(() => {
    return exerciseGroups.flat();
  }, [exerciseGroups]);

  // Parse workout on mount
  useEffect(() => {
    if (params.workoutPayload) {
      try {
        const parsed = JSON.parse(params.workoutPayload);
        console.log('Workout data:', JSON.stringify(parsed, null, 2));

        // The API returns workout_data nested - extract and merge
        // Note: items may be at top level (web-created) or inside workout_data (legacy)
        const nestedWorkoutData = parsed.workout_data || {};
        setWorkoutData({
          ...parsed,
          // Use top-level pre if set, otherwise use workout_data.pre
          pre: parsed.pre ?? nestedWorkoutData.pre ?? DEFAULT_EXECUTION_FIELDS.pre,
          // Items can be at top level (web-created workouts) or inside workout_data
          items: parsed.items || nestedWorkoutData.items || [],
          // Use top-level completedSummary if set, otherwise use workout_data.completedSummary
          completedSummary: parsed.completedSummary ?? nestedWorkoutData.completedSummary ?? DEFAULT_EXECUTION_FIELDS.completedSummary,
        });
      } catch (error) {
        console.error('Failed to parse workout payload:', error);
      }
    }
  }, [params.workoutPayload]);

  // Update workout status to in_progress on mount (or resume if paused)
  useEffect(() => {
    const updateStatus = async () => {
      if (hasUpdatedStatus) return;
      if (!params.clientId || !params.date || !workoutData) return;

      try {
        const currentStatus = workoutData.completedSummary?.status;
        const isPausedNow = !!workoutData.completedSummary?.pausedAt;

        let updatedSummary: WorkoutMeta;

        if (currentStatus === 'in_progress' && isPausedNow) {
          // Resume from pause - calculate paused duration and clear pausedAt
          const pauseStart = new Date(workoutData.completedSummary!.pausedAt!).getTime();
          const pausedDuration = Date.now() - pauseStart;
          updatedSummary = {
            ...workoutData.completedSummary!,
            pausedAt: null,
            totalPausedMs: (workoutData.completedSummary!.totalPausedMs || 0) + pausedDuration,
          };
        } else if (currentStatus !== 'in_progress') {
          // Starting fresh or no completedSummary - set status and startedAt
          updatedSummary = {
            ...(workoutData.completedSummary || {}),
            status: 'in_progress' as const,
            startedAt: new Date().toISOString(),
            pausedAt: null,
            totalPausedMs: 0,
          } as WorkoutMeta;
        } else {
          // Already in progress and not paused - no changes needed
          setHasUpdatedStatus(true);
          return;
        }

        const updatedPayload = {
          ...workoutData,
          completedSummary: updatedSummary,
        };

        await assignWorkout({
          workoutId: params.workoutId,
          clientId: params.clientId,
          ...(params.coachId && { coachId: params.coachId }),
          date: params.date,
          workoutPayload: updatedPayload,
        });

        setWorkoutData(updatedPayload);
        setHasUpdatedStatus(true);
      } catch (error) {
        console.error('Failed to update workout status:', error);
      }
    };

    updateStatus();
  }, [workoutData, params, hasUpdatedStatus]);

  // Resume workout helper (used by navigation and toggle)
  const resumeWorkout = async () => {
    if (!workoutData?.completedSummary?.pausedAt) return;

    const pauseStart = new Date(workoutData.completedSummary.pausedAt).getTime();
    const pausedDuration = Date.now() - pauseStart;
    const updatedSummary: WorkoutMeta = {
      ...workoutData.completedSummary,
      pausedAt: null,
      totalPausedMs: (workoutData.completedSummary.totalPausedMs || 0) + pausedDuration,
    };

    const updated = { ...workoutData, completedSummary: updatedSummary };
    setWorkoutData(updated);

    try {
      await assignWorkout({
        workoutId: params.workoutId,
        clientId: params.clientId,
        ...(params.coachId && { coachId: params.coachId }),
        date: params.date,
        workoutPayload: updated,
      });
    } catch (error) {
      console.error('Failed to resume workout:', error);
    }
  };

  // Pause workout helper (used by close handler and toggle)
  const pauseWorkout = async () => {
    if (!workoutData?.completedSummary || workoutData.completedSummary.pausedAt) return;

    const updatedSummary: WorkoutMeta = {
      ...workoutData.completedSummary,
      pausedAt: new Date().toISOString(),
    };

    const updated = { ...workoutData, completedSummary: updatedSummary };
    setWorkoutData(updated);

    try {
      await assignWorkout({
        workoutId: params.workoutId,
        clientId: params.clientId,
        ...(params.coachId && { coachId: params.coachId }),
        date: params.date,
        workoutPayload: updated,
      });
    } catch (error) {
      console.error('Failed to pause workout:', error);
    }
  };

  // Navigation handlers
  const handleClose = () => {
    router.back();
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      if (isPaused) resumeWorkout();
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      if (isPaused) resumeWorkout();
      setCurrentStep(currentStep + 1);
    }
  };

  // Dismiss superset overlay
  const dismissSupersetOverlay = useCallback(() => {
    if (supersetTimeoutRef.current) {
      clearTimeout(supersetTimeoutRef.current);
      supersetTimeoutRef.current = null;
    }
    supersetOverlayOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(setShowSupersetOverlay)(false);
    });
  }, [supersetOverlayOpacity]);

  // Detect navigation to superset page and show overlay
  useEffect(() => {
    // Only trigger when moving forward (next button)
    if (currentStep > previousStepRef.current && currentStep > 1) {
      const groupIndex = currentStep - 2;
      const group = exerciseGroups[groupIndex];

      // Check if this is a superset (more than 1 exercise in group)
      if (group && group.length > 1) {
        // Pick a random message
        const randomMessage = SUPERSET_MESSAGES[Math.floor(Math.random() * SUPERSET_MESSAGES.length)];
        setSupersetMessage(randomMessage);
        setShowSupersetOverlay(true);
        supersetOverlayOpacity.value = withTiming(1, { duration: 300 });

        // Auto-dismiss after 3 seconds
        supersetTimeoutRef.current = setTimeout(() => {
          dismissSupersetOverlay();
        }, 3000);
      }
    }
    previousStepRef.current = currentStep;
  }, [currentStep, exerciseGroups, supersetOverlayOpacity, dismissSupersetOverlay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (supersetTimeoutRef.current) {
        clearTimeout(supersetTimeoutRef.current);
      }
    };
  }, []);

  // Animated style for superset overlay
  const supersetOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: supersetOverlayOpacity.value,
  }));

  // Readiness change handler
  const handleReadinessChange = async (field: keyof WorkoutPre, value: number) => {
    if (!workoutData) return;

    const updatedData = {
      ...workoutData,
      pre: { ...workoutData.pre, [field]: value },
    };
    setWorkoutData(updatedData);

    try {
      await assignWorkout({
        workoutId: params.workoutId,
        clientId: params.clientId,
        ...(params.coachId && { coachId: params.coachId }),
        date: params.date,
        workoutPayload: updatedData,
      });
    } catch (error) {
      console.error('Failed to save readiness value:', error);
    }
  };

  // Pause toggle handler
  const handleTogglePause = async () => {
    if (!workoutData || !workoutData.completedSummary) return;

    if (workoutData.completedSummary.pausedAt) {
      await resumeWorkout();
    } else {
      await pauseWorkout();
    }
  };

  // Get current exercise group for step (step 1 is readiness, step 2+ are exercise groups)
  const getCurrentExerciseGroup = () => {
    if (currentStep <= 1) return null;
    const groupIndex = currentStep - 2; // 0-indexed
    return exerciseGroups[groupIndex] || null;
  };

  // Get current exercise for step (backward compatibility - returns first exercise in group)
  const getCurrentExercise = () => {
    const group = getCurrentExerciseGroup();
    return group?.[0] || null;
  };

  // Handle set completion toggle (with exercise index in group)
  const handleSetComplete = async (setIndex: number, completed: boolean, exerciseIndexInGroup: number = 0) => {
    if (!workoutData || !currentExerciseGroup) return;
    const exerciseInfo = currentExerciseGroup[exerciseIndexInGroup];
    if (!exerciseInfo) return;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const { itemIndex, groupIndex, exerciseIndex } = exerciseInfo;

    // Find and update the set
    const item = updatedItems[itemIndex];
    if (item.itemType === 'exercise') {
      item.data.sets[setIndex].completed = completed;
    } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
      if (groupIndex !== undefined && exerciseIndex !== undefined) {
        item.data.exercises[groupIndex].exercises[exerciseIndex].sets[setIndex].completed = completed;
      }
    }

    const updatedData = { ...workoutData, items: updatedItems };
    setWorkoutData(updatedData);

    try {
      await assignWorkout({
        workoutId: params.workoutId,
        clientId: params.clientId,
        ...(params.coachId && { coachId: params.coachId }),
        date: params.date,
        workoutPayload: updatedData,
      });
    } catch (error) {
      console.error('Failed to save set completion:', error);
    }
  };

  // Handle set value change (with exercise index in group)
  const handleSetValueChange = async (
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string,
    exerciseIndexInGroup: number = 0
  ) => {
    if (!workoutData || !currentExerciseGroup) return;
    const exerciseInfo = currentExerciseGroup[exerciseIndexInGroup];
    if (!exerciseInfo) return;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const { itemIndex, groupIndex, exerciseIndex } = exerciseInfo;

    // Find and update the value
    const item = updatedItems[itemIndex];
    if (item.itemType === 'exercise') {
      item.data.sets[setIndex][field].completed = value;
    } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
      if (groupIndex !== undefined && exerciseIndex !== undefined) {
        item.data.exercises[groupIndex].exercises[exerciseIndex].sets[setIndex][field].completed = value;
      }
    }

    const updatedData = { ...workoutData, items: updatedItems };
    setWorkoutData(updatedData);

    try {
      await assignWorkout({
        workoutId: params.workoutId,
        clientId: params.clientId,
        ...(params.coachId && { coachId: params.coachId }),
        date: params.date,
        workoutPayload: updatedData,
      });
    } catch (error) {
      console.error('Failed to save set value:', error);
    }
  };

  // Progress calculation - step 1 is readiness, steps 2+ are exercise groups, last step is summary
  const totalSteps = exerciseGroups.length + 2; // readiness + exercise groups + summary
  const progressPercent = (currentStep / totalSteps) * 100;

  // Readiness validation
  const isReadinessComplete = (): boolean => {
    if (!workoutData?.pre) return false;
    const { sleep, mood, energy, stress, soreness } = workoutData.pre;
    return (
      sleep !== null &&
      mood !== null &&
      energy !== null &&
      stress !== null &&
      soreness !== null
    );
  };

  // Navigation state
  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < totalSteps && (currentStep !== 1 || isReadinessComplete());

  // Get page title based on current step
  const getPageTitle = (): string => {
    if (currentStep === 1) {
      return t('training.readiness.title' as any);
    }
    // For exercise steps, return empty - the exercise name is shown in the card
    return '';
  };

  // Get current exercise group for rendering
  const currentExerciseGroup = getCurrentExerciseGroup();

  // Get exercise data for all exercises in current group
  const currentGroupData = useMemo(() => {
    if (!currentExerciseGroup) return [];
    return currentExerciseGroup.map(exInfo => {
      const exerciseData = findExerciseById(exInfo.exercise.prescribedExerciseId);
      const alternativesData = exInfo.exercise.alternatives
        ? findExercisesByIds(exInfo.exercise.alternatives).map(ex => ({
            id: ex.exerciseId,
            name: ex.name,
            thumbnailUrl: ex.rawThumbnailUrl,
          }))
        : [];
      return {
        exInfo,
        exerciseData,
        alternativesData,
      };
    });
  }, [currentExerciseGroup, findExerciseById, findExercisesByIds]);

  // Backward compatibility
  const currentExerciseInfo = getCurrentExercise();
  const currentExerciseData = currentExerciseInfo
    ? findExerciseById(currentExerciseInfo.exercise.prescribedExerciseId)
    : null;

  // Get alternatives data for current exercise (first in group for backward compat)
  const alternativesData = currentExerciseInfo?.exercise.alternatives
    ? findExercisesByIds(currentExerciseInfo.exercise.alternatives).map(ex => ({
        id: ex.exerciseId,
        name: ex.name,
        thumbnailUrl: ex.rawThumbnailUrl,
      }))
    : [];

  // Handle alternative exercise selection (with exercise index in group)
  const handleAlternativeSelect = async (alternativeId: string, exerciseIndexInGroup: number = 0) => {
    if (!workoutData || !currentExerciseGroup) return;
    const exerciseInfo = currentExerciseGroup[exerciseIndexInGroup];
    if (!exerciseInfo) return;

    const { itemIndex, groupIndex, exerciseIndex, exercise } = exerciseInfo;
    const currentExerciseId = exercise.prescribedExerciseId;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];

    // Helper to swap exercise IDs
    const swapExercise = (ex: RegularExercisePayload) => {
      // Set the new exercise ID
      ex.prescribedExerciseId = alternativeId;
      // Update alternatives: remove the new one, add the old one
      ex.alternatives = ex.alternatives.filter(id => id !== alternativeId);
      ex.alternatives.push(currentExerciseId);
    };

    // Find and update the exercise
    if (item.itemType === 'exercise') {
      swapExercise(item.data);
    } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
      if (groupIndex !== undefined && exerciseIndex !== undefined) {
        swapExercise(item.data.exercises[groupIndex].exercises[exerciseIndex]);
      }
    }

    const updatedData = { ...workoutData, items: updatedItems };
    setWorkoutData(updatedData);

    try {
      await assignWorkout({
        workoutId: params.workoutId,
        clientId: params.clientId,
        ...(params.coachId && { coachId: params.coachId }),
        date: params.date,
        workoutPayload: updatedData,
      });
    } catch (error) {
      console.error('Failed to swap exercise:', error);
    }
  };

  // Bottom navigation overlay
  const bottomNavBar = (
    <WorkoutSessionBottomNav
      canGoBack={canGoBack}
      canGoNext={canGoNext}
      timerDisplay={formattedTime}
      bottomInset={insets.bottom}
      onPrevious={handlePrevious}
      onNext={handleNext}
    />
  );

  const bottomBarHeight = BOTTOM_NAV_HEIGHT + insets.bottom + CONTENT_BOTTOM_PADDING;

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={40}
        showsVerticalScrollIndicator={false}
      >
        {/* Status bar spacer */}
        <View style={{ height: insets.top }} />

        <WorkoutSessionHeader
          progressPercent={progressPercent}
          onClose={handleClose}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
        />

        {getPageTitle() && <WorkoutSessionPageTitle title={getPageTitle()} />}

        <View style={styles.content}>
          {/* Step 1: Readiness */}
          {workoutData && currentStep === 1 && (
            <View style={styles.readinessContainer}>
              <ReadinessPage
                values={workoutData.pre}
                onValueChange={handleReadinessChange}
              />
            </View>
          )}

          {/* Steps 2+: Exercise Groups (supersets shown together) */}
          {workoutData && currentStep > 1 && currentStep <= exerciseGroups.length + 1 && currentGroupData.length > 0 && (
            <View style={styles.exerciseGroupContainer}>
              {currentGroupData.map((item, indexInGroup) => (
                <ExerciseSessionCard
                  key={`${item.exInfo.exercise.prescribedExerciseId}-${indexInGroup}`}
                  exercise={item.exInfo.exercise}
                  exerciseName={item.exerciseData?.name || 'Exercise'}
                  exerciseImageUrl={item.exerciseData?.rawThumbnailUrl}
                  alternatives={item.alternativesData}
                  onSetComplete={(setIndex, completed) => handleSetComplete(setIndex, completed, indexInGroup)}
                  onSetValueChange={(setIndex, field, value) => handleSetValueChange(setIndex, field, value, indexInGroup)}
                  onAlternativeSelect={(altId) => handleAlternativeSelect(altId, indexInGroup)}
                  isSuperset={currentGroupData.length > 1}
                  supersetLabel={currentGroupData.length > 1 ? `${String.fromCharCode(65 + (currentStep - 2))}${indexInGroup + 1}` : undefined}
                />
              ))}
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom navigation */}
      {bottomNavBar}

      {/* Status bar blur overlay */}
      <StatusBarBlur blurHeight={20} />

      {/* Superset announcement overlay */}
      {showSupersetOverlay && (
        <Animated.View style={[styles.supersetOverlay, supersetOverlayAnimatedStyle]}>
          <Pressable style={styles.supersetOverlayPressable} onPress={dismissSupersetOverlay}>
            <Text style={[styles.supersetText, { color: themeColors.text }]}>
              {supersetMessage}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  readinessContainer: {
    paddingHorizontal: 16,
  },
  exerciseGroupContainer: {
    gap: 16,
  },
  supersetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    zIndex: 100,
  },
  supersetOverlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  supersetText: {
    ...typography.h2,
    textAlign: 'center',
  },
});
