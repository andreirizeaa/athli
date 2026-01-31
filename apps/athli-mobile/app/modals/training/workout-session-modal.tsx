import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { useTranslations, useThemePreference } from '@/stores';
import { en } from '@/lib/i18n/en';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Storage } from '@/lib/storage';
import { typography } from '@/constants/typography';
import { assignWorkout } from '@/services/client/client-training-service';
import { ReadinessPage } from '@/components/features/training/readiness-page';
import { ExerciseSessionCard } from '@/components/features/training/exercise-session-card';
import { SectionInfoPage } from '@/components/features/training/section-info-page';
import { CongratulationsPage } from '@/components/features/training/congratulations-page';
import { SessionFeedbackPage } from '@/components/features/training/session-feedback-page';
import { CircuitRoundPage } from '@/components/features/training/circuit-round-page';
import { EmomRoundPage } from '@/components/features/training/emom-round-page';
import { HiitRoundPage } from '@/components/features/training/hiit-round-page';
import { TabataRoundPage } from '@/components/features/training/tabata-round-page';
import { AmrapRoundPage } from '@/components/features/training/amrap-round-page';
import { SupersetRoundPage } from '@/components/features/training/superset-round-page';
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
  CircuitsSectionPayload,
  TabataSectionPayload,
  HiitSectionPayload,
  EmomSectionPayload,
  AmrapSectionPayload,
} from '@athli/shared-types';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { useExerciseLookup } from '@/hooks/useAllExercises';

// Constants
const BOTTOM_NAV_HEIGHT = 80;
const CONTENT_BOTTOM_PADDING = 24;
const EMOM_TIMER_KEY_PREFIX = 'emom_timer_';

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


// Circuit section type union
type CircuitSectionType = CircuitsSectionPayload | TabataSectionPayload | HiitSectionPayload | EmomSectionPayload;

