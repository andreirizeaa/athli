import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
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

export default function WorkoutSessionModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslations();

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

  const { formattedTime, isPaused } = useWorkoutTimer(workoutData?.completedSummary ?? null);
  const { findExerciseById, findExercisesByIds } = useExerciseLookup();

  // Extract flat list of exercises from workout items
  const flatExercises = useMemo(() => {
    if (!workoutData?.items) {
      console.log('No items in workoutData');
      return [];
    }

    console.log('Processing items:', workoutData.items.length);

    const exercises: { exercise: RegularExercisePayload; itemIndex: number; groupIndex?: number; exerciseIndex?: number }[] = [];

    workoutData.items.forEach((item, itemIndex) => {
      if (item.itemType === 'exercise') {
        console.log('Found exercise:', item.data.prescribedExerciseId);
        exercises.push({ exercise: item.data, itemIndex });
      } else if (item.itemType === 'section') {
        const section = item.data;
        if (section.type === 'regular' || section.type === 'auxiliary') {
          section.exercises.forEach((group, groupIndex) => {
            group.exercises.forEach((ex, exerciseIndex) => {
              exercises.push({ exercise: ex, itemIndex, groupIndex, exerciseIndex });
            });
          });
        }
      }
    });

    console.log('Flat exercises count:', exercises.length);
    return exercises;
  }, [workoutData?.items]);

  // Parse workout on mount
  useEffect(() => {
    if (params.workoutPayload) {
      try {
        const parsed = JSON.parse(params.workoutPayload);
        console.log('Workout data:', JSON.stringify(parsed, null, 2));

        // The API returns workout_data nested - extract and merge
        const workoutData = parsed.workout_data || {};
        setWorkoutData({
          ...parsed,
          // Use top-level pre if set, otherwise use workout_data.pre
          pre: parsed.pre ?? workoutData.pre ?? DEFAULT_EXECUTION_FIELDS.pre,
          // Items are inside workout_data
          items: workoutData.items || [],
          // Use top-level completedSummary if set, otherwise use workout_data.completedSummary
          completedSummary: parsed.completedSummary ?? workoutData.completedSummary ?? DEFAULT_EXECUTION_FIELDS.completedSummary,
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

  // Get current exercise for step (step 1 is readiness, step 2+ are exercises)
  const getCurrentExercise = () => {
    if (currentStep <= 1) return null;
    const exerciseIndex = currentStep - 2; // 0-indexed
    return flatExercises[exerciseIndex] || null;
  };

  // Handle set completion toggle
  const handleSetComplete = async (setIndex: number, completed: boolean) => {
    if (!workoutData) return;
    const currentExerciseInfo = getCurrentExercise();
    if (!currentExerciseInfo) return;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const { itemIndex, groupIndex, exerciseIndex } = currentExerciseInfo;

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

  // Handle set value change
  const handleSetValueChange = async (
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => {
    if (!workoutData) return;
    const currentExerciseInfo = getCurrentExercise();
    if (!currentExerciseInfo) return;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const { itemIndex, groupIndex, exerciseIndex } = currentExerciseInfo;

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

  // Progress calculation - step 1 is readiness, steps 2+ are exercises, last step is summary
  const totalSteps = flatExercises.length + 2; // readiness + exercises + summary
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

  // Get current exercise info for rendering
  const currentExerciseInfo = getCurrentExercise();
  const currentExerciseData = currentExerciseInfo
    ? findExerciseById(currentExerciseInfo.exercise.prescribedExerciseId)
    : null;

  // Get alternatives data for current exercise
  const alternativesData = currentExerciseInfo?.exercise.alternatives
    ? findExercisesByIds(currentExerciseInfo.exercise.alternatives).map(ex => ({
        id: ex.exerciseId,
        name: ex.name,
        thumbnailUrl: ex.rawThumbnailUrl,
      }))
    : [];

  // Handle alternative exercise selection
  const handleAlternativeSelect = async (alternativeId: string) => {
    if (!workoutData || !currentExerciseInfo) return;

    const { itemIndex, groupIndex, exerciseIndex, exercise } = currentExerciseInfo;
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
    <ScreenWrapper
      scrollable={true}
      useImageBackground={false}
      overlay={bottomNavBar}
      contentContainerStyle={{ paddingBottom: bottomBarHeight }}
    >
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
          <ReadinessPage
            values={workoutData.pre}
            onValueChange={handleReadinessChange}
          />
        )}

        {/* Steps 2+: Exercises */}
        {workoutData && currentStep > 1 && currentStep <= flatExercises.length + 1 && currentExerciseInfo && (
          <ExerciseSessionCard
            exercise={currentExerciseInfo.exercise}
            exerciseName={currentExerciseData?.name || 'Exercise'}
            exerciseImageUrl={currentExerciseData?.rawThumbnailUrl}
            alternatives={alternativesData}
            onSetComplete={handleSetComplete}
            onSetValueChange={handleSetValueChange}
            onAlternativeSelect={handleAlternativeSelect}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
