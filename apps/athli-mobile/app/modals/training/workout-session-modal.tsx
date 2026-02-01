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
  CompletionStatus,
  SetCompletionStatus,
  deriveExerciseStatus,
  deriveSectionStatus,
  deriveIntervalSectionStatus,
  migrateSetCompletionBoolean,
  migrateCompletionBoolean,
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

/**
 * Migrate workout payload from boolean completed to CompletionStatus
 * Handles backward compatibility with existing data
 */
const migrateWorkoutPayload = (items: WorkoutItem[]): WorkoutItem[] => {
  return items.map((item) => {
    if (item.itemType === 'exercise') {
      // Migrate top-level exercise
      const sets = item.data.sets.map((set) => ({
        ...set,
        completed: migrateSetCompletionBoolean(set.completed),
      }));
      const exerciseStatus = deriveExerciseStatus(sets);
      return {
        ...item,
        data: {
          ...item.data,
          sets,
          completed: item.data.completed !== undefined
            ? migrateCompletionBoolean(item.data.completed)
            : exerciseStatus,
        },
      };
    }

    if (item.itemType === 'section') {
      const section = item.data;

      // Handle regular and auxiliary sections
      if (section.type === 'regular' || section.type === 'auxiliary') {
        const exercises = section.exercises.map((group) => ({
          ...group,
          exercises: group.exercises.map((ex) => {
            const sets = ex.sets.map((set) => ({
              ...set,
              completed: migrateSetCompletionBoolean(set.completed),
            }));
            return {
              ...ex,
              sets,
              completed: ex.completed !== undefined
                ? migrateCompletionBoolean(ex.completed)
                : deriveExerciseStatus(sets),
            };
          }),
        }));

        // Calculate section completion
        let completedExercises = 0;
        let totalExercises = 0;
        exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            totalExercises++;
            if (ex.completed === 'completed') completedExercises++;
          });
        });

        return {
          ...item,
          data: {
            ...section,
            exercises,
            completed: migrateCompletionBoolean(section.completed),
          },
        };
      }

      // Handle AMRAP sections
      if (section.type === 'amrap') {
        const exercises = section.exercises.map((ex) => ({
          ...ex,
          completed: migrateCompletionBoolean(ex.completed),
        }));
        return {
          ...item,
          data: {
            ...section,
            exercises,
            completed: migrateCompletionBoolean(section.completed),
          },
        };
      }

      // Handle interval sections (circuits, tabata, hiit, emom)
      if (section.type === 'circuits' || section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom') {
        const exercises = section.exercises.map((group) => ({
          ...group,
          exercises: group.exercises.map((ex) => {
            const migratedSetCompleted = migrateSetCompletionBoolean(ex.set.completed);
            return {
              ...ex,
              set: {
                ...ex.set,
                completed: migratedSetCompleted,
              },
              completed: ex.completed !== undefined
                ? migrateCompletionBoolean(ex.completed)
                : (migratedSetCompleted === 'completed' ? 'completed' : 'not_started') as CompletionStatus,
            };
          }),
        }));

        return {
          ...item,
          data: {
            ...section,
            exercises,
            completedRounds: (section as any).completedRounds ?? 0,
            completed: migrateCompletionBoolean(section.completed),
          },
        };
      }
    }

    return item;
  });
};

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

  // Phase overlay state (for WORK/REST transitions, next round, etc.)
  const [showPhaseOverlay, setShowPhaseOverlay] = useState(false);
  const [phaseOverlayText, setPhaseOverlayText] = useState('');
  const phaseOverlayOpacity = useSharedValue(0);

  const { formattedTime, isPaused } = useWorkoutTimer(workoutData?.completedSummary ?? null);
  const { findExerciseById, findExercisesByIds, isLoading: isExerciseDataLoading } = useExerciseLookup();

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
            (page) => page.type === 'superset-round' &&
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
          // Always generate all rounds (calculateInitialStep handles resume position)
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
          // Always generate all rounds (calculateInitialStep handles resume position)
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
          // Always generate all rounds (calculateInitialStep handles resume position)
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
          // Always generate all rounds (calculateInitialStep handles resume position)
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

  // Calculate the initial step for resume (find first incomplete page)
  const calculateInitialStep = useCallback((
    pageList: WorkoutPage[],
    items: WorkoutItem[]
  ): number => {
    // Find first page that represents incomplete work
    for (let i = 0; i < pageList.length; i++) {
      const page = pageList[i];

      // Skip readiness page when resuming (user already completed it)
      if (page.type === 'readiness') continue;

      // Skip section-info pages - they're just informational
      if (page.type === 'section-info') continue;

      // Skip end-of-workout pages
      if (page.type === 'congratulations' || page.type === 'feedback' || page.type === 'summary') {
        continue;
      }

      // Check exercise pages
      if (page.type === 'exercise') {
        if (page.exercise.completed !== 'completed') {
          return i + 1; // Convert to 1-indexed
        }
        continue;
      }

      // Check superset-round pages
      if (page.type === 'superset-round') {
        // Check if the current set is incomplete for any exercise
        const setIndex = page.currentSet - 1;
        const isSetComplete = page.exercises.every(
          (ex) => ex.sets[setIndex]?.completed === 'completed'
        );
        if (!isSetComplete) {
          return i + 1;
        }
        continue;
      }

      // For interval rounds (circuit, emom, hiit, tabata), check if this round is incomplete
      // by comparing roundNumber against section.completedRounds
      if (page.type === 'circuit-round') {
        const completedRounds = page.section.completedRounds || 0;
        if (page.roundNumber > completedRounds) {
          return i + 1; // This round hasn't been completed yet
        }
        continue;
      }

      if (page.type === 'emom-round') {
        const completedRounds = page.section.completedRounds || 0;
        if (page.roundNumber > completedRounds) {
          return i + 1; // This round hasn't been completed yet
        }
        continue;
      }

      if (page.type === 'hiit-round') {
        const completedRounds = page.section.completedRounds || 0;
        if (page.roundNumber > completedRounds) {
          return i + 1; // This round hasn't been completed yet
        }
        continue;
      }

      if (page.type === 'tabata-round') {
        const completedRounds = page.section.completedRounds || 0;
        if (page.roundNumber > completedRounds) {
          return i + 1; // This round hasn't been completed yet
        }
        continue;
      }

      // AMRAP rounds - check if section is complete
      if (page.type === 'amrap-round') {
        if (page.section.completed !== 'completed') {
          return i + 1;
        }
        continue;
      }
    }

    // If all pages are complete, go to congratulations (or first non-complete page)
    const congratsIndex = pageList.findIndex((p) => p.type === 'congratulations');
    if (congratsIndex !== -1) {
      return congratsIndex + 1;
    }

    // Fallback: start from the beginning
    return 1;
  }, []);

  // Track if we've set the initial step for resume
  const hasSetInitialStep = useRef(false);

  // Set initial step when resuming an in-progress workout
  useEffect(() => {
    if (hasSetInitialStep.current) return;
    if (!workoutData?.items || pages.length === 0) return;

    const status = workoutData.completedSummary?.status;

    // Only calculate resume position for in_progress workouts
    if (status === 'in_progress') {
      const initialStep = calculateInitialStep(pages, workoutData.items);
      if (initialStep > 1) {
        setCurrentStep(initialStep);
      }
      hasSetInitialStep.current = true;
    } else if (status === 'not_started') {
      // Fresh workout - start at readiness (step 1)
      hasSetInitialStep.current = true;
    }
  }, [workoutData, pages, calculateInitialStep]);

  // Parse workout on mount
  useEffect(() => {
    if (params.workoutPayload) {
      try {
        const parsed = JSON.parse(params.workoutPayload);
        console.log('RAW WORKOUT PAYLOAD:', JSON.stringify(parsed, null, 2));

        // The API returns workout_data nested - extract and merge
        // Note: items may be at top level (web-created) or inside workout_data (legacy)
        const nestedWorkoutData = parsed.workout_data || {};
        const rawItems = parsed.items || nestedWorkoutData.items || [];

        // Migrate items to use CompletionStatus (handles backward compatibility)
        const migratedItems = migrateWorkoutPayload(rawItems);

        setWorkoutData({
          ...parsed,
          // Use top-level pre if set, otherwise use workout_data.pre
          pre: parsed.pre ?? nestedWorkoutData.pre ?? DEFAULT_EXECUTION_FIELDS.pre,
          // Use migrated items
          items: migratedItems,
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

  // Helper to persist round completion without navigating
  const persistRoundCompletion = async (sectionId: string, roundNumber: number): Promise<void> => {
    if (!workoutData) return;

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];

    for (const item of updatedItems) {
      if (item.itemType === 'section' && item.data.id === sectionId) {
        const section = item.data;
        if (section.type === 'circuits' || section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom') {
          // Update completedRounds
          section.completedRounds = roundNumber;

          // Calculate total rounds for status
          let totalRounds: number;
          if (section.type === 'emom') {
            totalRounds = Math.floor((section.durationMin * 60) / section.intervalSec);
          } else {
            totalRounds = section.rounds;
          }

          // Update section completion status
          section.completed = deriveIntervalSectionStatus(roundNumber, totalRounds);

          // If section is completed, mark all exercises inside as completed too
          if (section.completed === 'completed') {
            section.exercises.forEach((group: any) => {
              group.exercises.forEach((ex: any) => {
                ex.completed = 'completed';
                if (ex.set) {
                  ex.set.completed = 'completed';
                }
              });
            });
          }
        }
        break;
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
      console.error('Failed to save round completion:', error);
    }
  };

  const handleNext = async () => {
    if (currentStep < pages.length) {
      if (isPaused) resumeWorkout();

      // If currently on an EMOM round, clear the timer storage so next round starts fresh
      if (currentPage.type === 'emom-round') {
        const storageKey = `${EMOM_TIMER_KEY_PREFIX}${currentPage.section.id}_${currentPage.roundNumber}`;
        Storage.removeItem(storageKey);
      }

      // Persist round completion for timer-based sections when advancing via Next button
      if (currentPage.type === 'emom-round' || currentPage.type === 'hiit-round' || currentPage.type === 'tabata-round') {
        await persistRoundCompletion(currentPage.section.id, currentPage.roundNumber);
      }

      // If leaving feedback page, mark workout as completed and save
      if (currentPage.type === 'feedback' && workoutData) {
        try {
          // Calculate total duration
          const completedAt = new Date();
          const startedAt = workoutData.completedSummary?.startedAt
            ? new Date(workoutData.completedSummary.startedAt)
            : completedAt;
          const totalPausedMs = workoutData.completedSummary?.totalPausedMs || 0;
          const totalDurationMs = completedAt.getTime() - startedAt.getTime() - totalPausedMs;
          const totalDurationMin = Math.round(totalDurationMs / 60000);

          // Mark workout as completed with duration
          const completedSummary: WorkoutMeta = {
            ...workoutData.completedSummary,
            status: 'completed' as const,
            completedAt: completedAt.toISOString(),
            pausedAt: null, // Clear any pause state
            totalDurationMin,
          };
          const updatedData = { ...workoutData, completedSummary };
          setWorkoutData(updatedData);

          await assignWorkout({
            workoutId: params.workoutId,
            clientId: params.clientId,
            ...(params.coachId && { coachId: params.coachId }),
            date: params.date,
            workoutPayload: updatedData,
          });
        } catch (error) {
          console.error('Failed to save feedback:', error);
        }
      }

      // Get the next page type to check if we're entering congratulations
      const nextPageIndex = currentStep; // currentStep is 1-indexed, so currentStep points to next page
      const nextPage = pages[nextPageIndex];

      // If entering congratulations page, pause the timer
      if (nextPage?.type === 'congratulations' && workoutData && !isPaused) {
        await pauseWorkout();
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

  // Animated style for phase overlay
  const phaseOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: phaseOverlayOpacity.value,
  }));

  // Show phase overlay (for WORK/REST transitions, next round, etc.)
  const triggerPhaseOverlay = useCallback((text: string, durationMs: number = 1000) => {
    setPhaseOverlayText(text);
    setShowPhaseOverlay(true);
    phaseOverlayOpacity.value = withTiming(1, { duration: 150 });

    // Auto dismiss after duration
    setTimeout(() => {
      phaseOverlayOpacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(setShowPhaseOverlay)(false);
      });
    }, durationMs);
  }, [phaseOverlayOpacity]);

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

  // Feedback change handler - defers sessionComments save to Next button
  const handleFeedbackChange = async (field: keyof WorkoutPost, value: number | string | null) => {
    if (!workoutData) return;

    const currentPost = workoutData.post || DEFAULT_EXECUTION_FIELDS.post;
    const updatedData = {
      ...workoutData,
      post: { ...currentPost, [field]: value },
    };
    setWorkoutData(updatedData);

    // For sessionComments, only update local state (save on Next button)
    if (field === 'sessionComments') {
      return;
    }

    // For other fields (rating, intensity), save immediately
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

    const newSetStatus: SetCompletionStatus = completed ? 'completed' : 'not_started';

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
          exerciseItem.data.sets[setIndex].completed = newSetStatus;
          // Update exercise completion status
          exerciseItem.data.completed = deriveExerciseStatus(exerciseItem.data.sets);
        }
      } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
        // Regular section superset - find the exercise in the group
        for (let gIdx = 0; gIdx < item.data.exercises.length; gIdx++) {
          const group = item.data.exercises[gIdx];
          if (group.isSuperset) {
            const exIdx = group.exercises.findIndex((ex) => ex.id === exercise.id);
            if (exIdx !== -1) {
              group.exercises[exIdx].sets[setIndex].completed = newSetStatus;
              // Update exercise completion status
              group.exercises[exIdx].completed = deriveExerciseStatus(group.exercises[exIdx].sets);
              break;
            }
          }
        }
        // Update section completion status
        let completedExercises = 0;
        let totalExercises = 0;
        item.data.exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            totalExercises++;
            if (ex.completed === 'completed') completedExercises++;
          });
        });
        item.data.completed = deriveSectionStatus(completedExercises, totalExercises);
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
      item.data.sets[setIndex].completed = newSetStatus;
      // Update exercise completion status
      item.data.completed = deriveExerciseStatus(item.data.sets);
    } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
      if (groupIndex !== undefined && exerciseIndex !== undefined) {
        item.data.exercises[groupIndex].exercises[exerciseIndex].sets[setIndex].completed = newSetStatus;
        // Update exercise completion status
        item.data.exercises[groupIndex].exercises[exerciseIndex].completed = deriveExerciseStatus(
          item.data.exercises[groupIndex].exercises[exerciseIndex].sets
        );
        // Update section completion status
        let completedExercises = 0;
        let totalExercises = 0;
        item.data.exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            totalExercises++;
            if (ex.completed === 'completed') completedExercises++;
          });
        });
        item.data.completed = deriveSectionStatus(completedExercises, totalExercises);
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

    const newStatus: CompletionStatus = completed ? 'completed' : 'not_started';

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];

    if (item.itemType === 'section' && item.data.type === 'amrap') {
      item.data.exercises[exerciseIndex].completed = newStatus;
      // Update section completion status
      const completedCount = item.data.exercises.filter((ex) => ex.completed === 'completed').length;
      item.data.completed = deriveSectionStatus(completedCount, item.data.exercises.length);
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

    const newSetStatus: SetCompletionStatus = completed ? 'completed' : 'not_started';

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];
    const item = updatedItems[itemIndex];
    const exercise = exercises[exerciseIndex];

    if (item.itemType === 'exercise') {
      // Top-level superset
      const exerciseItemIndex = exerciseIndices[exerciseIndex];
      const exerciseItem = updatedItems[exerciseItemIndex];
      if (exerciseItem.itemType === 'exercise' && exerciseItem.data.id === exercise.id) {
        exerciseItem.data.sets[setIndex].completed = newSetStatus;
        // Update exercise completion status
        exerciseItem.data.completed = deriveExerciseStatus(exerciseItem.data.sets);
      }
    } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
      // Regular section superset
      for (let gIdx = 0; gIdx < item.data.exercises.length; gIdx++) {
        const group = item.data.exercises[gIdx];
        if (group.isSuperset) {
          const exIdx = group.exercises.findIndex((ex) => ex.id === exercise.id);
          if (exIdx !== -1) {
            group.exercises[exIdx].sets[setIndex].completed = newSetStatus;
            // Update exercise completion status
            group.exercises[exIdx].completed = deriveExerciseStatus(group.exercises[exIdx].sets);
            break;
          }
        }
      }
      // Update section completion status
      let completedExercises = 0;
      let totalExercises = 0;
      item.data.exercises.forEach((group) => {
        group.exercises.forEach((ex) => {
          totalExercises++;
          if (ex.completed === 'completed') completedExercises++;
        });
      });
      item.data.completed = deriveSectionStatus(completedExercises, totalExercises);
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

  // Handle AMRAP section completion (when timer finishes)
  const handleAmrapSectionComplete = async (sectionId: string, roundsCompleted: number) => {
    if (!workoutData) {
      // Fallback: just advance
      if (currentStep < pages.length) {
        if (isPaused) resumeWorkout();
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];

    for (const item of updatedItems) {
      if (item.itemType === 'section' && item.data.id === sectionId) {
        const section = item.data;
        if (section.type === 'amrap') {
          // Store rounds completed and mark section as completed
          section.roundsCompleted = roundsCompleted;
          section.completed = 'completed';

          // Mark all exercises inside as completed too
          section.exercises.forEach((ex: any) => {
            ex.completed = 'completed';
          });
        }
        break;
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
      console.error('Failed to save AMRAP completion:', error);
    }

    // Advance to the next step
    if (currentStep < pages.length) {
      if (isPaused) resumeWorkout();
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle circuit round completion (persists completedRounds and advances)
  const handleCircuitRoundComplete = async (sectionId?: string, roundNumber?: number) => {
    if (!workoutData) {
      // Fallback: just advance
      if (currentStep < pages.length) {
        if (isPaused) resumeWorkout();
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    // If section info provided, persist completedRounds
    if (sectionId && roundNumber !== undefined) {
      const updatedItems = JSON.parse(JSON.stringify(workoutData.items)) as WorkoutItem[];

      for (const item of updatedItems) {
        if (item.itemType === 'section' && item.data.id === sectionId) {
          const section = item.data;
          if (section.type === 'circuits' || section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom') {
            // Update completedRounds
            section.completedRounds = roundNumber;

            // Calculate total rounds for status
            let totalRounds: number;
            if (section.type === 'emom') {
              totalRounds = Math.floor((section.durationMin * 60) / section.intervalSec);
            } else {
              totalRounds = section.rounds;
            }

            // Update section completion status
            section.completed = deriveIntervalSectionStatus(roundNumber, totalRounds);

            // If section is completed, mark all exercises inside as completed too
            if (section.completed === 'completed') {
              section.exercises.forEach((group: any) => {
                group.exercises.forEach((ex: any) => {
                  ex.completed = 'completed';
                  if (ex.set) {
                    ex.set.completed = 'completed';
                  }
                });
              });
            }
          }
          break;
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
        console.error('Failed to save round completion:', error);
      }
    }

    // Advance to the next step
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

  // Check if current page is completed
  const isCurrentPageComplete = (): boolean => {
    if (!workoutData) return false;

    if (currentPage.type === 'readiness') {
      return isReadinessComplete();
    }

    if (currentPage.type === 'exercise') {
      const { itemIndex, groupIndex, exerciseIndex, exercise } = currentPage;
      const item = workoutData.items[itemIndex];

      if (item.itemType === 'exercise') {
        // Top-level exercise - check if all sets are completed
        return exercise.sets.every((set) => set.completed === 'completed');
      } else if (item.itemType === 'section' && (item.data.type === 'regular' || item.data.type === 'auxiliary')) {
        // Section exercise - check if all sets are completed
        if (groupIndex !== undefined && exerciseIndex !== undefined) {
          const ex = item.data.exercises[groupIndex].exercises[exerciseIndex];
          return ex.sets.every((set) => set.completed === 'completed');
        }
      }
      return false;
    }

    if (currentPage.type === 'superset-round') {
      const { exercises, currentSet } = currentPage;
      const setIndex = currentSet - 1;
      // Check if all exercises in the current set are completed
      return exercises.every((exercise) => exercise.sets[setIndex]?.completed === 'completed');
    }

    if (currentPage.type === 'circuit-round') {
      const { section, roundNumber } = currentPage;
      // If section or round is already completed, allow navigation
      if (section.completed === 'completed' || roundNumber <= (section.completedRounds || 0)) {
        return true;
      }
      // Get all exercises for this round
      const circuitExercises: { exercise: CircuitExercisePayload; groupIndex: number; exerciseIndex: number }[] = [];
      section.exercises.forEach((group, gIdx) => {
        group.exercises.forEach((exercise, eIdx) => {
          circuitExercises.push({ exercise, groupIndex: gIdx, exerciseIndex: eIdx });
        });
      });
      // Check if all exercises in the round are completed
      return circuitExercises.every((e) => e.exercise.set.completed === 'completed');
    }

    if (currentPage.type === 'emom-round' || currentPage.type === 'hiit-round' || currentPage.type === 'tabata-round') {
      const { section, roundNumber } = currentPage;
      // If section or round is already completed (persisted), allow navigation
      if (section.completed === 'completed' || roundNumber <= (section.completedRounds || 0)) {
        return true;
      }
      // Check LOCAL completion state first
      const roundKey = `${section.id}-${roundNumber}`;
      const localCompletions = circuitRoundCompletions.get(roundKey);

      // Get all exercises for this round
      const exercises: CircuitExercisePayload[] = [];
      section.exercises.forEach((group) => {
        group.exercises.forEach((exercise) => {
          exercises.push(exercise);
        });
      });

      // If we have local completions, use those
      if (localCompletions && localCompletions.length === exercises.length) {
        return localCompletions.every((c) => c === true);
      }

      // Fallback: check persisted state
      return exercises.every((e) => e.set.completed === 'completed');
    }

    if (currentPage.type === 'amrap-round') {
      const { section } = currentPage;
      // If section is already completed, allow navigation
      if (section.completed === 'completed') {
        return true;
      }
      // Check if all exercises are completed
      return section.exercises.every((ex) => ex.completed === 'completed');
    }

    // For other page types (section-info, congratulations, feedback, summary), allow navigation
    return true;
  };

  // Navigation state
  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < totalSteps && isCurrentPageComplete();

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
                  isExerciseDataLoading={isExerciseDataLoading}
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
              isExerciseDataLoading={isExerciseDataLoading}
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
              isExerciseDataLoading={isExerciseDataLoading}
            />
          </View>
        );

      case 'circuit-round': {
        const { section, roundNumber, totalRounds, itemIndex } = currentPage;
        const circuitExercises = getCircuitExercisesForRound(section);
        const exerciseDataMap = getCircuitExerciseDataMap(section);
        const roundKey = `${section.id}-${roundNumber}`;

        // Check if this round is already completed (for backward navigation)
        // Also check if section is marked as completed (all rounds are complete)
        const isRoundCompleted = section.completed === 'completed' || roundNumber <= (section.completedRounds || 0);

        // Get local completion state for this round, or use exercise set.completed as initial
        // If round is already completed, show all as completed
        const localCompletions = isRoundCompleted
          ? circuitExercises.map(() => true)
          : (circuitRoundCompletions.get(roundKey) || circuitExercises.map((e) => e.exercise.set.completed === 'completed'));

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = circuitExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: (localCompletions[idx] ? 'completed' : 'not_started') as SetCompletionStatus,
          },
          completed: (localCompletions[idx] ? 'completed' : 'not_started') as CompletionStatus,
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
              onRoundComplete={() => handleCircuitRoundComplete(section.id, roundNumber)}
              isExerciseDataLoading={isExerciseDataLoading}
              onShowPhaseOverlay={triggerPhaseOverlay}
            />
          </View>
        );
      }

      case 'emom-round': {
        const { section, roundNumber, totalRounds, itemIndex, intervalSec } = currentPage;
        const emomExercises = getCircuitExercisesForRound(section as unknown as CircuitSectionType);
        const exerciseDataMap = getCircuitExerciseDataMap(section as unknown as CircuitSectionType);
        const roundKey = `${section.id}-${roundNumber}`;

        // Check if this round is already completed (for backward navigation)
        // Also check if section is marked as completed (all rounds are complete)
        const isRoundCompleted = section.completed === 'completed' || roundNumber <= (section.completedRounds || 0);

        // Get local completion state for this round, or use exercise set.completed as initial
        // If round is already completed, show all as completed
        const localCompletions = isRoundCompleted
          ? emomExercises.map(() => true)
          : (circuitRoundCompletions.get(roundKey) || emomExercises.map((e) => e.exercise.set.completed === 'completed'));

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = emomExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: (localCompletions[idx] ? 'completed' : 'not_started') as SetCompletionStatus,
          },
          completed: (localCompletions[idx] ? 'completed' : 'not_started') as CompletionStatus,
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
              onRoundComplete={() => handleCircuitRoundComplete(section.id, roundNumber)}
              isPaused={isPaused}
              isRoundCompleted={isRoundCompleted}
              allExercisesComplete={localCompletions.every((c) => c === true)}
              isExerciseDataLoading={isExerciseDataLoading}
              onShowPhaseOverlay={triggerPhaseOverlay}
            />
          </View>
        );
      }

      case 'hiit-round': {
        const { section, roundNumber, totalRounds, itemIndex, workSec, restSec } = currentPage;
        const hiitExercises = getCircuitExercisesForRound(section as unknown as CircuitSectionType);
        const exerciseDataMap = getCircuitExerciseDataMap(section as unknown as CircuitSectionType);
        const roundKey = `${section.id}-${roundNumber}`;

        // Check if this round is already completed (for backward navigation)
        // Also check if section is marked as completed (all rounds are complete)
        const isRoundCompleted = section.completed === 'completed' || roundNumber <= (section.completedRounds || 0);

        // Get local completion state for this round, or use exercise set.completed as initial
        // If round is already completed, show all as completed
        const localCompletions = isRoundCompleted
          ? hiitExercises.map(() => true)
          : (circuitRoundCompletions.get(roundKey) || hiitExercises.map((e) => e.exercise.set.completed === 'completed'));

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = hiitExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: (localCompletions[idx] ? 'completed' : 'not_started') as SetCompletionStatus,
          },
          completed: (localCompletions[idx] ? 'completed' : 'not_started') as CompletionStatus,
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
              onRoundComplete={() => handleCircuitRoundComplete(section.id, roundNumber)}
              isPaused={isPaused}
              isRoundCompleted={isRoundCompleted}
              allExercisesComplete={localCompletions.every((c) => c === true)}
              isExerciseDataLoading={isExerciseDataLoading}
              onShowPhaseOverlay={triggerPhaseOverlay}
            />
          </View>
        );
      }

      case 'tabata-round': {
        const { section, roundNumber, totalRounds, itemIndex, workSec, restSec } = currentPage;
        const tabataExercises = getCircuitExercisesForRound(section as unknown as CircuitSectionType);
        const exerciseDataMap = getCircuitExerciseDataMap(section as unknown as CircuitSectionType);
        const roundKey = `${section.id}-${roundNumber}`;

        // Check if this round is already completed (for backward navigation)
        // Also check if section is marked as completed (all rounds are complete)
        const isRoundCompleted = section.completed === 'completed' || roundNumber <= (section.completedRounds || 0);

        // Get local completion state for this round, or use exercise set.completed as initial
        // If round is already completed, show all as completed
        const localCompletions = isRoundCompleted
          ? tabataExercises.map(() => true)
          : (circuitRoundCompletions.get(roundKey) || tabataExercises.map((e) => e.exercise.set.completed === 'completed'));

        // Create exercises with local completion state overlay
        const exercisesWithLocalState = tabataExercises.map((e, idx) => ({
          ...e.exercise,
          set: {
            ...e.exercise.set,
            completed: (localCompletions[idx] ? 'completed' : 'not_started') as SetCompletionStatus,
          },
          completed: (localCompletions[idx] ? 'completed' : 'not_started') as CompletionStatus,
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
              onRoundComplete={() => handleCircuitRoundComplete(section.id, roundNumber)}
              isPaused={isPaused}
              isRoundCompleted={isRoundCompleted}
              allExercisesComplete={localCompletions.every((c) => c === true)}
              isExerciseDataLoading={isExerciseDataLoading}
              onShowPhaseOverlay={triggerPhaseOverlay}
            />
          </View>
        );
      }

      case 'amrap-round': {
        const { section, itemIndex, durationSec, initialRoundsCompleted } = currentPage;
        const exerciseDataMap = getAmrapExerciseDataMap(section);
        const isSectionCompleted = section.completed === 'completed';

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
              onSectionComplete={(roundsCompleted) => handleAmrapSectionComplete(section.id, roundsCompleted)}
              isPaused={isPaused}
              isSectionCompleted={isSectionCompleted}
              isExerciseDataLoading={isExerciseDataLoading}
              onShowPhaseOverlay={triggerPhaseOverlay}
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
              isExerciseDataLoading={isExerciseDataLoading}
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

      case 'summary': {
        // Calculate workout stats
        const totalExercises = workoutData.items.reduce((count, item) => {
          if (item.itemType === 'exercise') return count + 1;
          if (item.itemType === 'section') {
            const section = item.data;
            if (section.type === 'regular' || section.type === 'auxiliary') {
              return count + section.exercises.reduce((c, g) => c + g.exercises.length, 0);
            }
            if (section.type === 'circuits' || section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom') {
              return count + section.exercises.reduce((c, g) => c + g.exercises.length, 0);
            }
            if (section.type === 'amrap') {
              return count + section.exercises.length;
            }
          }
          return count;
        }, 0);

        const completedSections = workoutData.items.filter(
          (item) => item.itemType === 'section' && item.data.completed === 'completed'
        ).length;

        const totalSections = workoutData.items.filter((item) => item.itemType === 'section').length;

        return (
          <View style={styles.summaryContainer}>
            <Text style={[styles.summaryTitle, { color: themeColors.text }]}>
              {t('training.session.summary.title' as any) || 'Workout Complete!'}
            </Text>

            <View style={styles.summaryStats}>
              {/* Duration */}
              <View style={styles.summaryStatRow}>
                <Text style={[styles.summaryStatLabel, { color: themeColors.mutedText }]}>
                  {t('training.session.summary.duration' as any) || 'Duration'}
                </Text>
                <Text style={[styles.summaryStatValue, { color: themeColors.text }]}>
                  {formattedTime}
                </Text>
              </View>

              {/* Exercises */}
              <View style={styles.summaryStatRow}>
                <Text style={[styles.summaryStatLabel, { color: themeColors.mutedText }]}>
                  {t('training.session.summary.exercises' as any) || 'Exercises'}
                </Text>
                <Text style={[styles.summaryStatValue, { color: themeColors.text }]}>
                  {totalExercises}
                </Text>
              </View>

              {/* Sections */}
              {totalSections > 0 && (
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.summaryStatLabel, { color: themeColors.mutedText }]}>
                    {t('training.session.summary.sections' as any) || 'Sections'}
                  </Text>
                  <Text style={[styles.summaryStatValue, { color: themeColors.text }]}>
                    {completedSections}/{totalSections}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      }

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

      {/* Phase transition overlay (WORK/REST, next round, etc.) */}
      {showPhaseOverlay && (
        <Animated.View style={[styles.phaseOverlay, phaseOverlayAnimatedStyle]}>
          <Text style={styles.phaseOverlayText}>{phaseOverlayText}</Text>
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
  summaryTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryStats: {
    width: '100%',
    gap: 16,
  },
  summaryStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  summaryStatLabel: {
    ...typography.p1,
  },
  summaryStatValue: {
    ...typography.h3,
    fontWeight: '700',
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
  phaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    zIndex: 1100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseOverlayText: {
    ...typography.h1,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 48,
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