// Page types for navigation
type WorkoutPage =
  | { type: 'readiness' }
  | { type: 'section-info'; itemIndex: number; section: WorkoutSectionPayload }
  | { type: 'exercise'; itemIndex: number; exercise: RegularExercisePayload; groupIndex?: number; exerciseIndex?: number }
  | { type: 'superset'; itemIndex: number; exercises: RegularExercisePayload[]; exerciseIndices: number[] }
  | { type: 'superset-round'; itemIndex: number; exercises: RegularExercisePayload[]; exerciseIndices: number[]; currentSet: number; totalSets: number; restSec: number }
  | { type: 'circuit-exercise'; itemIndex: number; exercise: CircuitExercisePayload; groupIndex?: number; exerciseIndex?: number }
  | { type: 'circuit-round'; itemIndex: number; section: CircuitSectionType; roundNumber: number; totalRounds: number }
  | { type: 'emom-round'; itemIndex: number; section: EmomSectionPayload; roundNumber: number; totalRounds: number; intervalSec: number }
  | { type: 'hiit-round'; itemIndex: number; section: HiitSectionPayload; roundNumber: number; totalRounds: number; workSec: number; restSec: number }
  | { type: 'tabata-round'; itemIndex: number; section: TabataSectionPayload; roundNumber: number; totalRounds: number; workSec: number; restSec: number }
  | { type: 'amrap-round'; itemIndex: number; section: AmrapSectionPayload; durationSec: number; initialRoundsCompleted: number }
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

  // Track local completion state for circuit rounds (resets each round)
  const [circuitRoundCompletions, setCircuitRoundCompletions] = useState<Map<string, boolean[]>>(new Map());

  // Superset overlay state
  const [showSupersetOverlay, setShowSupersetOverlay] = useState(false);
  const [supersetMessage, setSupersetMessage] = useState('');
  const supersetOverlayOpacity = useSharedValue(0);
  const supersetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStepRef = useRef(currentStep);

  // Completion celebration overlay state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const completionOverlayOpacity = useSharedValue(0);
  const completionTextScale = useSharedValue(0.5);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCompletionMessageRef = useRef(-1);

  const { formattedTime, isPaused } = useWorkoutTimer(workoutData?.completedSummary ?? null);
  const { findExerciseById, findExercisesByIds } = useExerciseLookup();

  // Build the pages array based on workout items
  const pages = useMemo((): WorkoutPage[] => {
    if (!workoutData?.items) return [{ type: 'readiness' }];

    const pageList: WorkoutPage[] = [{ type: 'readiness' }];

    workoutData.items.forEach((item, itemIndex) => {
      if (item.itemType === 'exercise') {
        // Top-level exercise - check if it's part of a superset
        const currentSupersetId = item.data.supersetId;
        
        if (currentSupersetId) {
          // Check if this exercise has already been added as part of a superset
          const alreadyAdded = pageList.some(
            (page) => page.type === 'superset' && 
            page.exerciseIndices.includes(itemIndex)
          );
          
          if (!alreadyAdded) {
            // Find all exercises in this superset
            const supersetExercises: RegularExercisePayload[] = [];
            const exerciseIndices: number[] = [];
            
            // Look ahead to find all exercises with the same supersetId
            for (let i = itemIndex; i < workoutData.items.length; i++) {
              const currentItem = workoutData.items[i];
              if (currentItem.itemType === 'exercise' && currentItem.data.supersetId === currentSupersetId) {
                supersetExercises.push(currentItem.data);
                exerciseIndices.push(i);
              } else if (currentItem.itemType === 'exercise' && currentItem.data.supersetId !== currentSupersetId) {
                // Different superset or no superset - stop
                break;
              } else if (currentItem.itemType === 'section') {
                // Hit a section - stop
                break;
              }
            }
            
            if (supersetExercises.length > 1) {
              // All exercises in a superset have the same number of sets
              const totalSets = supersetExercises[0]?.sets.length || 1;
              const restSec = supersetExercises[0]?.sets[0]?.restSec || 90; // Use first exercise's rest time
              
              // Create a page for each set
              for (let setNum = 1; setNum <= totalSets; setNum++) {
                pageList.push({
                  type: 'superset-round',
                  itemIndex,
                  exercises: supersetExercises,
                  exerciseIndices,
                  currentSet: setNum,
                  totalSets,
                  restSec,
                });
              }
            } else {
              // Single exercise with supersetId but no partner - add as regular exercise
              pageList.push({
                type: 'exercise',
                itemIndex,
                exercise: item.data,
              });
            }
          }
        } else {
          // Regular exercise (no superset) - add directly
          pageList.push({
            type: 'exercise',
            itemIndex,
            exercise: item.data,
          });
        }
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
            if (group.isSuperset && group.exercises.length > 1) {
              // Superset group - all exercises have the same number of sets
              const totalSets = group.exercises[0]?.sets.length || 1;
              const restSec = group.exercises[0]?.sets[0]?.restSec || 90; // Use first exercise's rest time
              
              // Create a page for each set
              for (let setNum = 1; setNum <= totalSets; setNum++) {
                pageList.push({
                  type: 'superset-round',
                  itemIndex,
                  exercises: group.exercises,
                  exerciseIndices: group.exercises.map((_, idx) => idx),
                  currentSet: setNum,
                  totalSets,
                  restSec,
                });
              }
            } else {
              // Regular exercise group - add each exercise separately
              group.exercises.forEach((exercise, exerciseIndex) => {
                pageList.push({
                  type: 'exercise',
                  itemIndex,
                  exercise,
                  groupIndex,
                  exerciseIndex,
                });
              });
            }
          });
        } else if (section.type === 'amrap') {
          // AMRAP: Create one page with countdown timer and all exercises
          pageList.push({
            type: 'amrap-round',
            itemIndex,
            section,
            durationSec: section.durationSec,
            initialRoundsCompleted: section.roundsCompleted || 0,
          });
        } else if (section.type === 'emom') {
          // EMOM: Calculate rounds from duration and interval
          const totalRounds = Math.floor((section.durationMin * 60) / section.intervalSec);
          for (let round = 1; round <= totalRounds; round++) {
            pageList.push({
              type: 'emom-round',
              itemIndex,
              section,
              roundNumber: round,
              totalRounds,
              intervalSec: section.intervalSec,
            });
          }
        } else if (section.type === 'hiit') {
          // HIIT: Create one page per round with work/rest timer
          const totalRounds = section.rounds;
          for (let round = 1; round <= totalRounds; round++) {
            pageList.push({
              type: 'hiit-round',
              itemIndex,
              section,
              roundNumber: round,
              totalRounds,
              workSec: section.workSec,
              restSec: section.restSec,
            });
          }
        } else if (section.type === 'tabata') {
          // Tabata: Create one page per round with work/rest timer
          const totalRounds = section.rounds;
          for (let round = 1; round <= totalRounds; round++) {
            pageList.push({
              type: 'tabata-round',
              itemIndex,
              section,
              roundNumber: round,
              totalRounds,
              workSec: section.workSec,
              restSec: section.restSec,
            });
          }
        } else {
          // Circuit-based sections (circuits)
          // Create one page per round with all exercises shown together
          const totalRounds = section.rounds;
          for (let round = 1; round <= totalRounds; round++) {
            pageList.push({
              type: 'circuit-round',
              itemIndex,
              section: section as CircuitSectionType,
              roundNumber: round,
              totalRounds,
            });
          }
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

      // If currently on an EMOM round, clear the timer storage so next round starts fresh
      if (currentPage.type === 'emom-round') {
        const storageKey = `${EMOM_TIMER_KEY_PREFIX}${currentPage.section.id}_${currentPage.roundNumber}`;
        Storage.removeItem(storageKey);
      }

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

  // Animated styles for completion overlay
  const completionOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completionOverlayOpacity.value,
  }));

  const completionTextAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completionTextScale.value }],
  }));

  // Show completion celebration overlay and navigate after
  const showCompletionCelebration = useCallback(() => {
    // Get messages directly from translations object (t() only returns strings)
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
      // Navigate after fade out completes
      setTimeout(() => {
        setShowCompletionOverlay(false);
        if (currentStep < pages.length) {
          if (isPaused) resumeWorkout();
          setCurrentStep(currentStep + 1);
        }
      }, 200);
    }, 1200);
  }, [completionOverlayOpacity, completionTextScale, currentStep, pages.length, isPaused]);

  // Cleanup completion timeout on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

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

  // Handle set completion toggle for regular exercises and supersets
  const handleSetComplete = async (setIndex: number, completed: boolean, exerciseIdxInSuperset?: number) => {
    if (!workoutData) return;

    if (currentPage.type === 'superset') {
      const { itemIndex, exercises, exerciseIndices } = currentPage;
      const actualExerciseIndex = exerciseIdxInSuperset !== undefined ? exerciseIdxInSuperset : 0;
      const exercise = exercises[actualExerciseIndex];

      // Deep clone the items to update
      const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
      const item = updatedItems[itemIndex];

      if (item.itemType === 'exercise') {
        // Top-level superset - find the exercise by matching ID
        const exerciseItemIndex = exerciseIndices[actualExerciseIndex];
        const exerciseItem = updatedItems[exerciseItemIndex];
        if (exerciseItem.itemType === 'exercise' && exerciseItem.data.id === exercise.id) {
          exerciseItem.data.sets[setIndex].completed = completed;
        }
      } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
        // Regular section superset - find the exercise in the group
        for (let groupIndex = 0; groupIndex < item.data.exercises.length; groupIndex++) {
          const group = item.data.exercises[groupIndex];
          if (group.isSuperset) {
            const exerciseIndex = group.exercises.findIndex((ex) => ex.id === exercise.id);
            if (exerciseIndex !== -1) {
              group.exercises[exerciseIndex].sets[setIndex].completed = completed;
              break;
            }
          }
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
      return;
    }

    if (currentPage.type !== 'exercise') return;
    const { itemIndex, groupIndex, exerciseIndex, exercise } = currentPage;

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

    // Show celebration and auto-advance when last set is completed
    const isLastSet = setIndex === exercise.sets.length - 1;
    if (completed && isLastSet) {
      showCompletionCelebration();
    }
  };

  // Handle set value change for regular exercises and supersets
  const handleSetValueChange = async (
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string,
    exerciseIdxInSuperset?: number
  ) => {
    if (!workoutData) return;
    
    if (currentPage.type === 'superset') {
      const { itemIndex, exercises, exerciseIndices } = currentPage;
      const actualExerciseIndex = exerciseIdxInSuperset !== undefined ? exerciseIdxInSuperset : 0;
      const exercise = exercises[actualExerciseIndex];
      
      // Deep clone the items to update
      const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
      const item = updatedItems[itemIndex];
      
      if (item.itemType === 'exercise') {
        // Top-level superset
        const exerciseItemIndex = exerciseIndices[actualExerciseIndex];
        const exerciseItem = updatedItems[exerciseItemIndex];
        if (exerciseItem.itemType === 'exercise' && exerciseItem.data.id === exercise.id) {
          exerciseItem.data.sets[setIndex][field].completed = value;
        }
      } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
        // Regular section superset
        for (let groupIndex = 0; groupIndex < item.data.exercises.length; groupIndex++) {
          const group = item.data.exercises[groupIndex];
          if (group.isSuperset) {
            const exerciseIndex = group.exercises.findIndex((ex) => ex.id === exercise.id);
            if (exerciseIndex !== -1) {
              group.exercises[exerciseIndex].sets[setIndex][field].completed = value;
              break;
            }
          }
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
      return;
    }
    
    if (currentPage.type !== 'exercise') return;
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

  // Handle alternative exercise selection for regular exercises and supersets
  const handleAlternativeSelect = async (alternativeId: string, exerciseIdxInSuperset?: number) => {
    if (!workoutData) return;
    
    if (currentPage.type === 'superset') {
      const { itemIndex, exercises, exerciseIndices } = currentPage;
      const actualExerciseIndex = exerciseIdxInSuperset !== undefined ? exerciseIdxInSuperset : 0;
      const exercise = exercises[actualExerciseIndex];
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
        // Top-level superset
        const exerciseItemIndex = exerciseIndices[actualExerciseIndex];
        const exerciseItem = updatedItems[exerciseItemIndex];
        if (exerciseItem.itemType === 'exercise' && exerciseItem.data.id === exercise.id) {
          swapExercise(exerciseItem.data);
        }
      } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
        // Regular section superset
        for (let groupIndex = 0; groupIndex < item.data.exercises.length; groupIndex++) {
          const group = item.data.exercises[groupIndex];
          if (group.isSuperset) {
            const exerciseIndex = group.exercises.findIndex((ex) => ex.id === exercise.id);
            if (exerciseIndex !== -1) {
              swapExercise(group.exercises[exerciseIndex]);
              break;
            }
          }
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
      return;
    }
    
    if (currentPage.type !== 'exercise') return;
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

  // Handle circuit exercise completion (local state only within round)
  const handleCircuitExerciseComplete = (
    sectionId: string,
    roundNumber: number,
    exerciseIndex: number,
    completed: boolean
  ) => {
    const key = `${sectionId}-${roundNumber}`;
    setCircuitRoundCompletions((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || [];
      const updated = [...existing];
      updated[exerciseIndex] = completed;
      newMap.set(key, updated);
      return newMap;
    });
  };

  // Handle circuit exercise value change
  const handleCircuitExerciseValueChange = async (
    itemIndex: number,
    groupIndex: number,
    exerciseIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => {
    if (!workoutData) return;

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];

    if (
      item.itemType === 'section' &&
      (item.data.type === 'circuits' || item.data.type === 'tabata' || item.data.type === 'hiit' || item.data.type === 'emom')
    ) {
      item.data.exercises[groupIndex].exercises[exerciseIndex].set[field].completed = value;
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
      console.error('Failed to save circuit exercise value:', error);
    }
  };

  // Handle AMRAP exercise completion
  const handleAmrapExerciseComplete = async (itemIndex: number, exerciseIndex: number, completed: boolean) => {
    if (!workoutData) return;

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];

    if (item.itemType === 'section' && item.data.type === 'amrap') {
      item.data.exercises[exerciseIndex].completed = completed;
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
      console.error('Failed to save AMRAP exercise completion:', error);
    }
  };

  // Handle AMRAP exercise value change
  const handleAmrapExerciseValueChange = async (
    itemIndex: number,
    exerciseIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => {
    if (!workoutData) return;

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];

    if (item.itemType === 'section' && item.data.type === 'amrap') {
      item.data.exercises[exerciseIndex][field].completed = value;
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
      console.error('Failed to save AMRAP exercise value:', error);
    }
  };

  // Handle superset exercise completion
  const handleSupersetExerciseComplete = async (
    itemIndex: number,
    exerciseIndex: number,
    setIndex: number,
    completed: boolean,
    exercises: RegularExercisePayload[],
    exerciseIndices: number[]
  ) => {
    if (!workoutData) return;

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];
    const exercise = exercises[exerciseIndex];

    if (item.itemType === 'exercise') {
      // Top-level superset
      const exerciseItemIndex = exerciseIndices[exerciseIndex];
      const exerciseItem = updatedItems[exerciseItemIndex];
      if (exerciseItem.itemType === 'exercise' && exerciseItem.data.id === exercise.id) {
        exerciseItem.data.sets[setIndex].completed = completed;
      }
    } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
      // Regular section superset
      for (let groupIndex = 0; groupIndex < item.data.exercises.length; groupIndex++) {
        const group = item.data.exercises[groupIndex];
        if (group.isSuperset) {
          const exerciseIdx = group.exercises.findIndex((ex) => ex.id === exercise.id);
          if (exerciseIdx !== -1) {
            group.exercises[exerciseIdx].sets[setIndex].completed = completed;
            break;
          }
        }
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
      console.error('Failed to save superset exercise completion:', error);
    }
  };

  // Handle superset exercise value change
  const handleSupersetExerciseValueChange = async (
    itemIndex: number,
    exerciseIndex: number,
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string,
    exercises: RegularExercisePayload[],
    exerciseIndices: number[]
  ) => {
    if (!workoutData) return;

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];
    const exercise = exercises[exerciseIndex];

    if (item.itemType === 'exercise') {
      // Top-level superset
      const exerciseItemIndex = exerciseIndices[exerciseIndex];
      const exerciseItem = updatedItems[exerciseItemIndex];
      if (exerciseItem.itemType === 'exercise' && exerciseItem.data.id === exercise.id) {
        exerciseItem.data.sets[setIndex][field].completed = value;
      }
    } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
      // Regular section superset
      for (let groupIndex = 0; groupIndex < item.data.exercises.length; groupIndex++) {
        const group = item.data.exercises[groupIndex];
        if (group.isSuperset) {
          const exerciseIdx = group.exercises.findIndex((ex) => ex.id === exercise.id);
          if (exerciseIdx !== -1) {
            group.exercises[exerciseIdx].sets[setIndex][field].completed = value;
            break;
          }
        }
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
      console.error('Failed to save superset exercise value:', error);
    }
  };

  // Handle circuit round completion (advances to next round/section)
  const handleCircuitRoundComplete = () => {
    // Simply advance to the next step - the pages array handles the logic
    if (currentStep < pages.length) {
      if (isPaused) resumeWorkout();
      setCurrentStep(currentStep + 1);
    }
  };

  // Get flat list of circuit exercises for current round
  const getCircuitExercisesForRound = (
    section: CircuitSectionType
  ): { exercise: CircuitExercisePayload; groupIndex: number; exerciseIndex: number }[] => {
    const exercises: { exercise: CircuitExercisePayload; groupIndex: number; exerciseIndex: number }[] = [];
    section.exercises.forEach((group, groupIndex) => {
      group.exercises.forEach((exercise, exerciseIndex) => {
        exercises.push({ exercise, groupIndex, exerciseIndex });
      });
    });
    return exercises;
  };

  // Get exercise data map for circuit exercises
  const getCircuitExerciseDataMap = (section: CircuitSectionType): Map<string, { exerciseId: string; name: string; thumbnailUrl?: string }> => {
    const exerciseIds = new Set<string>();
    section.exercises.forEach((group) => {
      group.exercises.forEach((ex) => {
        exerciseIds.add(ex.prescribedExerciseId);
      });
    });

    const exerciseData = findExercisesByIds(Array.from(exerciseIds));
    const dataMap = new Map<string, { exerciseId: string; name: string; thumbnailUrl?: string }>();
    exerciseData.forEach((ex) => {
      dataMap.set(ex.exerciseId, {
        exerciseId: ex.exerciseId,
        name: ex.name,
        thumbnailUrl: ex.rawThumbnailUrl,
      });
    });
    return dataMap;
  };

  // Get exercise data map for AMRAP exercises
  const getAmrapExerciseDataMap = (section: AmrapSectionPayload): Map<string, { exerciseId: string; name: string; thumbnailUrl?: string }> => {
    const exerciseIds = section.exercises.map((ex) => ex.prescribedExerciseId);
    const exerciseData = findExercisesByIds(exerciseIds);
    const dataMap = new Map<string, { exerciseId: string; name: string; thumbnailUrl?: string }>();
    exerciseData.forEach((ex) => {
      dataMap.set(ex.exerciseId, {
        exerciseId: ex.exerciseId,
        name: ex.name,
        thumbnailUrl: ex.rawThumbnailUrl,
      });
    });
    return dataMap;
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

      case 'superset': {
        const { exercises, exerciseIndices } = currentPage;
        const supersetExercisesData = exercises.map((ex) => findExerciseById(ex.prescribedExerciseId));
        
        return (
          <View style={styles.exerciseContainer}>
            {exercises.map((exercise, idx) => {
              const exerciseData = supersetExercisesData[idx];
              const supersetLabel = idx === 0 ? 'A' : idx === 1 ? 'B' : String.fromCharCode(67 + idx - 2);
              
              // Get alternatives for this exercise
              const exerciseAlternatives = exercise.alternatives
                ? findExercisesByIds(exercise.alternatives).map(ex => ({
                    id: ex.exerciseId,
                    name: ex.name,
                    thumbnailUrl: ex.rawThumbnailUrl,
                  }))
                : [];
              
              return (
                <ExerciseSessionCard
                  key={exercise.id}
                  exercise={exercise}
                  exerciseName={exerciseData?.name || 'Exercise'}
                  exerciseImageUrl={exerciseData?.rawThumbnailUrl}
                  alternatives={exerciseAlternatives}
                  isSuperset={true}
                  supersetLabel={supersetLabel}
                  onSetComplete={(setIndex, completed) => {
                    handleSetComplete(setIndex, completed, idx);
                  }}
                  onSetValueChange={(setIndex, field, value) => {
                    handleSetValueChange(setIndex, field, value, idx);
                  }}
                  onAlternativeSelect={(alternativeId) => {
                    handleAlternativeSelect(alternativeId, idx);
                  }}
                />
              );
            })}
          </View>
        );
      }

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
              sequentialSets
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

      case 'circuit-round': {
        const { section, roundNumber, totalRounds, itemIndex } = currentPage;
        const circuitExercises = getCircuitExercisesForRound(section);
        const exerciseDataMap = getCircuitExerciseDataMap(section);
        const roundKey = `${section.id}-${roundNumber}`;

        // Get local completion state for this round, or use exercise set.completed as initial
        const localCompletions = circuitRoundCompletions.get(roundKey) || circuitExercises.map((e) => e.exercise.set.completed);

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = circuitExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: localCompletions[idx] ?? e.exercise.set.completed,
          },
        }));

        return (
          <View style={styles.exerciseContainer}>
            <CircuitRoundPage
              sectionName={section.name}
              sectionType={section.type as 'circuits' | 'tabata' | 'hiit' | 'emom'}
              currentRound={roundNumber}
              totalRounds={totalRounds}
              exercises={exercisesWithLocalState}
              exerciseDataMap={exerciseDataMap}
              onExerciseComplete={(exerciseIdx, completed) => {
                handleCircuitExerciseComplete(section.id, roundNumber, exerciseIdx, completed);
              }}
              onExerciseValueChange={(exerciseIdx, field, value) => {
                const { groupIndex, exerciseIndex } = circuitExercises[exerciseIdx];
                handleCircuitExerciseValueChange(itemIndex, groupIndex, exerciseIndex, field, value);
              }}
              onRoundComplete={handleCircuitRoundComplete}
            />
          </View>
        );
      }

      case 'emom-round': {
        const { section, roundNumber, totalRounds, itemIndex, intervalSec } = currentPage;
        const emomExercises = getCircuitExercisesForRound(section as unknown as CircuitSectionType);
        const exerciseDataMap = getCircuitExerciseDataMap(section as unknown as CircuitSectionType);
        const roundKey = `${section.id}-${roundNumber}`;

        // Get local completion state for this round
        const localCompletions = circuitRoundCompletions.get(roundKey) || emomExercises.map((e) => e.exercise.set.completed);

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = emomExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: localCompletions[idx] ?? e.exercise.set.completed,
          },
        }));

        return (
          <View style={styles.exerciseContainer}>
            <EmomRoundPage
              key={`emom-${section.id}-${roundNumber}`}
              sectionId={section.id}
              sectionName={section.name}
              intervalSec={intervalSec}
              currentRound={roundNumber}
              totalRounds={totalRounds}
              exercises={exercisesWithLocalState}
              exerciseDataMap={exerciseDataMap}
              onExerciseComplete={(exerciseIdx, completed) => {
                handleCircuitExerciseComplete(section.id, roundNumber, exerciseIdx, completed);
              }}
              onExerciseValueChange={(exerciseIdx, field, value) => {
                const { groupIndex, exerciseIndex } = emomExercises[exerciseIdx];
                handleCircuitExerciseValueChange(itemIndex, groupIndex, exerciseIndex, field, value);
              }}
              onRoundComplete={handleCircuitRoundComplete}
              isPaused={isPaused}
            />
          </View>
        );
      }

      case 'hiit-round': {
        const { section, roundNumber, totalRounds, itemIndex, workSec, restSec } = currentPage;
        const hiitExercises = getCircuitExercisesForRound(section as unknown as CircuitSectionType);
        const exerciseDataMap = getCircuitExerciseDataMap(section as unknown as CircuitSectionType);
        const roundKey = `${section.id}-${roundNumber}`;

        // Get local completion state for this round
        const localCompletions = circuitRoundCompletions.get(roundKey) || hiitExercises.map((e) => e.exercise.set.completed);

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = hiitExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: localCompletions[idx] ?? e.exercise.set.completed,
          },
        }));

        return (
          <View style={styles.exerciseContainer}>
            <HiitRoundPage
              key={`hiit-${section.id}-${roundNumber}`}
              sectionId={section.id}
              sectionName={section.name}
              workSec={workSec}
              restSec={restSec}
              currentRound={roundNumber}
              totalRounds={totalRounds}
              exercises={exercisesWithLocalState}
              exerciseDataMap={exerciseDataMap}
              onExerciseComplete={(exerciseIdx, completed) => {
                handleCircuitExerciseComplete(section.id, roundNumber, exerciseIdx, completed);
              }}
              onExerciseValueChange={(exerciseIdx, field, value) => {
                const { groupIndex, exerciseIndex } = hiitExercises[exerciseIdx];
                handleCircuitExerciseValueChange(itemIndex, groupIndex, exerciseIndex, field, value);
              }}
              onRoundComplete={handleCircuitRoundComplete}
              isPaused={isPaused}
            />
          </View>
        );
      }

      case 'tabata-round': {
        const { section, roundNumber, totalRounds, itemIndex, workSec, restSec } = currentPage;
        const tabataExercises = getCircuitExercisesForRound(section as unknown as CircuitSectionType);
        const exerciseDataMap = getCircuitExerciseDataMap(section as unknown as CircuitSectionType);
        const roundKey = `${section.id}-${roundNumber}`;

        // Get local completion state for this round
        const localCompletions = circuitRoundCompletions.get(roundKey) || tabataExercises.map((e) => e.exercise.set.completed);

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = tabataExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: localCompletions[idx] ?? e.exercise.set.completed,
          },
        }));

        return (
          <View style={styles.exerciseContainer}>
            <TabataRoundPage
              key={`tabata-${section.id}-${roundNumber}`}
              sectionId={section.id}
              sectionName={section.name}
              workSec={workSec}
              restSec={restSec}
              currentRound={roundNumber}
              totalRounds={totalRounds}
              exercises={exercisesWithLocalState}
              exerciseDataMap={exerciseDataMap}
              onExerciseComplete={(exerciseIdx, completed) => {
                handleCircuitExerciseComplete(section.id, roundNumber, exerciseIdx, completed);
              }}
              onExerciseValueChange={(exerciseIdx, field, value) => {
                const { groupIndex, exerciseIndex } = tabataExercises[exerciseIdx];
                handleCircuitExerciseValueChange(itemIndex, groupIndex, exerciseIndex, field, value);
              }}
              onRoundComplete={handleCircuitRoundComplete}
              isPaused={isPaused}
            />
          </View>
        );
      }

      case 'amrap-round': {
        const { section, itemIndex, durationSec, initialRoundsCompleted } = currentPage;
        const exerciseDataMap = getAmrapExerciseDataMap(section);

        return (
          <View style={styles.exerciseContainer}>
            <AmrapRoundPage
              key={`amrap-${section.id}`}
              sectionId={section.id}
              sectionName={section.name}
              durationSec={durationSec}
              initialRoundsCompleted={initialRoundsCompleted}
              exercises={section.exercises}
              exerciseDataMap={exerciseDataMap}
              onExerciseComplete={(exerciseIdx, completed) => {
                handleAmrapExerciseComplete(itemIndex, exerciseIdx, completed);
              }}
              onExerciseValueChange={(exerciseIdx, field, value) => {
                handleAmrapExerciseValueChange(itemIndex, exerciseIdx, field, value);
              }}
              onRoundComplete={handleCircuitRoundComplete}
              isPaused={isPaused}
            />
          </View>
        );
      }

      case 'superset-round': {
        const { exercises, exerciseIndices, itemIndex, currentSet, totalSets, restSec } = currentPage;
        const supersetExercisesData = exercises.map((ex) => findExerciseById(ex.prescribedExerciseId));
        const exerciseDataMap = new Map(
          supersetExercisesData.map((ex, idx) => [
            exercises[idx].prescribedExerciseId,
            {
              exerciseId: exercises[idx].prescribedExerciseId,
              name: ex?.name || 'Exercise',
              thumbnailUrl: ex?.rawThumbnailUrl,
            },
          ])
        );

        return (
          <View style={styles.exerciseContainer}>
            <SupersetRoundPage
              key={`superset-${itemIndex}-${currentSet}`}
              sectionId={currentPage.itemIndex.toString()}
              exercises={exercises}
              exerciseDataMap={exerciseDataMap}
              currentSet={currentSet}
              totalSets={totalSets}
              restSec={restSec}
              onExerciseComplete={(exerciseIndex, setIndex, completed) => {
                handleSupersetExerciseComplete(itemIndex, exerciseIndex, setIndex, completed, exercises, exerciseIndices);
              }}
              onExerciseValueChange={(exerciseIndex, setIndex, field, value) => {
                handleSupersetExerciseValueChange(itemIndex, exerciseIndex, setIndex, field, value, exercises, exerciseIndices);
              }}
              onSetComplete={handleCircuitRoundComplete}
              isPaused={isPaused}
            />
          </View>
        );
      }

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
    paddingTop: 8,
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
