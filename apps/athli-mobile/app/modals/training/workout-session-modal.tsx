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
import { SectionInfoPage } from '@/components/features/training/section-info-page';
import { CongratulationsPage } from '@/components/features/training/congratulations-page';
import { SessionFeedbackPage } from '@/components/features/training/session-feedback-page';
import {
  WorkoutSessionHeader,
  WorkoutSessionBottomNav,
  WorkoutSessionPageTitle,
} from '@/components/features/training/workout-session';
import {
  WorkoutPre,
  WorkoutPost,
  WorkoutPayload,
  WorkoutMeta,
  DEFAULT_EXECUTION_FIELDS,
  RegularExercisePayload,
  WorkoutItem,
  WorkoutSectionPayload,
  CircuitExercisePayload,
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

// Page types for navigation
type WorkoutPage =
  | { type: 'readiness' }
  | { type: 'section-info'; itemIndex: number; section: WorkoutSectionPayload }
  | { type: 'exercise'; itemIndex: number; exercise: RegularExercisePayload; groupIndex?: number; exerciseIndex?: number }
  | { type: 'circuit-exercise'; itemIndex: number; exercise: CircuitExercisePayload; groupIndex?: number; exerciseIndex?: number }
  | { type: 'congratulations' }
  | { type: 'feedback' }
  | { type: 'summary' };

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

  // Build the pages array based on workout items
  const pages = useMemo((): WorkoutPage[] => {
    if (!workoutData?.items) return [{ type: 'readiness' }];

    const pageList: WorkoutPage[] = [{ type: 'readiness' }];

    workoutData.items.forEach((item, itemIndex) => {
      if (item.itemType === 'exercise') {
        // Top-level exercise - add directly
        pageList.push({
          type: 'exercise',
          itemIndex,
          exercise: item.data,
        });
      } else if (item.itemType === 'section') {
        const section = item.data;

        // Add section info page first
        pageList.push({
          type: 'section-info',
          itemIndex,
          section,
        });

        // Then add exercise pages based on section type
        if (section.type === 'regular' || section.type === 'auxiliary') {
          // Regular sections have grouped exercises with sets
          section.exercises.forEach((group, groupIndex) => {
            group.exercises.forEach((exercise, exerciseIndex) => {
              pageList.push({
                type: 'exercise',
                itemIndex,
                exercise,
                groupIndex,
                exerciseIndex,
              });
            });
          });
        } else if (section.type === 'amrap') {
          // AMRAP has flat exercise array (RoundExercisePayload)
          section.exercises.forEach((exercise, exerciseIndex) => {
            // Convert RoundExercisePayload to a format we can display
            pageList.push({
              type: 'circuit-exercise',
              itemIndex,
              exercise: {
                ...exercise,
                set: {
                  setNumber: 1,
                  type: 'normal',
                  restSec: exercise.restSec,
                  completed: exercise.completed,
                  skipped: false,
                  trackableField1: exercise.trackableField1,
                  trackableField2: exercise.trackableField2,
                  dropset: null,
                },
              } as CircuitExercisePayload,
              exerciseIndex,
            });
          });
        } else {
          // Circuit-based sections (tabata, hiit, emom, circuits)
          section.exercises.forEach((group, groupIndex) => {
            group.exercises.forEach((exercise, exerciseIndex) => {
              pageList.push({
                type: 'circuit-exercise',
                itemIndex,
                exercise,
                groupIndex,
                exerciseIndex,
              });
            });
          });
        }
      }
    });

    // Add end-of-workout pages: congratulations, feedback, then summary
    pageList.push({ type: 'congratulations' });
    pageList.push({ type: 'feedback' });
    pageList.push({ type: 'summary' });

    return pageList;
  }, [workoutData?.items]);

  // Parse workout on mount
  useEffect(() => {
    if (params.workoutPayload) {
      try {
        const parsed = JSON.parse(params.workoutPayload);
        console.log('RAW WORKOUT PAYLOAD:', JSON.stringify(parsed, null, 2));

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
    if (currentStep < pages.length) {
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

  // Detect navigation to superset page and show overlay (placeholder for now)
  useEffect(() => {
    previousStepRef.current = currentStep;
  }, [currentStep]);

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

  // Feedback change handler
  const handleFeedbackChange = async (field: keyof WorkoutPost, value: number | string | null) => {
    if (!workoutData) return;

    const currentPost = workoutData.post || DEFAULT_EXECUTION_FIELDS.post;
    const updatedData = {
      ...workoutData,
      post: { ...currentPost, [field]: value },
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
      console.error('Failed to save feedback value:', error);
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

  // Get current page
  const currentPage = pages[currentStep - 1] || { type: 'readiness' };

  // Handle set completion toggle for regular exercises
  const handleSetComplete = async (setIndex: number, completed: boolean) => {
    if (!workoutData || currentPage.type !== 'exercise') return;
    const { itemIndex, groupIndex, exerciseIndex } = currentPage;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
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

  // Handle set value change for regular exercises
  const handleSetValueChange = async (
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => {
    if (!workoutData || currentPage.type !== 'exercise') return;
    const { itemIndex, groupIndex, exerciseIndex } = currentPage;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
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

  // Handle alternative exercise selection
  const handleAlternativeSelect = async (alternativeId: string) => {
    if (!workoutData || currentPage.type !== 'exercise') return;
    const { itemIndex, groupIndex, exerciseIndex, exercise } = currentPage;
    const currentExerciseId = exercise.prescribedExerciseId;

    // Deep clone the items to update
    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];

    // Helper to swap exercise IDs
    const swapExercise = (ex: RegularExercisePayload) => {
      ex.prescribedExerciseId = alternativeId;
      ex.alternatives = ex.alternatives.filter(id => id !== alternativeId);
      ex.alternatives.push(currentExerciseId);
    };

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

  // Progress calculation
  const totalSteps = pages.length;
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
  const canGoNext = currentStep < totalSteps && (currentPage.type !== 'readiness' || isReadinessComplete());

  // Get page title based on current page
  const getPageTitle = (): string => {
    if (currentPage.type === 'readiness') {
      return t('training.readiness.title' as any);
    }
    if (currentPage.type === 'section-info') {
      return '';
    }
    if (currentPage.type === 'congratulations') {
      return '';
    }
    if (currentPage.type === 'feedback') {
      return t('training.session.feedback.title' as any);
    }
    if (currentPage.type === 'summary') {
      return t('training.session.summary.title' as any);
    }
    // For exercise pages, return empty - the exercise name is shown in the card
    return '';
  };

  // Get exercise data for current page
  const currentExerciseData = useMemo(() => {
    if (currentPage.type !== 'exercise' && currentPage.type !== 'circuit-exercise') return null;
    return findExerciseById(currentPage.exercise.prescribedExerciseId);
  }, [currentPage, findExerciseById]);

  // Get alternatives data for current exercise
  const alternativesData = useMemo(() => {
    if (currentPage.type !== 'exercise') return [];
    return currentPage.exercise.alternatives
      ? findExercisesByIds(currentPage.exercise.alternatives).map(ex => ({
          id: ex.exerciseId,
          name: ex.name,
          thumbnailUrl: ex.rawThumbnailUrl,
        }))
      : [];
  }, [currentPage, findExercisesByIds]);

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

  // Render current page content
  const renderPageContent = () => {
    if (!workoutData) return null;

    switch (currentPage.type) {
      case 'readiness':
        return (
          <View style={styles.readinessContainer}>
            <ReadinessPage
              values={workoutData.pre}
              onValueChange={handleReadinessChange}
            />
          </View>
        );

      case 'section-info':
        return (
          <View style={styles.sectionInfoContainer}>
            <SectionInfoPage section={currentPage.section} />
          </View>
        );

      case 'exercise':
        return (
          <View style={styles.exerciseContainer}>
            <ExerciseSessionCard
              exercise={currentPage.exercise}
              exerciseName={currentExerciseData?.name || 'Exercise'}
              exerciseImageUrl={currentExerciseData?.rawThumbnailUrl}
              alternatives={alternativesData}
              onSetComplete={handleSetComplete}
              onSetValueChange={handleSetValueChange}
              onAlternativeSelect={handleAlternativeSelect}
            />
          </View>
        );

      case 'circuit-exercise':
        // For circuit exercises, we'll show a simplified view for now
        return (
          <View style={styles.exerciseContainer}>
            <ExerciseSessionCard
              exercise={{
                ...currentPage.exercise,
                sets: [currentPage.exercise.set],
              } as RegularExercisePayload}
              exerciseName={currentExerciseData?.name || 'Exercise'}
              exerciseImageUrl={currentExerciseData?.rawThumbnailUrl}
              alternatives={[]}
              onSetComplete={handleSetComplete}
              onSetValueChange={handleSetValueChange}
              onAlternativeSelect={handleAlternativeSelect}
            />
          </View>
        );

      case 'congratulations':
        return (
          <View style={styles.congratulationsContainer}>
            <CongratulationsPage />
          </View>
        );

      case 'feedback':
        return (
          <View style={styles.feedbackContainer}>
            <SessionFeedbackPage
              values={workoutData.post || DEFAULT_EXECUTION_FIELDS.post}
              onValueChange={handleFeedbackChange}
            />
          </View>
        );

      case 'summary':
        return (
          <View style={styles.summaryContainer}>
            <Text style={[styles.summaryText, { color: themeColors.text }]}>
              {t('training.session.summary.title' as any)}
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

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
          {renderPageContent()}
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
  sectionInfoContainer: {
    flex: 1,
    minHeight: 400,
  },
  exerciseContainer: {
    flex: 1,
  },
  congratulationsContainer: {
    flex: 1,
    minHeight: 400,
  },
  feedbackContainer: {
    flex: 1,
  },
  summaryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: 400,
  },
  summaryText: {
    ...typography.h1,
    textAlign: 'center',
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
