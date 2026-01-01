'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SidePanel } from '@/components/app/side-panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Dumbbell,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Trash2,
  CircleX,
  CircleEllipsis,
  CircleCheck,
  Info,
  Activity,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/general/utils';
import type { Program, Workout, Exercise } from '@/components/app/app-shell';
import { mockPrograms, mockWorkouts, mockExercises } from '@/components/app/app-shell';
import { SaveAsWorkout } from './save-as-workout-side-panel';
import { SaveAsProgram } from './save-as-program-side-panel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  updateTrainingCalendar,
  getTrainingCalendar,
  getTrainingCalendarRange,
  getTrainingCalendarCompletionLogs,
  type TrainingCalendarCompletionLogs,
} from '@/api/client/client-service';
// import { getWorkouts } from '@/api/coach/coach-workout-service'; // Removed direct import of getWorkouts
import { getWorkoutById } from '@/api/coach/coach-workout-service';
import { useCoachWorkouts } from '@/hooks/use-coach-workouts';
import { useClientTraining } from '@/hooks/use-client-training';
import { useQueryClient } from '@tanstack/react-query';
import { AddWorkoutSidePanel } from '@/app/training/workouts/components/add-workout-side-panel';
import { CreateWorkoutSidePanel } from '@/app/training/workouts/components/create-workout-side-panel';
import { TrainingDataProvider, useTrainingData } from '@/app/training/training-data-context';
import { AddProgramSidePanel } from './add-program-side-panel';
import { ClientInProgressTrainingDaySummary } from './client-in-progress-training-day-summary';
import { ClientCompletedTrainingDaySummary } from './client-completed-training-day-summary';
import { WorkoutBuilder } from '@/app/training/workouts/workout-builder';
import { type WorkoutProgramPayload, DEFAULT_EXECUTION_FIELDS, type WorkoutData } from '@/components/training/workout-schema';
import { AddExerciseSidePanel } from './add-exercise-side-panel';
import type { Exercise as CoachExercise } from '@/api/coach/coach-exercise-service';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectActionBar } from '@/components/app/multi-select-action-bar';
import { CardLoaderOverlay } from '@/components/ui/card-loader-overlay';
import { assignWorkout, deleteClientWorkout, getClientWorkoutInstance } from '@/api/client/client-training-service';
import { useClientProfileContext } from '../client-profile-context';
import { useGlobalData } from '@/providers/global-data-provider';


const DAY_MS = 24 * 60 * 60 * 1000;

// Helper component for droppable day wrapper
const DroppableDayWrapper = ({
  dateKey,
  children,
  isDraggingGlobal,
  isFutureDay,
}: {
  dateKey: string;
  children: React.ReactNode;
  isDraggingGlobal: boolean;
  isFutureDay: boolean;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
    data: {
      type: 'day-drop-zone',
      dateKey,
    },
    disabled: !isFutureDay,
  });

  return (
    <div ref={setNodeRef} className="flex-1 flex flex-col min-h-0 h-full">
      {React.cloneElement(children as React.ReactElement)}
    </div>
  );
};

// Helper component for draggable workout card wrapper
const DraggableWorkoutWrapper = ({
  workoutId,
  dateKey,
  workout,
  children,
  isCopyMode,
  isFutureDay,
  isMultiSelectMode,
}: {
  workoutId: string;
  dateKey: string;
  workout: Workout & { id: string };
  children: React.ReactNode;
  isCopyMode: boolean;
  isFutureDay: boolean;
  isMultiSelectMode?: boolean;
}) => {
  const isDragDisabled = isCopyMode || !isFutureDay || isMultiSelectMode;
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `workout-${workoutId}`,
    data: {
      type: 'workout',
      workout,
      dateKey,
    },
    disabled: isDragDisabled,
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(3deg)`
      : undefined,
    transformOrigin: 'center center',
    position: 'relative',
    zIndex: transform ? 99999 : undefined,
    pointerEvents: isDragging ? 'none' : undefined,
    transition: isDragging ? 'none' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDragDisabled ? {} : { ...attributes, ...listeners })}
      className={cn(isDragging && 'opacity-0')}
    >
      {children}
    </div>
  );
};


const ClientTrainingCalendarPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = useMemo(() => (params.clientId as string) || '', [params.clientId]);
  const [selectedWeek, setSelectedWeek] = useState<string>('2');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks] = useState<number>(52); // Default to 52 weeks (1 year)
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  // Navigation loading state - when navigating to a week that requires data fetch
  const [pendingNavigationWeek, setPendingNavigationWeek] = useState<number | null>(null);
  const [isNavigationLoading, setIsNavigationLoading] = useState<boolean>(false);
  // Sync loading state - when manually syncing calendar
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Calendar data fetching configuration
  const FETCH_CHUNK_WEEKS = 8; // Fetch data in 8-week chunks
  const PREFETCH_THRESHOLD_WEEKS = 2; // Prefetch when within 2 weeks of chunk edge

  const [isAddWorkoutPanelOpen, setIsAddWorkoutPanelOpen] = useState<boolean>(false);
  const [isSaveAsWorkoutOpen, setIsSaveAsWorkoutOpen] = useState<boolean>(false);
  const [isSaveAsProgramOpen, setIsSaveAsProgramOpen] = useState<boolean>(false);
  const [selectedDateForWorkout, setSelectedDateForWorkout] = useState<Date | null>(null);
  const [workoutsByDate, setWorkoutsByDate] = useState<{
    [dateKey: string]: Array<Workout & { id: string }>;
  }>({});
  // React Query Hooks
  const { workouts: availableWorkouts, isLoading: isLoadingWorkouts } = useCoachWorkouts();
  const { useCalendarRange, useCompletionLogs, assignWorkout: apiAssignWorkout, deleteWorkout: apiDeleteWorkout, duplicateWorkout: apiDuplicateWorkout, deleteWorkoutByKey: apiDeleteWorkoutByKey, updateCalendar } = useClientTraining(clientId);
  const { athlete } = useClientProfileContext();
  const { user: coachUser } = useGlobalData();

  // Loading state for workout cards during API operations (duplicate, delete)
  const [loadingWorkoutIds, setLoadingWorkoutIds] = useState<Set<string>>(new Set());

  const [startDate] = useState<Date>(() => {
    // Start from the beginning of the current week (Monday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [selectedWorkoutDetails, setSelectedWorkoutDetails] = useState<{
    dateKey: string;
    workout: Workout & { id: string };
  } | null>(null);


  const [isAddProgramPanelOpen, setIsAddProgramPanelOpen] = useState<boolean>(false);
  const [isAddExercisePanelOpen, setIsAddExercisePanelOpen] = useState<boolean>(false);
  const [preventAutoFocus, setPreventAutoFocus] = useState<boolean>(false);

  // Copy mode state
  const [isCopyMode, setIsCopyMode] = useState<boolean>(false);
  const [copiedWorkout, setCopiedWorkout] = useState<{
    workout: Workout & { id: string };
    dateKey: string;
  } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const [pastedDays, setPastedDays] = useState<string[]>([]);
  const [hoveredCopyDay, setHoveredCopyDay] = useState<string | null>(null);

  // Multi-select mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Array<{
    workout: Workout & { id: string };
    dateKey: string;
  }>>([]);
  const [isMultiSelectCopyMode, setIsMultiSelectCopyMode] = useState<boolean>(false);
  const [multiSelectPastedDays, setMultiSelectPastedDays] = useState<string[]>([]);
  const [multiSelectHoveredDay, setMultiSelectHoveredDay] = useState<string | null>(null);

  // Create workout panel state
  const [isCreateWorkoutPanelOpen, setIsCreateWorkoutPanelOpen] = useState<boolean>(false);

  // Workout builder state for editing workouts inline
  const [isWorkoutBuilderOpen, setIsWorkoutBuilderOpen] = useState<boolean>(false);
  const [editingWorkout, setEditingWorkout] = useState<{
    dateKey: string;
    workout: Workout & { id: string };
  } | null>(null);
  // Loading state for fetching workout data when opening builder
  const [isLoadingWorkoutData, setIsLoadingWorkoutData] = useState(false);
  const [fetchedWorkoutData, setFetchedWorkoutData] = useState<any>(null);

  // Training day summary dialog states (for in-progress and completed workouts)
  const [inProgressSummaryWorkout, setInProgressSummaryWorkout] = useState<{
    workout: Workout & { id: string };
    dateKey: string;
  } | null>(null);
  const [completedSummaryWorkout, setCompletedSummaryWorkout] = useState<{
    workout: Workout & { id: string };
    dateKey: string;
  } | null>(null);
  const [isLoadingCompletedSummary, setIsLoadingCompletedSummary] = useState(false);
  const [fetchedCompletedWorkoutData, setFetchedCompletedWorkoutData] = useState<any>(null);

  // Drag and drop state
  const [draggedWorkout, setDraggedWorkout] = useState<{
    workout: Workout & { id: string };
    sourceDateKey: string;
  } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Track workout and set completion status
  // Format: { [workoutId]: 'not_started' | 'in_progress' | 'completed' }
  const [workoutStatus, setWorkoutStatus] = useState<{
    [workoutId: string]: 'not_started' | 'in_progress' | 'completed';
  }>({});

  // Track set completion status
  // Format: { [workoutId]: { [exerciseInstanceId]: { [setNumber]: 'not_started' | 'completed' } } }
  const [setStatus, setSetStatus] = useState<{
    [workoutId: string]: {
      [exerciseInstanceId: string]: {
        [setNumber: number]: 'not_started' | 'completed';
      };
    };
  }>({});

  // Track section completion status (for AMRAP and timed sections)
  // Format: { [workoutId]: { [sectionId]: 'not_started' | 'in_progress' | 'completed' } }
  const [sectionStatus, setSectionStatus] = useState<{
    [workoutId: string]: {
      [sectionId: string]: 'not_started' | 'in_progress' | 'completed';
    };
  }>({});

  type ExerciseWithSuperset = {
    exerciseId: string;
    instanceId: string;
    name: string;
    imageUrl?: string;
    equipments?: string[];
    bodyParts?: string[];
    exerciseType?: 'weight_reps' | 'reps' | 'distance_duration';
    targetMuscles?: string[];
    secondaryMuscles?: string[];
    videoUrl?: string;
    keywords?: string[];
    overview?: string;
    instructions?: string[];
    exerciseTips?: string[];
    variations?: string[];
    relatedExerciseIds?: string[];
    supersetGroupId?: string | null;
    sets?: Array<{
      setNumber: number;
      type?: 'warmUp' | 'normal' | 'failure' | 'dropset';
      reps?: string;
      weight?: string;
      rest?: string;
      distance?: string;
      duration?: string;
    }>;
  };

  type WorkoutSection = {
    id: string;
    type: 'regular' | 'amrap' | 'timed';
    exercises?: ExerciseWithSuperset[];
    roundDurationSec?: number;
    targetRounds?: number;
  };

  const buildWorkoutSchema = (workout: Workout): WorkoutSection[] => {
    const equipmentStr = Array.isArray(workout.equipment) ? workout.equipment.join(',') : (workout.equipment || '');
    const equipmentList = equipmentStr
      ? equipmentStr.split(',').map((e: string) => e.trim()).filter((e: string) => e)
      : [];

    return [
      {
        id: 'sec-1',
        type: 'regular',
        exercises: [
          {
            exerciseId: 'ex-1',
            instanceId: 'ex-1-inst',
            name: `${workout.name} - Main lift`,
            imageUrl: '/demo-img.png',
            equipments: equipmentList,
            bodyParts: workout.type ? [workout.type] : [],
            exerciseType: 'weight_reps',
            targetMuscles: [],
            secondaryMuscles: [],
            videoUrl: '/demo-video.mp4',
            keywords: [],
            overview: workout.description || '',
            instructions: [],
            exerciseTips: [],
            variations: [],
            relatedExerciseIds: [],
            sets: [
              { setNumber: 1, type: 'normal', reps: '8', weight: '100', rest: '90' },
              { setNumber: 2, type: 'normal', reps: '8', weight: '100', rest: '90' },
              { setNumber: 3, type: 'normal', reps: '8', weight: '100', rest: '90' },
            ],
          },
          {
            exerciseId: 'ex-2',
            instanceId: 'ex-2-inst',
            name: 'Accessory 1',
            imageUrl: '/demo-img.png',
            equipments: equipmentList,
            bodyParts: [],
            exerciseType: 'weight_reps',
            targetMuscles: [],
            secondaryMuscles: [],
            videoUrl: '/demo-video.mp4',
            keywords: [],
            overview: '',
            instructions: [],
            exerciseTips: [],
            variations: [],
            relatedExerciseIds: [],
            sets: [
              { setNumber: 1, type: 'normal', reps: '10', weight: '50', rest: '60' },
              { setNumber: 2, type: 'normal', reps: '10', weight: '50', rest: '60' },
              { setNumber: 3, type: 'normal', reps: '10', weight: '50', rest: '60' },
            ],
          },
          {
            exerciseId: 'ex-3',
            instanceId: 'ex-3-inst',
            name: 'Accessory 2',
            imageUrl: '/demo-img.png',
            equipments: equipmentList,
            bodyParts: [],
            exerciseType: 'weight_reps',
            targetMuscles: [],
            secondaryMuscles: [],
            videoUrl: '/demo-video.mp4',
            keywords: [],
            overview: '',
            instructions: [],
            exerciseTips: [],
            variations: [],
            relatedExerciseIds: [],
            sets: [
              { setNumber: 1, type: 'normal', reps: '12', weight: '30', rest: '45' },
              { setNumber: 2, type: 'normal', reps: '12', weight: '30', rest: '45' },
              { setNumber: 3, type: 'normal', reps: '12', weight: '30', rest: '45' },
            ],
          },
        ],
      },
      {
        id: 'sec-2',
        type: 'timed',
        targetRounds: 3,
        exercises: [
          {
            exerciseId: 'ex-4',
            instanceId: 'ex-4-inst',
            name: 'Finisher circuit',
            imageUrl: '/demo-img.png',
            equipments: [],
            bodyParts: [],
            exerciseType: 'reps',
            targetMuscles: [],
            secondaryMuscles: [],
            videoUrl: '/demo-video.mp4',
            keywords: [],
            overview: '',
            instructions: [],
            exerciseTips: [],
            variations: [],
            relatedExerciseIds: [],
            sets: [{ setNumber: 1, type: 'normal', reps: '10', weight: '', rest: '60' }],
          },
        ],
      },
    ];
  };

  const groupExercisesBySuperset = (
    exercises: ExerciseWithSuperset[]
  ): Array<ExerciseWithSuperset[]> => {
    const groups: Array<ExerciseWithSuperset[]> = [];
    let currentGroup: ExerciseWithSuperset[] = [];
    let currentGroupId: string | null = null;

    exercises.forEach((exercise) => {
      if (exercise.supersetGroupId) {
        if (exercise.supersetGroupId === currentGroupId) {
          currentGroup.push(exercise);
        } else {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [exercise];
          currentGroupId = exercise.supersetGroupId;
        }
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [];
        currentGroupId = null;
        groups.push([exercise]);
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  // Helper to check if a week is in a different chunk than current
  const isWeekInDifferentChunk = (targetWeek: number): boolean => {
    const currentChunkIndex = Math.floor((currentWeek - 1) / FETCH_CHUNK_WEEKS);
    const targetChunkIndex = Math.floor((targetWeek - 1) / FETCH_CHUNK_WEEKS);
    return currentChunkIndex !== targetChunkIndex;
  };

  // Navigate to week, triggering loading state if chunk not loaded
  const navigateToWeek = (targetWeek: number) => {
    if (isWeekInDifferentChunk(targetWeek)) {
      // Set pending navigation and show loading
      setPendingNavigationWeek(targetWeek);
      setIsNavigationLoading(true);
      // Update currentWeek to trigger the data fetch for the new chunk
      setCurrentWeek(targetWeek);
    } else {
      // Same chunk, navigate immediately
      setCurrentWeek(targetWeek);
    }
  };

  const handlePreviousWeek = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const newWeek = currentWeek - weeksView;
    // Allow going to past weeks without limit
    navigateToWeek(newWeek);
  };

  const handleNextWeek = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const maxStartWeek = totalWeeks - weeksView + 1;
    const newWeek = currentWeek + weeksView;
    if (newWeek <= maxStartWeek) {
      navigateToWeek(newWeek);
    }
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate the difference in days between today and startDate
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate which week contains today
    // Week 1 starts at startDate (Monday)
    const weekNumber = Math.floor(diffDays / 7) + 1;

    // Allow week numbers from any past date up to totalWeeks
    // Only clamp the upper bound to prevent going too far into the future
    const maxWeek = totalWeeks;

    if (weekNumber <= maxWeek) {
      navigateToWeek(weekNumber);
    } else {
      navigateToWeek(maxWeek);
    }
  };

  const formatDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const getDateKey = (date: Date): string => {
    const keyDate = new Date(date);
    keyDate.setHours(0, 0, 0, 0);
    return keyDate.toISOString().split('T')[0];
  };

  const formatDateForSchema = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getWeekStartDate = (date: Date): Date => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const buildTrainingCalendarSchema = (workouts: {
    [dateKey: string]: Array<Workout & { id: string }>;
  }): { [date: string]: Array<Workout & { id: string }> } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(today.getFullYear() + 1);

    // Initialize schema with all days from -1 year to +1 year
    const schema: { [date: string]: Array<Workout & { id: string }> } = {};

    const currentDate = new Date(oneYearAgo);
    while (currentDate <= oneYearFromNow) {
      const dateKey = formatDateForSchema(currentDate);
      schema[dateKey] = [];
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate workouts into their respective days
    Object.keys(workouts).forEach((dateKey) => {
      // dateKey is in YYYY-MM-DD format
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);

      // Only include dates within the range
      if (date >= oneYearAgo && date <= oneYearFromNow) {
        const formattedDate = formatDateForSchema(date);

        if (schema[formattedDate]) {
          // Add all workouts for this date
          schema[formattedDate].push(...workouts[dateKey]);
        }
      }
    });

    return schema;
  };

  // Calculate the required date range based on current view
  // Uses 8-week chunks with smart prefetching when approaching edges

  // Calculate which 8-week chunk the current view falls into
  const getCurrentChunk = useMemo(() => {
    const weekOffset = currentWeek - 1;
    // Calculate chunk index (0-indexed, chunks are 8 weeks each)
    const chunkIndex = Math.floor(weekOffset / FETCH_CHUNK_WEEKS);
    return chunkIndex;
  }, [currentWeek]);

  // Calculate the date range for a given chunk index
  const getChunkDateRange = (chunkIndex: number) => {
    const chunkStartWeekOffset = chunkIndex * FETCH_CHUNK_WEEKS;
    const chunkStart = new Date(startDate);
    chunkStart.setDate(startDate.getDate() + chunkStartWeekOffset * 7);

    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkStart.getDate() + FETCH_CHUNK_WEEKS * 7 - 1);

    return { start: chunkStart, end: chunkEnd };
  };

  // Required date range is the current chunk
  const requiredDateRange = useMemo(() => {
    return getChunkDateRange(getCurrentChunk);
  }, [getCurrentChunk, startDate]);

  // Check if we need to prefetch adjacent chunks
  const shouldPrefetchPrev = useMemo(() => {
    const weekOffset = currentWeek - 1;
    const weeksIntoChunk = weekOffset % FETCH_CHUNK_WEEKS;
    // Prefetch previous chunk if we're within threshold of chunk start
    return weeksIntoChunk < PREFETCH_THRESHOLD_WEEKS && getCurrentChunk > 0;
  }, [currentWeek, getCurrentChunk]);

  const shouldPrefetchNext = useMemo(() => {
    const weekOffset = currentWeek - 1;
    const weeksView = parseInt(selectedWeek, 10);
    const weeksIntoChunk = weekOffset % FETCH_CHUNK_WEEKS;
    const weeksUntilChunkEnd = FETCH_CHUNK_WEEKS - weeksIntoChunk - weeksView;
    // Prefetch next chunk if we're within threshold of chunk end
    return weeksUntilChunkEnd < PREFETCH_THRESHOLD_WEEKS;
  }, [currentWeek, selectedWeek, getCurrentChunk]);

  // Calculate prefetch ranges
  const prevChunkRange = useMemo(() => {
    if (!shouldPrefetchPrev) return null;
    return getChunkDateRange(getCurrentChunk - 1);
  }, [shouldPrefetchPrev, getCurrentChunk, startDate]);

  const nextChunkRange = useMemo(() => {
    if (!shouldPrefetchNext) return null;
    return getChunkDateRange(getCurrentChunk + 1);
  }, [shouldPrefetchNext, getCurrentChunk, startDate]);


  // Format dates for API
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startDateStr = requiredDateRange.start ? formatDateForAPI(requiredDateRange.start) : '';
  const endDateStr = requiredDateRange.end ? formatDateForAPI(requiredDateRange.end) : '';

  // Prefetch date strings
  const prevStartStr = prevChunkRange?.start ? formatDateForAPI(prevChunkRange.start) : '';
  const prevEndStr = prevChunkRange?.end ? formatDateForAPI(prevChunkRange.end) : '';
  const nextStartStr = nextChunkRange?.start ? formatDateForAPI(nextChunkRange.start) : '';
  const nextEndStr = nextChunkRange?.end ? formatDateForAPI(nextChunkRange.end) : '';

  // Main query for current chunk
  const { data: calendarData, isLoading: isLoadingTraining } = useCalendarRange(
    startDateStr,
    endDateStr,
    { enabled: !!clientId && !!startDateStr && !!endDateStr }
  );

  // Prefetch queries for adjacent chunks (run in background)
  const { data: prevChunkData } = useCalendarRange(
    prevStartStr,
    prevEndStr,
    { enabled: !!clientId && !!prevStartStr && !!prevEndStr && shouldPrefetchPrev }
  );

  const { data: nextChunkData } = useCalendarRange(
    nextStartStr,
    nextEndStr,
    { enabled: !!clientId && !!nextStartStr && !!nextEndStr && shouldPrefetchNext }
  );

  // Helper to convert calendar data to local format
  const convertCalendarData = (data: typeof calendarData) => {
    if (!data) return {};
    const converted: { [dateKey: string]: Array<Workout & { id: string }> } = {};

    Object.keys(data).forEach((dateKey) => {
      // dateKey is in dd-mm-yyyy format
      const [day, month, year] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const isoKey = getDateKey(date);
      converted[isoKey] = data[dateKey].map((workout) => ({
        ...workout,
        id: workout.id,
        name: (workout as any).name || (workout as any).workout,
        isFavourite: (workout as any).isFavourite || false,

      }));
    });

    return converted;
  };

  // Sync React Query data to local state
  // We keep the local state 'workoutsByDate' to support the extensive optimistic updates in this file
  // but we hydrate it from the server data when it arrives.
  useEffect(() => {
    const allData = {
      ...convertCalendarData(calendarData),
      ...convertCalendarData(prevChunkData),
      ...convertCalendarData(nextChunkData),
    };

    if (Object.keys(allData).length > 0) {
      // Merge with existing data (existing data takes precedence for optimistic updates)
      setWorkoutsByDate((prev) => ({
        ...allData,
        ...prev,
      }));
    }

    // Clear navigation loading state when data arrives
    if (isNavigationLoading && calendarData !== undefined) {
      setIsNavigationLoading(false);
      setPendingNavigationWeek(null);
    }
  }, [calendarData, prevChunkData, nextChunkData, isNavigationLoading]);

  // Use hook for completion logs
  const { data: completionLogs } = useCompletionLogs({ enabled: !!clientId });

  useEffect(() => {
    if (completionLogs) {
      // Convert completion logs to state format
      const workoutStatusMap: {
        [workoutId: string]: 'not_started' | 'in_progress' | 'completed';
      } = {};

      completionLogs.workouts.forEach((workout) => {
        workoutStatusMap[workout.workoutId] = workout.status;
      });

      setWorkoutStatus(workoutStatusMap);

      const setStatusMap: {
        [workoutId: string]: {
          [exerciseInstanceId: string]: {
            [setNumber: number]: 'not_started' | 'completed';
          };
        };
      } = {};

      completionLogs.sets.forEach((set) => {
        if (!setStatusMap[set.workoutId]) {
          setStatusMap[set.workoutId] = {};
        }
        if (!setStatusMap[set.workoutId][set.exerciseInstanceId]) {
          setStatusMap[set.workoutId][set.exerciseInstanceId] = {};
        }
        setStatusMap[set.workoutId][set.exerciseInstanceId][set.setNumber] = set.status;
      });

      setSetStatus(setStatusMap);

      const sectionStatusMap: {
        [workoutId: string]: {
          [sectionId: string]: 'not_started' | 'in_progress' | 'completed';
        };
      } = {};

      completionLogs.sections?.forEach((section) => {
        if (!sectionStatusMap[section.workoutId]) {
          sectionStatusMap[section.workoutId] = {};
        }
        sectionStatusMap[section.workoutId][section.sectionId] = section.status;
      });

      setSectionStatus(sectionStatusMap);
    }
  }, [completionLogs]);


  // Restore view state from URL params (when navigating back from edit page)
  useEffect(() => {
    const currentWeekParam = searchParams.get('currentWeek');
    const selectedWeekParam = searchParams.get('selectedWeek');

    if (currentWeekParam) {
      const week = parseInt(currentWeekParam, 10);
      if (!Number.isNaN(week)) {
        setCurrentWeek(week);
      }
    }

    if (selectedWeekParam && ['1', '2', '4'].includes(selectedWeekParam)) {
      setSelectedWeek(selectedWeekParam);
    }

    // Clean up URL params after restoring state
    if (currentWeekParam || selectedWeekParam) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('currentWeek');
      newSearchParams.delete('selectedWeek');
      if (newSearchParams.toString()) {
        router.replace(`/athletes/${clientId}/training-calendar?${newSearchParams.toString()}`, { scroll: false });
      } else {
        router.replace(`/athletes/${clientId}/training-calendar`, { scroll: false });
      }
    }
  }, [searchParams, clientId, router]);

  // Handle query params for auto-opening modals
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    const modalType = searchParams.get('modalType');

    if (openModal === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (modalType === 'workout') {
        setSelectedDateForWorkout(today);
        setPreventAutoFocus(true);
        setIsAddWorkoutPanelOpen(true);
      } else if (modalType === 'program') {
        setSelectedDateForWorkout(today);
        setPreventAutoFocus(true);
        setIsAddProgramPanelOpen(true);
      }

      // Clean up URL params
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('openModal');
      newSearchParams.delete('modalType');
      newSearchParams.delete('workoutId');
      newSearchParams.delete('workoutName');
      newSearchParams.delete('programId');
      newSearchParams.delete('programName');

      if (modalType) {
        router.replace(`/athletes/${clientId}/training-calendar?${newSearchParams.toString()}`, { scroll: false });
      }
    }
  }, [searchParams, clientId, router]);

  // Log schema and update service whenever workoutsByDate changes
  useEffect(() => {
    const schema = buildTrainingCalendarSchema(workoutsByDate);
    console.log('Training Calendar Schema:', schema);

    // Use RQ mutation instead of direct update
    // Only call if schema has changed significantly or rely on explicit save actions.
    // The previous code logged and updated on EVERY workoutsByDate change, which might be too frequent.
    // However, workoutsByDate is local. 
    // Since we now use apiAssignWorkout for explicit updates, maybe we don't need this catch-all?
    // The catch-all was "Log schema and update service whenever workoutsByDate changes".
    // This implies auto-saving ANY local change. 
    // I will use updateCalendar from hook.

    // Auto-save removed in favor of explicit save interactions
  }, [workoutsByDate, clientId]);

  const getWeekRange = () => {
    const weeksView = parseInt(selectedWeek, 10);

    // Get the first Monday (start of first week)
    const startDate = calendarDates[0]?.[0];
    if (!startDate) return '';

    // Get the last Sunday (end of last week) - index 6 is Sunday
    const endDate = calendarDates[weeksView - 1]?.[6];
    if (!endDate) return '';

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const is2WeeksAvailable = totalWeeks % 2 === 0;
  const is4WeeksAvailable = totalWeeks % 4 === 0;

  // Calculate dates for the visible weeks
  const calendarDates = useMemo(() => {
    const weeksView = parseInt(selectedWeek, 10);
    const dates: Date[][] = [];

    for (let weekIndex = 0; weekIndex < weeksView; weekIndex++) {
      // Calculate week offset: currentWeek is 1-indexed, so week 1 = 0 offset, week 0 = -1 offset, week -1 = -2 offset
      const weekOffset = currentWeek - 1 + weekIndex;
      const weekStart = new Date(startDate);
      weekStart.setTime(startDate.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);

      const weekDates: Date[] = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        weekDates.push(date);
      }
      dates.push(weekDates);
    }

    return dates;
  }, [selectedWeek, currentWeek, startDate]);

  // Get day names (Mon-Sun)
  const dayNames = [
    t('calendar.days.mon'),
    t('calendar.days.tue'),
    t('calendar.days.wed'),
    t('calendar.days.thu'),
    t('calendar.days.fri'),
    t('calendar.days.sat'),
    t('calendar.days.sun'),
  ];

  // Get number of rows based on selected week view
  const getRowsCount = () => {
    return parseInt(selectedWeek, 10);
  };

  // Check if a date is in the past (before today)
  const isDateInPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
  };

  // Check if a date is tomorrow or later (future, not including today)
  const isTomorrowOrLater = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  // Check if a dateKey represents tomorrow or later
  const isDateKeyTomorrowOrLater = (dateKey: string): boolean => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return isTomorrowOrLater(date);
  };

  // Get section status (for AMRAP and timed sections)
  const getSectionStatus = (
    workoutId: string,
    sectionId: string
  ): 'not_started' | 'in_progress' | 'completed' => {
    return sectionStatus[workoutId]?.[sectionId] || 'not_started';
  };

  // Calculate workout status from set and section completion status
  // Logic:
  // - For regular sections: check set completion
  // - For AMRAP/timed sections: check section completion
  // - If ALL sections/sets are completed → 'completed'
  // - If ALL sections/sets are not_started AND no explicit in_progress status → 'not_started'
  // - Otherwise (some completed, some not, or workout was started) → 'in_progress'
  const getWorkoutStatus = (
    workoutId: string,
    workoutSchema?: WorkoutSection[],
    dayStatus?: 'not_started' | 'in_progress' | 'completed'
  ): 'not_started' | 'in_progress' | 'completed' => {
    // If day_status is provided from the API, use it as the primary source
    if (dayStatus) {
      return dayStatus;
    }

    // Get explicit workout status from API (handles case where user clicked start but hasn't completed sets)
    const explicitStatus = workoutStatus[workoutId];

    if (!workoutSchema) {
      // If no schema, use explicit status or check tracked sets
      const workoutSets = setStatus[workoutId];
      if (!workoutSets) {
        return explicitStatus || 'not_started';
      }

      // Fallback: use sets that have status tracked
      const allSetStatuses: Array<'not_started' | 'completed'> = [];
      Object.values(workoutSets).forEach((exerciseSets) => {
        Object.values(exerciseSets).forEach((setStatusValue) => {
          allSetStatuses.push(setStatusValue);
        });
      });

      if (allSetStatuses.length === 0) {
        return explicitStatus || 'not_started';
      }

      const allCompleted = allSetStatuses.every((status) => status === 'completed');
      if (allCompleted) return 'completed';

      const allNotStarted = allSetStatuses.every((status) => status === 'not_started');
      if (allNotStarted) {
        return explicitStatus === 'in_progress' ? 'in_progress' : 'not_started';
      }

      return 'in_progress';
    }

    // Collect status for all sections
    const sectionStatuses: Array<'not_started' | 'in_progress' | 'completed'> = [];

    workoutSchema.forEach((section) => {
      if (section.type === 'amrap' || section.type === 'timed') {
        // For AMRAP and timed sections, use section-level status
        const status = getSectionStatus(workoutId, section.id);
        sectionStatuses.push(status);
      } else {
        // For regular sections, check all sets
        const setStatuses: Array<'not_started' | 'completed'> = [];
        section.exercises?.forEach((exercise) => {
          exercise.sets?.forEach((set) => {
            const status = getSetStatus(workoutId, exercise.instanceId, set.setNumber);
            setStatuses.push(status);
          });
        });

        // Convert set statuses to section status
        if (setStatuses.length === 0) {
          sectionStatuses.push('not_started');
        } else {
          const allCompleted = setStatuses.every((status) => status === 'completed');
          const allNotStarted = setStatuses.every((status) => status === 'not_started');

          if (allCompleted) {
            sectionStatuses.push('completed');
          } else if (allNotStarted) {
            sectionStatuses.push('not_started');
          } else {
            sectionStatuses.push('in_progress');
          }
        }
      }
    });

    if (sectionStatuses.length === 0) {
      return explicitStatus || 'not_started';
    }

    // Check if all sections are completed
    const allCompleted = sectionStatuses.every((status) => status === 'completed');
    if (allCompleted) {
      return 'completed';
    }

    // Check if all sections are not_started
    const allNotStarted = sectionStatuses.every((status) => status === 'not_started');
    if (allNotStarted) {
      // If explicit status is 'in_progress', user started the workout but hasn't completed any sections
      return explicitStatus === 'in_progress' ? 'in_progress' : 'not_started';
    }

    // Mixed state: some completed, some not → in_progress
    return 'in_progress';
  };

  // Get set status (defaults to 'not_started' if not set)
  const getSetStatus = (
    workoutId: string,
    exerciseInstanceId: string,
    setNumber: number
  ): 'not_started' | 'completed' => {
    return setStatus[workoutId]?.[exerciseInstanceId]?.[setNumber] || 'not_started';
  };

  // Render status icon for workout
  const renderWorkoutStatusIcon = (status: 'not_started' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'not_started':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleX className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.notStarted')}</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'in_progress':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleEllipsis className="size-4 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.inProgress')}</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'completed':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleCheck className="size-4 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.completed')}</p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleX className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.notStarted')}</p>
            </TooltipContent>
          </Tooltip>
        );
    }
  };

  // Render status icon for set
  const renderSetStatusIcon = (status: 'not_started' | 'completed') => {
    switch (status) {
      case 'not_started':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleX className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.notStarted')}</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'completed':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleCheck className="size-4 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.completed')}</p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleX className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.notStarted')}</p>
            </TooltipContent>
          </Tooltip>
        );
    }
  };

  // Copy mode keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      if (e.key === 'Escape') {
        if (isCopyMode) {
          setIsCopyMode(false);
          setCopiedWorkout(null);
          setPastedDays([]);
          setHoveredCopyDay(null);
        }
        if (isMultiSelectMode || isMultiSelectCopyMode) {
          handleCancelMultiSelect();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isCopyMode, isMultiSelectMode, isMultiSelectCopyMode]);

  // Exit copy mode when shift is released after pasting at least once
  useEffect(() => {
    if (isCopyMode && !isShiftPressed && pastedDays.length > 0) {
      setIsCopyMode(false);
      setCopiedWorkout(null);
      setPastedDays([]);
      setHoveredCopyDay(null);
    }
  }, [isCopyMode, isShiftPressed, pastedDays.length]);

  // Check if a workout is in the library (has a matching id in availableWorkouts)
  const checkIsInLibrary = (workoutId: string): boolean => {
    // Extract base ID (before any timestamp suffix like -YYYY-MM-DD or -timestamp)
    const baseId = workoutId.split('-')[0];
    return availableWorkouts.some(w => w.id === baseId || w.id === workoutId);
  };

  // Copy workout handler
  const handleCopyWorkout = (dateKey: string, workout: Workout & { id: string }) => {
    setIsCopyMode(true);
    setCopiedWorkout({ workout, dateKey });
    setPastedDays([]);
    setHoveredCopyDay(null);
  };

  // Paste workout handler - calls API to duplicate workout
  const handlePasteWorkout = async (targetDateKey: string) => {
    if (!copiedWorkout || targetDateKey === copiedWorkout.dateKey || pastedDays.includes(targetDateKey)) {
      return;
    }

    // Generate temporary ID for optimistic UI
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempWorkout = {
      ...copiedWorkout.workout,
      id: tempId,
    };

    // Optimistic update with loading state
    setLoadingWorkoutIds((prev) => new Set(prev).add(tempId));
    setWorkoutsByDate((prev) => ({
      ...prev,
      [targetDateKey]: [...(prev[targetDateKey] ?? []), tempWorkout],
    }));
    setPastedDays((prev) => [...prev, targetDateKey]);

    // If not holding shift, exit copy mode after paste
    const shouldExitCopyMode = !isShiftPressed;
    if (shouldExitCopyMode) {
      setIsCopyMode(false);
      setCopiedWorkout(null);
      setPastedDays([]);
      setHoveredCopyDay(null);
    }

    try {
      // Call API to duplicate workout
      const result = await apiDuplicateWorkout({
        clientId,
        sourceDate: copiedWorkout.dateKey,
        sourceWorkoutId: copiedWorkout.workout.id,
        targetDate: targetDateKey,
      });

      // Update with actual server ID
      setWorkoutsByDate((prev) => {
        const updated = { ...prev };
        if (updated[targetDateKey]) {
          updated[targetDateKey] = updated[targetDateKey].map((w) =>
            w.id === tempId ? { ...w, id: result.newWorkoutId } : w
          );
        }
        return updated;
      });
    } catch (error) {
      // Rollback on error
      setWorkoutsByDate((prev) => {
        const updated = { ...prev };
        if (updated[targetDateKey]) {
          updated[targetDateKey] = updated[targetDateKey].filter((w) => w.id !== tempId);
        }
        return updated;
      });
      toast.error('Failed to duplicate workout');
    } finally {
      // Remove loading state
      setLoadingWorkoutIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  };

  // Cancel copy mode
  const handleCancelCopy = () => {
    setIsCopyMode(false);
    setCopiedWorkout(null);
    setPastedDays([]);
    setHoveredCopyDay(null);
  };

  // Multi-select handlers
  const handleToggleWorkoutSelection = (dateKey: string, workout: Workout & { id: string }) => {
    const isSelected = selectedWorkouts.some(
      (sw) => sw.workout.id === workout.id && sw.dateKey === dateKey
    );

    if (isSelected) {
      // Deselect
      const newSelection = selectedWorkouts.filter(
        (sw) => !(sw.workout.id === workout.id && sw.dateKey === dateKey)
      );
      setSelectedWorkouts(newSelection);

      // If no more selected, exit multi-select mode
      if (newSelection.length === 0) {
        setIsMultiSelectMode(false);
        setIsMultiSelectCopyMode(false);
      }
    } else {
      // Select
      setSelectedWorkouts([...selectedWorkouts, { workout, dateKey }]);
      setIsMultiSelectMode(true);
    }
  };

  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setIsMultiSelectCopyMode(false);
    setSelectedWorkouts([]);
    setMultiSelectPastedDays([]);
    setMultiSelectHoveredDay(null);
  };

  const handleDeleteSelectedWorkouts = async () => {
    if (selectedWorkouts.length === 0) return;

    // Add loading state to all selected workout cards
    const workoutIds = selectedWorkouts.map((sw) => sw.workout.id);
    setLoadingWorkoutIds((prev) => {
      const next = new Set(prev);
      workoutIds.forEach((id) => next.add(id));
      return next;
    });

    // Exit multi-select mode immediately
    const workoutsToDelete = [...selectedWorkouts];
    handleCancelMultiSelect();

    // Call API for each workout in parallel
    const results = await Promise.allSettled(
      workoutsToDelete.map(async ({ dateKey, workout }) => {
        try {
          await apiDeleteWorkoutByKey({
            clientId,
            sourceDate: dateKey,
            workoutId: workout.id,
          });

          // Remove from local state
          setWorkoutsByDate((prev) => {
            const updated = { ...prev };
            if (updated[dateKey]) {
              updated[dateKey] = updated[dateKey].filter((w) => w.id !== workout.id);
            }
            return updated;
          });

          return { success: true, workoutId: workout.id };
        } catch (error) {
          return { success: false, workoutId: workout.id };
        } finally {
          // Remove loading state for this workout
          setLoadingWorkoutIds((prev) => {
            const next = new Set(prev);
            next.delete(workout.id);
            return next;
          });
        }
      })
    );

    // Show summary toast
    const successes = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success);
    const failures = results.filter((r) => r.status === 'fulfilled' && !(r.value as any).success);

    if (failures.length > 0) {
      toast.error(`Failed to delete ${failures.length} workout(s)`);
    }
  };

  const handleStartMultiSelectCopy = () => {
    setIsMultiSelectCopyMode(true);
    setMultiSelectPastedDays([]);
    setMultiSelectHoveredDay(null);
  };

  const handleMultiSelectPaste = async (targetDateKey: string) => {
    if (selectedWorkouts.length === 0) return;

    // Sort selected workouts by dateKey to maintain relative positions
    const sortedWorkouts = [...selectedWorkouts].sort((a, b) => {
      return a.dateKey.localeCompare(b.dateKey);
    });

    // Get the earliest dateKey from the selection
    const earliestDateKey = sortedWorkouts[0].dateKey;
    const earliestDate = new Date(earliestDateKey);
    const targetDate = new Date(targetDateKey);

    // Build list of workouts to duplicate with their temp IDs and target dates
    const duplicateTasks: Array<{
      workout: Workout & { id: string };
      sourceDate: string;
      targetDateKey: string;
      tempId: string;
    }> = [];

    sortedWorkouts.forEach(({ workout, dateKey }) => {
      // Calculate the offset from the earliest date
      const workoutDate = new Date(dateKey);
      const dayOffset = Math.floor(
        (workoutDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate the target date for this workout
      const newTargetDate = new Date(targetDate);
      newTargetDate.setDate(newTargetDate.getDate() + dayOffset);
      const newTargetDateKey = newTargetDate.toISOString().split('T')[0];

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      duplicateTasks.push({
        workout,
        sourceDate: dateKey,
        targetDateKey: newTargetDateKey,
        tempId,
      });
    });

    // Optimistic update: add all temp workouts with loading state
    const tempIds = duplicateTasks.map((t) => t.tempId);
    setLoadingWorkoutIds((prev) => {
      const next = new Set(prev);
      tempIds.forEach((id) => next.add(id));
      return next;
    });

    setWorkoutsByDate((prev) => {
      const updated = { ...prev };
      duplicateTasks.forEach(({ workout, targetDateKey: tdk, tempId }) => {
        const tempWorkout = { ...workout, id: tempId };
        updated[tdk] = [...(updated[tdk] ?? []), tempWorkout];
      });
      return updated;
    });

    setMultiSelectPastedDays((prev) => [...prev, targetDateKey]);

    // Exit multi-select copy mode immediately
    handleCancelMultiSelect();

    // Call API for each workout in parallel
    const results = await Promise.allSettled(
      duplicateTasks.map(async ({ workout, sourceDate, targetDateKey: tdk, tempId }) => {
        try {
          const result = await apiDuplicateWorkout({
            clientId,
            sourceDate,
            sourceWorkoutId: workout.id,
            targetDate: tdk,
          });

          // Update with actual server ID
          setWorkoutsByDate((prev) => {
            const updated = { ...prev };
            if (updated[tdk]) {
              updated[tdk] = updated[tdk].map((w) =>
                w.id === tempId ? { ...w, id: result.newWorkoutId } : w
              );
            }
            return updated;
          });

          return { success: true, tempId };
        } catch (error) {
          // Rollback this specific workout
          setWorkoutsByDate((prev) => {
            const updated = { ...prev };
            if (updated[tdk]) {
              updated[tdk] = updated[tdk].filter((w) => w.id !== tempId);
            }
            return updated;
          });
          return { success: false, tempId };
        } finally {
          // Remove loading state for this workout
          setLoadingWorkoutIds((prev) => {
            const next = new Set(prev);
            next.delete(tempId);
            return next;
          });
        }
      })
    );

    // Show error if any failed
    const failures = results.filter((r) => r.status === 'fulfilled' && !(r.value as any).success);
    if (failures.length > 0) {
      toast.error(`Failed to duplicate ${failures.length} workout(s)`);
    }
  };


  const handleMultiSelectDayHover = (dateKey: string) => {
    if (isMultiSelectCopyMode && !multiSelectPastedDays.includes(dateKey)) {
      setMultiSelectHoveredDay(dateKey);
    }
  };

  const handleMultiSelectDayLeave = () => {
    setMultiSelectHoveredDay(null);
  };

  // Check if a workout is selected
  const isWorkoutSelected = (dateKey: string, workoutId: string): boolean => {
    return selectedWorkouts.some(
      (sw) => sw.workout.id === workoutId && sw.dateKey === dateKey
    );
  };

  // Copy day hover handlers
  const handleCopyDayHover = (dateKey: string) => {
    if (isCopyMode && !pastedDays.includes(dateKey)) {
      setHoveredCopyDay(dateKey);
    }
  };

  const handleCopyDayLeave = () => {
    setHoveredCopyDay(null);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === 'workout') {
      setDraggedWorkout({
        workout: data.workout,
        sourceDateKey: data.dateKey,
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDragOverDay(null);
      return;
    }
    const data = over.data.current;
    if (data?.type === 'day-drop-zone') {
      setDragOverDay(data.dateKey);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;

    if (!over || !draggedWorkout) {
      setDraggedWorkout(null);
      setDragOverDay(null);
      return;
    }

    const overData = over.data.current;
    if (overData?.type === 'day-drop-zone') {
      const targetDateKey = overData.dateKey;
      const { sourceDateKey, workout } = draggedWorkout;

      // Don't do anything if dropping on the same day
      if (sourceDateKey === targetDateKey) {
        setDraggedWorkout(null);
        setDragOverDay(null);
        return;
      }

      // Move workout from source to target
      setWorkoutsByDate((prev) => {
        const updated = { ...prev };

        // Remove from source
        if (updated[sourceDateKey]) {
          updated[sourceDateKey] = updated[sourceDateKey].filter((w) => w.id !== workout.id);
        }

        // Add to target
        updated[targetDateKey] = [...(updated[targetDateKey] || []), workout];

        return updated;
      });
    }

    setDraggedWorkout(null);
    setDragOverDay(null);
  };

  // Save workout to library handler
  const handleSaveToLibrary = (workout: Workout & { id: string }) => {
    // Open the create workout panel with the workout data pre-filled
    setIsCreateWorkoutPanelOpen(true);
    // Store the workout to save in a temporary state - we'll use initialData prop
  };

  const handleOpenAddWorkoutPanel = (date: Date) => {
    setSelectedDateForWorkout(date);
    setIsAddWorkoutPanelOpen(true);
  };

  const handleOpenAddProgramPanel = (date: Date) => {
    setSelectedDateForWorkout(date);
    setIsAddProgramPanelOpen(true);
  };

  const handleOpenAddExercisePanel = (date: Date) => {
    setSelectedDateForWorkout(date);
    setIsAddExercisePanelOpen(true);
  };

  const handleSaveWorkout = async (selectedWorkout: Workout, scheduleOption: string, config: string) => {
    if (!selectedWorkout || !selectedDateForWorkout) {
      setIsAddWorkoutPanelOpen(false);
      return;
    }

    // Fetch full workout data including workout_data
    let fullWorkout: Workout & { workout_data?: any };
    try {
      fullWorkout = await queryClient.fetchQuery({
        queryKey: ['coach-workout', selectedWorkout.id],
        queryFn: () => getWorkoutById(selectedWorkout.id),
        staleTime: 5 * 60 * 1000,
      });
    } catch (error) {
      console.error('Failed to fetch full workout data:', error);
      // Fall back to using the workout without workout_data
      fullWorkout = selectedWorkout;
    }

    const workoutToAdd = {
      ...fullWorkout,
      id: `${selectedWorkout.id}-${Date.now()}`,
    };


    setIsAddWorkoutPanelOpen(false); // Close immediately or wait?

    // Calculate dates to add
    const datesToAdd: Date[] = [];

    // Calculate upper bound based on configured total weeks
    const calendarEndDate = new Date(startDate);
    calendarEndDate.setDate(startDate.getDate() + totalWeeks * 7 - 1);

    const addDate = (date: Date) => {
      // Clone date to avoid reference issues
      datesToAdd.push(new Date(date));
    };

    if (scheduleOption === 'every' && config) {
      const daysInterval = parseInt(config, 10);
      if (Number.isFinite(daysInterval) && daysInterval > 0) {
        const current = new Date(selectedDateForWorkout);
        current.setHours(0, 0, 0, 0);

        while (current <= calendarEndDate) {
          addDate(current);
          current.setDate(current.getDate() + daysInterval);
        }
      } else {
        addDate(selectedDateForWorkout);
      }
    } else if (scheduleOption === 'weekly' && config) {
      // config is day name (Monday, Tuesday etc)
      const daysMap: { [key: string]: number } = {
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
      };
      const dayOfWeek = daysMap[config];

      if (dayOfWeek) {
        for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
          const monday = new Date(startDate);
          monday.setDate(startDate.getDate() + weekIndex * 7);
          monday.setHours(0, 0, 0, 0);

          const target = new Date(monday);
          target.setDate(monday.getDate() + (dayOfWeek - 1));
          target.setHours(0, 0, 0, 0);

          // Only add if target date is same or after selected date (which initiated the add)
          if (target >= selectedDateForWorkout && target <= calendarEndDate) {
            addDate(target);
          }
        }
      } else {
        addDate(selectedDateForWorkout);
      }
    } else {
      // Default: add only for the selected day
      addDate(selectedDateForWorkout);
    }

    try {
      // 1. Calculate and apply optimistic updates
      const optimisticWorkouts: { [dateKey: string]: Array<Workout & { id: string }> } = {};

      datesToAdd.forEach((date) => {
        const dateKey = getDateKey(date);
        const optimisticId = `${selectedWorkout.id}__${dateKey}__${Date.now()}`;

        const optimisticWorkout: Workout & { id: string } = {
          ...workoutToAdd,
          id: optimisticId,
          items: workoutToAdd.items || [],
          ...DEFAULT_EXECUTION_FIELDS,
          // Map flattened fields if needed, mostly ready from fullWorkout
          totalExercises: fullWorkout.totalExercises || 0,
        };

        if (!optimisticWorkouts[dateKey]) {
          optimisticWorkouts[dateKey] = [];
        }
        optimisticWorkouts[dateKey].push(optimisticWorkout);
      });

      setWorkoutsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(optimisticWorkouts).forEach((dateKey) => {
          updated[dateKey] = [
            ...(updated[dateKey] || []),
            ...optimisticWorkouts[dateKey]
          ];
        });
        return updated;
      });

      // 2. Perform API calls
      const promises = datesToAdd.map(date =>
        apiAssignWorkout({
          clientId,
          date: getDateKey(date),
          workoutId: selectedWorkout.id,
          skipInvalidation: true // We manually invalidate or rely on optimistic
        })
      );

      await Promise.all(promises);

      // 3. Invalidate to fetch real data (eventually replaces optimistic)
      queryClient.invalidateQueries({ queryKey: ['client-training-calendar'] });

      if (datesToAdd.length === 1) {
        const dateStr = datesToAdd[0].toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        toast.success(`Workout assigned to ${dateStr}`);
      } else {
        toast.success(`Successfully assigned ${datesToAdd.length} days of training`);
      }

    } catch (error) {
      console.error('Failed to assign workouts:', error);
      toast.error('Failed to save workouts');
    }
  };

  const handleSaveProgram = async (
    selectedProgram: Program,
    startDateInput: Date,
    detailedProgram?: Program & { program_data: any },
    range?: { start: number; end: number }
  ) => {
    if (!selectedProgram || !startDateInput || !detailedProgram) {
      setIsAddProgramPanelOpen(false);
      return;
    }

    const start = new Date(startDateInput);
    start.setHours(0, 0, 0, 0);

    // Filter days based on range
    const startDay = range?.start ?? 1;
    const endDay = range?.end ?? 1000;

    const schema = detailedProgram.program_data.schema || detailedProgram.program_data.days || [];

    const daysToAssign = schema.filter((day: any, idx: number) => {
      // Use logic matching SidePanel
      const dayNumber = day.day || (schema.indexOf(day) ?? 0) + 1;
      return dayNumber >= startDay && dayNumber <= endDay;
    });

    // Collect all workouts to assign - program workouts contain embedded data, not library references
    const workoutsToAssign: Array<{ workout: any, date: Date }> = [];

    // Sort days by day number to ensure correct sequence order
    daysToAssign.sort((a: any, b: any) => {
      const dayNumA = a.day || 0;
      const dayNumB = b.day || 0;
      return dayNumA - dayNumB;
    });

    daysToAssign.forEach((day: any) => {
      const workouts = day.workouts || [];
      // Calculate target date
      // Logic: Day [startDay] maps to [start] date.
      // Day [X] maps to [start] + (X - startDay) days.

      // Get the day number of this day item
      const dayNumber = day.day || (schema.indexOf(day) ?? 0) + 1;

      const dayOffset = dayNumber - startDay;
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + dayOffset);

      workouts.forEach((workout: any) => {
        // All workouts from program schema are embedded data, not references to coach_workouts
        // The workout.id here is an internal program identifier, not a coach_workouts table ID
        if (workout.title || workout.items) {
          workoutsToAssign.push({
            workout,
            date: new Date(targetDate)
          });
        }
      });
    });

    const totalWorkouts = workoutsToAssign.length;

    // Execute assignments
    if (totalWorkouts === 0) {
      toast.info("No workouts found in the selected range.");
      setIsAddProgramPanelOpen(false);
      return;
    }

    try {
      // Optimistically update local state first
      const optimisticWorkouts: { [dateKey: string]: Array<Workout & { id: string }> } = {};

      workoutsToAssign.forEach(assignment => {
        const dateKey = getDateKey(assignment.date);
        const workoutId = `${assignment.workout.id || 'prog'}-${dateKey}-${Date.now()}`;
        const optimisticWorkout: Workout & { id: string } = {
          id: workoutId,
          name: assignment.workout.title,
          description: assignment.workout.description || '',
          type: assignment.workout.type || 'strength',
          difficulty: assignment.workout.difficulty || 'intermediate',
          totalExercises: assignment.workout.totalExercises || 0,
          equipment: assignment.workout.equipment || [],
          created: formatDate(new Date()),
          isFavourite: false,
          items: assignment.workout.items || [],
          ...DEFAULT_EXECUTION_FIELDS,
        };

        if (!optimisticWorkouts[dateKey]) {
          optimisticWorkouts[dateKey] = [];
        }
        optimisticWorkouts[dateKey].push(optimisticWorkout);
      });

      // Update local state immediately (optimistic)
      setWorkoutsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(optimisticWorkouts).forEach((dateKey) => {
          updated[dateKey] = [...(updated[dateKey] || []), ...optimisticWorkouts[dateKey]];
        });
        return updated;
      });

      // Assign all workouts with full payload - program workouts have embedded data
      // Skip invalidation since we're using optimistic updates
      const promises = workoutsToAssign.map((assignment, index) => {
        const dateKey = getDateKey(assignment.date);
        const workoutId = optimisticWorkouts[dateKey][index % optimisticWorkouts[dateKey].length].id;
        return apiAssignWorkout({
          clientId,
          date: dateKey,
          workoutPayload: {
            id: workoutId,
            title: assignment.workout.title,
            name: assignment.workout.title,
            description: assignment.workout.description || '',
            type: assignment.workout.type || 'strength',
            difficulty: assignment.workout.difficulty || 'intermediate',
            equipment: assignment.workout.equipment || [],
            totalExercises: assignment.workout.totalExercises || 0,
            items: assignment.workout.items || [],
            ...DEFAULT_EXECUTION_FIELDS,
          },
          isNew: true,
          skipInvalidation: true,
        });
      });

      await Promise.all(promises);
      toast.success('Successfully assigned program');

    } catch (error) {
      console.error("Failed to assign program workouts", error);
      toast.error("Failed to assign program");
      // Revert optimistic update by re-fetching
      queryClient.invalidateQueries({ queryKey: ['client-training-calendar'] });
    }

    setIsAddProgramPanelOpen(false);
  };

  const handleSaveExercise = async (selectedExercise: CoachExercise) => {
    if (!selectedExercise || !selectedDateForWorkout) {
      setIsAddExercisePanelOpen(false);
      return;
    }

    const dateKey = getDateKey(selectedDateForWorkout);

    const workoutFromExercise: Workout & { id: string } = {
      id: `${selectedExercise.id}-${dateKey}-${Date.now()}`,
      name: selectedExercise.name,
      description: selectedExercise.description || '',
      type: selectedExercise.category || '',
      difficulty: 'Intermediate',
      totalExercises: 1,
      equipment: selectedExercise.equipment || [],
      created: formatDate(new Date()),
      isFavourite: false,
      items: [
        {
          itemType: 'section',
          data: {
            id: `section-${Date.now()}`,
            name: selectedExercise.name,
            type: 'timed',
            exercises: [
              {
                id: `ex-${Date.now()}`,
                exercise_id: selectedExercise.id,
                workout: selectedExercise.name,
                description: selectedExercise.description || '',
                equipment: selectedExercise.equipment ? [selectedExercise.equipment] : [],
                videoLink: selectedExercise.video_link,
                blocks: [
                  {
                    id: `block-${Date.now()}`,
                    type: 'standard',
                    unit: 'reps',
                    targetValue: 10,
                  }
                ]
              }
            ]
          }
        }
      ] as any[],
    };

    setWorkoutsByDate((previousWorkouts) => {
      const updated = {
        ...previousWorkouts,
        [dateKey]: [...(previousWorkouts[dateKey] ?? []), workoutFromExercise],
      };

      return updated;
    });

    setIsAddExercisePanelOpen(false);
  };

  const handleOpenWorkoutDetails = async (dateKey: string, workout: Workout & { id: string }) => {
    // Open the workout builder dialog for editing
    setEditingWorkout({ dateKey, workout });
    setFetchedWorkoutData(null);
    setIsLoadingWorkoutData(true);
    setIsWorkoutBuilderOpen(true);

    // Extract the real workout ID (format: "workoutId__dateKey__timestamp")
    // Use '__' separator to be safe with UUIDs containing dashes
    const parts = workout.id.split('__');
    const realWorkoutId = parts[0];
    const isOptimistic = parts.length > 1;

    // Check if it's an inline-created or temp workout (no need to fetch - use existing data)
    // OR if we already have the full data (e.g. newly created, though backend strip might affect this on reload)
    // Since backend now strips data, we should prefer fetching unless we find it blank.
    if (realWorkoutId === 'inline' || realWorkoutId === 'temp') {
      setFetchedWorkoutData((workout as any) || { items: [] });
      setIsLoadingWorkoutData(false);
      return;
    }

    try {
      // Use new endpoint to get specific instance data
      const fullWorkout = await queryClient.fetchQuery({
        queryKey: ['client-workout-instance', clientId, dateKey, realWorkoutId], // Use real ID (UUID)
        queryFn: () => getClientWorkoutInstance(clientId, dateKey, realWorkoutId),
        staleTime: 0, // Always fetch fresh to get latest instance state
      });

      const workoutData = fullWorkout || { items: [] };
      setFetchedWorkoutData(workoutData);

      // We explicitly DON'T update the calendar state with the full data anymore
      // to keep the main list lightweight. We only use it for the builder.

    } catch (error) {
      console.error('Failed to fetch workout instance:', error);
      // Fall back to lightweight data if fetch fails (better than nothing)
      setFetchedWorkoutData((workout as any) || { items: [] });
      toast.error('Failed to load full workout details');
    } finally {
      setIsLoadingWorkoutData(false);
    }
  };

  const handleOpenCompletedSummary = async (dateKey: string, workout: Workout & { id: string }) => {
    // Open the dialog immediately with loading state
    setIsLoadingCompletedSummary(true);
    setFetchedCompletedWorkoutData(null);
    setCompletedSummaryWorkout({ workout, dateKey });

    // Extract the real workout ID (format: "workoutId__dateKey__timestamp")
    const parts = workout.id.split('__');
    const realWorkoutId = parts[0];

    try {
      // Fetch the full workout data from training_clients
      const fullWorkout = await queryClient.fetchQuery({
        queryKey: ['client-workout-instance-summary', clientId, dateKey, realWorkoutId],
        queryFn: () => getClientWorkoutInstance(clientId, dateKey, realWorkoutId),
        staleTime: 0, // Always fetch fresh
      });

      setFetchedCompletedWorkoutData(fullWorkout);
    } catch (error) {
      console.error('Failed to fetch completed workout details:', error);
      toast.error('Failed to load workout details');
    } finally {
      setIsLoadingCompletedSummary(false);
    }
  };

  const handleSaveEditedWorkout = async (payload: WorkoutProgramPayload) => {
    // If we are editing an existing workout
    if (editingWorkout) {
      const { dateKey, workout } = editingWorkout;

      try {
        // 1. Optimistic Update: Update UI immediately before API call
        setWorkoutsByDate((prev) => {
          const workoutsForDay = prev[dateKey] || [];
          const updatedWorkouts = workoutsForDay.map((w) => {
            if (w.id === workout.id) {
              return {
                ...w,
                name: payload.name,
                description: payload.description,
                type: payload.type,
                difficulty: payload.difficulty,
                totalExercises: payload.totalExercises,
                items: payload.items,
                // Ensure legacy fields are updated if present
                title: payload.name,
              };
            }
            return w;
          });
          return {
            ...prev,
            [dateKey]: updatedWorkouts,
          };
        });

        // 2. Extract real ID for API call if it's an optimistic/composite ID
        const realId = workout.id.includes('__') ? workout.id.split('__')[0] : workout.id;

        // 3. Await the API call to ensure data is saved
        await apiAssignWorkout({
          clientId,
          date: dateKey,
          workoutId: realId, // Use real UUID
          workoutPayload: { ...payload, id: realId }, // Ensure payload ID matches
          isNew: false,
          skipInvalidation: true
        });

        // 4. Close dialog immediately after success
        setIsWorkoutBuilderOpen(false);
        setEditingWorkout(null);
        toast.success(t('workouts.edit.toast.updatedSuccessfully', { name: payload.name }));

        // 5. Invalidate queries in background (do not await) to prevent UI lag
        // Defer invalidation slightly to allow dialog to close nicely
        setTimeout(() => {
          // Invalidate specific instance first
          queryClient.invalidateQueries({
            queryKey: ['client-workout-instance', clientId, dateKey, realId]
          });
          // Then calendar
          queryClient.invalidateQueries({
            queryKey: ['client-training-calendar', clientId]
          });
        }, 50);

      } catch (error) {
        console.error('Failed to update workout:', error);
        toast.error('Failed to update workout');
        // Revert on error by invalidating
        queryClient.invalidateQueries({
          queryKey: ['client-training-calendar', clientId]
        });
      }
    } else if (selectedDateForWorkout) {
      // Creating a NEW workout
      try {
        const dateKey = getDateKey(selectedDateForWorkout);

        // 1. Await API
        await apiAssignWorkout({
          clientId,
          date: dateKey,
          workoutPayload: payload,
          isNew: true,
          skipInvalidation: true
        });

        // 2. Close dialog immediately
        setIsWorkoutBuilderOpen(false);
        toast.success('Workout created successfully');

        // No need to manually reset loadedDateRange, hook handles invalidation
        // Actually we skipped it, so we need to valid manually with delay
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ['client-training-calendar', clientId]
          });
        }, 50);

      } catch (error) {
        console.error(error);
        // Hook handles toast error if using mutation, otherwise handled here
      }
    }
  };

  const handleCloseWorkoutDetails = () => {
    setSelectedWorkoutDetails(null);
  };

  const handleDeleteWorkout = async (dateKey: string, workoutId: string) => {
    // Add loading state to the workout card
    setLoadingWorkoutIds((prev) => new Set(prev).add(workoutId));

    try {
      // Call API using the new deleteWorkoutByKey
      await apiDeleteWorkoutByKey({
        clientId,
        sourceDate: dateKey,
        workoutId,
      });

      // Optimistically remove from local state after successful delete
      setWorkoutsByDate((prev) => {
        const updated = { ...prev };
        if (updated[dateKey]) {
          updated[dateKey] = updated[dateKey].filter((w) => w.id !== workoutId);
        }
        return updated;
      });

      // Success - no toast needed
    } catch (error) {
      // Hook handles toast error - just remove loading state
    } finally {
      // Remove loading state
      setLoadingWorkoutIds((prev) => {
        const next = new Set(prev);
        next.delete(workoutId);
        return next;
      });
    }
  };

  // Handle date selection from calendar popup
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedCalendarDate(undefined);
      return;
    }

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    setSelectedCalendarDate(selectedDate);

    // Find the Monday of the week that contains the selected date
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Convert to Monday = 0
    const mondayOfSelectedWeek = new Date(selectedDate);
    mondayOfSelectedWeek.setDate(selectedDate.getDate() + daysToMonday);
    mondayOfSelectedWeek.setHours(0, 0, 0, 0);

    // Calculate the difference in days between the Monday of selected week and startDate
    const diffTime = mondayOfSelectedWeek.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    // Calculate which week contains the selected date
    // Week 1 starts at startDate (Monday)
    // For dates before startDate, weekNumber can be 0 or negative
    // For dates after startDate, weekNumber is positive (1-indexed)
    // Use Math.floor for positive and Math.ceil for negative to get correct week boundaries
    let weekNumber: number;
    if (diffDays >= 0) {
      weekNumber = Math.floor(diffDays / 7) + 1;
    } else {
      // For negative differences, we need to round towards zero
      // Math.ceil(-7/7) = -1, so -1 + 1 = 0 (correct for 1 week before)
      weekNumber = Math.ceil(diffDays / 7) + 1;
    }

    // Allow week numbers from any past date up to totalWeeks
    // Only clamp the upper bound to prevent going too far into the future
    const maxWeek = totalWeeks;

    const finalWeekNumber = weekNumber <= maxWeek ? weekNumber : maxWeek;
    navigateToWeek(finalWeekNumber);
    setIsCalendarOpen(false);
  };

  return (
    <div className="w-full flex flex-col">
      <Card className="w-full flex flex-col p-0 rounded-none border-0 shadow-none" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
        <div className="w-full relative flex-shrink-0">
          <div className="w-full px-3 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 px-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="h-8 border-primary"
                aria-label={t('athletes.trainingCalendar.goToToday')}
                disabled={isNavigationLoading}
              >
                {t('athletes.trainingCalendar.today')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePreviousWeek}
                className="h-8 w-8"
                aria-label={t('athletes.trainingCalendar.previousWeek')}
                disabled={isNavigationLoading}
              >
                {isNavigationLoading && pendingNavigationWeek !== null && pendingNavigationWeek < currentWeek ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChevronLeft className="size-4" />
                )}
              </Button>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-accent rounded-md px-2 py-1 transition-colors w-[240px]">
                    {isNavigationLoading ? (
                      <Loader2 className="size-4 text-primary animate-spin" />
                    ) : (
                      <>
                        <Calendar className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm truncate">{getWeekRange()}</span>
                      </>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    key={`${currentWeek}-${calendarDates[0]?.[0]?.getTime()}`}
                    mode="single"
                    selected={selectedCalendarDate || calendarDates[0]?.[0]}
                    onSelect={handleDateSelect}
                    defaultMonth={calendarDates[0]?.[0]}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleNextWeek}
                disabled={
                  isNavigationLoading ||
                  (() => {
                    const weeksView = parseInt(selectedWeek, 10);
                    const maxStartWeek = totalWeeks - weeksView + 1;
                    return currentWeek >= maxStartWeek;
                  })()
                }
                className="h-8 w-8"
                aria-label={t('athletes.trainingCalendar.nextWeek')}
              >
                {isNavigationLoading && pendingNavigationWeek !== null && pendingNavigationWeek > currentWeek ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-primary gap-1"
                  >
                    {t('athletes.trainingCalendar.saveAs')}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsSaveAsWorkoutOpen(true)}>
                    <span>{t('athletes.trainingCalendar.saveAsWorkout.menuItem')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSaveAsProgramOpen(true)}>
                    <span>{t('athletes.trainingCalendar.saveAsProgram.menuItem')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tabs value={selectedWeek} onValueChange={setSelectedWeek}>
                <TabsList className="w-auto">
                  <TabsTrigger
                    value="1"
                    className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                    title={t('athletes.trainingCalendar.showOneWeek')}
                  >
                    {t('athletes.trainingCalendar.oneWeek')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="2"
                    disabled={!is2WeeksAvailable}
                    className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      is2WeeksAvailable
                        ? t('athletes.trainingCalendar.showTwoWeeks')
                        : t('athletes.trainingCalendar.twoWeeksRequirement')
                    }
                  >
                    {t('athletes.trainingCalendar.twoWeeks')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="4"
                    disabled={!is4WeeksAvailable}
                    className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      is4WeeksAvailable
                        ? t('athletes.trainingCalendar.showFourWeeks')
                        : t('athletes.trainingCalendar.fourWeeksRequirement')
                    }
                  >
                    {t('athletes.trainingCalendar.fourWeeks')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    // Invalidate cache
                    await queryClient.invalidateQueries({ queryKey: ['client-training-calendar', clientId] });

                    // Explicitly fetch the current view's data
                    const freshServerData = await queryClient.fetchQuery({
                      queryKey: ['client-training-calendar', clientId, startDateStr, endDateStr],
                      queryFn: () => getTrainingCalendarRange(clientId, startDateStr, endDateStr),
                      staleTime: 0
                    });

                    // Replace local state with fresh server data (Hard Reset)
                    // This handles empty data correctly (e.g. all workouts deleted)
                    const convertedData = convertCalendarData(freshServerData);
                    setWorkoutsByDate(convertedData);

                    toast.success(t('general.success'));
                  } catch (error) {
                    console.error('Sync failed', error);
                    toast.error(t('general.error'));
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isLoadingTraining || isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sync
              </Button>
            </div>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
        <div className="w-full flex-1 bg-background rounded-none px-4 pb-0 pt-0 min-h-0 flex flex-col relative">
          {isLoadingTraining && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}
          {/* Day names header - only at the top */}
          <div className="flex gap-4 flex-shrink-0 mb-1">
            {calendarDates[0]?.map((date, dayIndex) => (
              <div key={dayIndex} className="flex-1">
                <div className="px-3">
                  <span className="text-xs uppercase text-muted-foreground">{dayNames[dayIndex]}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Calendar rows - one row per week */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className={cn("flex-1 flex flex-col min-h-0", isShiftPressed && "select-none")} style={{ gap: '1rem' }}>
              {Array.from({ length: getRowsCount() }, (_, rowIndex) => {
                const weekDates = calendarDates[rowIndex] || [];
                const rowsCount = getRowsCount();
                // Calculate height: (100% - gaps) / rowsCount
                // Each gap is 1rem, so we calculate: calc((100% - (n-1) * 1rem) / n)
                const gapCount = rowsCount - 1;
                return (
                  <div
                    key={rowIndex}
                    className="flex gap-4 min-h-0 flex-shrink-0"
                    style={{
                      height: gapCount > 0
                        ? `calc((100% - ${gapCount} * 1rem) / ${rowsCount})`
                        : '100%'
                    }}
                  >
                    {weekDates.map((date, dayIndex) => {
                      const dateKey = getDateKey(date);
                      const workoutsForDate = workoutsByDate[dateKey] ?? [];
                      const isCopySource = isCopyMode && copiedWorkout?.dateKey === dateKey;
                      const isHoveredForCopy = isCopyMode && hoveredCopyDay === dateKey && !pastedDays.includes(dateKey);
                      const isPastedDay = pastedDays.includes(dateKey);
                      const isFutureDay = isTomorrowOrLater(date);
                      const isDragOver = dragOverDay === dateKey;
                      const isSourceDay = draggedWorkout?.sourceDateKey === dateKey;

                      return (
                        <DroppableDayWrapper
                          key={dayIndex}
                          dateKey={dateKey}
                          isDraggingGlobal={!!draggedWorkout}
                          isFutureDay={isFutureDay}
                        >
                          <div
                            onClick={() => {
                              if (isCopyMode && !isPastedDay) {
                                handlePasteWorkout(dateKey);
                              } else if (isMultiSelectCopyMode && !isDateInPast(date)) {
                                handleMultiSelectPaste(dateKey);
                              }
                            }}
                            onMouseEnter={() => {
                              if (isCopyMode && !isPastedDay) {
                                handleCopyDayHover(dateKey);
                              } else if (isMultiSelectCopyMode && !isDateInPast(date)) {
                                handleMultiSelectDayHover(dateKey);
                              }
                            }}
                            onMouseLeave={() => {
                              if (isCopyMode) {
                                handleCopyDayLeave();
                              } else if (isMultiSelectCopyMode) {
                                handleMultiSelectDayLeave();
                              }
                            }}
                            className={cn(
                              'group/day relative flex-1 bg-muted rounded-lg border border-border flex flex-col min-h-0 h-full transition-colors',
                              !isCopyMode && !isMultiSelectCopyMode && !draggedWorkout && 'cursor-pointer hover:[&:not(:has(.workout-card:hover))]:border-primary/50',
                              isCopyMode && !isPastedDay && 'cursor-pointer hover:border-primary/50',
                              isMultiSelectCopyMode && isFutureDay && 'cursor-pointer hover:border-primary/50',
                              isDragOver && isFutureDay && 'border-primary',
                            )}
                          >
                            <div className="px-3 py-[2px] border-b border-border flex-shrink-0 flex items-center justify-between">
                              <span className={cn(
                                "text-xs uppercase flex items-center justify-center",
                                isToday(date)
                                  ? "text-primary font-bold"
                                  : "text-muted-foreground"
                              )}>{date.getDate()}</span>
                              {!isDateInPast(date) && !isCopyMode && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon"
                                      className={cn(
                                        'h-4 w-4 -mr-1 rounded-full transition-opacity',
                                        isDragOver && isFutureDay
                                          ? 'opacity-100'
                                          : 'opacity-0 group-hover/day:opacity-100 data-[state=open]:opacity-100 group-has-[.workout-card:hover]/day:opacity-0'
                                      )}
                                      aria-label={t('athletes.trainingCalendar.addWorkoutOrProgram')}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Plus className="size-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenAddWorkoutPanel(date)} className="gap-2">
                                      <Dumbbell className="mr-2 size-3.5" />
                                      <span>{t('athletes.trainingCalendar.addWorkout')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenAddProgramPanel(date)} className="gap-2">
                                      <FileText className="mr-2 size-3.5" />
                                      <span>{t('athletes.trainingCalendar.addProgram')}</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            <div className="flex-1 min-h-0 relative overflow-hidden">
                              <div className={cn(
                                "absolute inset-0 p-3",
                                (isCopySource || isHoveredForCopy) ? "overflow-hidden" : "overflow-y-auto"
                              )}>
                                {workoutsForDate.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    {workoutsForDate.map((workout) => {
                                      const status = getWorkoutStatus(workout.id, undefined, workout.completedSummary?.status);
                                      const isWorkoutInLibrary = checkIsInLibrary(workout.id);
                                      const isWorkoutCopySource = isCopyMode && copiedWorkout?.workout.id === workout.id;
                                      return (
                                        <DraggableWorkoutWrapper
                                          key={workout.id}
                                          workoutId={workout.id}
                                          dateKey={dateKey}
                                          workout={workout}
                                          isCopyMode={isCopyMode}
                                          isFutureDay={isFutureDay}
                                          isMultiSelectMode={isMultiSelectMode}
                                        >
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            aria-label={t('athletes.trainingCalendar.viewDetailsAria', { name: workout.name })}
                                            onClick={() => {
                                              if (isCopyMode || isMultiSelectCopyMode) return;
                                              // In multi-select mode, clicking the card toggles selection instead of opening details
                                              if (isMultiSelectMode) {
                                                handleToggleWorkoutSelection(dateKey, workout);
                                                return;
                                              }
                                              // For in-progress or completed workouts, open the summary dialog
                                              if (status === 'in_progress') {
                                                setInProgressSummaryWorkout({ workout, dateKey });
                                                return;
                                              }
                                              if (status === 'completed') {
                                                handleOpenCompletedSummary(dateKey, workout);
                                                return;
                                              }
                                              // For not_started workouts, open the workout builder
                                              handleOpenWorkoutDetails(dateKey, workout);
                                            }}
                                            onKeyDown={(event) => {
                                              if (isCopyMode || isMultiSelectCopyMode) return;
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                // In multi-select mode, toggle selection with keyboard
                                                if (isMultiSelectMode) {
                                                  handleToggleWorkoutSelection(dateKey, workout);
                                                  return;
                                                }
                                                // For in-progress or completed workouts, open the summary dialog
                                                if (status === 'in_progress') {
                                                  setInProgressSummaryWorkout({ workout, dateKey });
                                                  return;
                                                }
                                                if (status === 'completed') {
                                                  handleOpenCompletedSummary(dateKey, workout);
                                                  return;
                                                }
                                                // For not_started workouts, open the workout builder
                                                handleOpenWorkoutDetails(dateKey, workout);
                                              }
                                            }}
                                            className={cn(
                                              "workout-card rounded-lg border bg-background flex flex-col items-stretch justify-start p-0 overflow-hidden transition-all duration-200 relative",
                                              !isCopyMode && !isMultiSelectMode && !draggedWorkout && "cursor-pointer hover:border-primary/50",
                                              isMultiSelectMode && "cursor-pointer hover:border-primary/50",
                                              isFutureDay && !isCopyMode && !isMultiSelectMode && !draggedWorkout && "cursor-grab active:cursor-grabbing",
                                              isWorkoutCopySource && "opacity-50",
                                              isWorkoutSelected(dateKey, workout.id) && "border-primary",
                                              // Status-based border colors
                                              status === 'in_progress' && "border-amber-500",
                                              status === 'completed' && "border-green-500",
                                              status === 'not_started' && "border-border"
                                            )}
                                          >
                                            {/* Loading overlay for duplicate/delete operations */}
                                            {loadingWorkoutIds.has(workout.id) && <CardLoaderOverlay />}
                                            <div className="px-2 py-1 border-b border-border flex items-center justify-between gap-2 bg-muted/30 group/card-header">
                                              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                                <div className="flex-shrink-0">
                                                  {renderWorkoutStatusIcon(status)}
                                                </div>
                                                <span
                                                  className="text-[11px] font-medium block truncate"
                                                  title={workout.name}
                                                >
                                                  {workout.name}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-0.5">
                                                {/* Checkbox for multi-select - visible on hover or when in multi-select mode */}
                                                <div
                                                  className={cn(
                                                    "flex-shrink-0 transition-opacity",
                                                    isMultiSelectMode || isWorkoutSelected(dateKey, workout.id)
                                                      ? "opacity-100"
                                                      : "opacity-0 group-hover/card-header:opacity-100",
                                                    (isCopyMode || isMultiSelectCopyMode) && "invisible"
                                                  )}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onPointerDown={(e) => e.stopPropagation()}
                                                  onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                  <Checkbox
                                                    checked={isWorkoutSelected(dateKey, workout.id)}
                                                    onCheckedChange={() => handleToggleWorkoutSelection(dateKey, workout)}
                                                    aria-label={t('athletes.trainingCalendar.multiSelect.selectWorkoutAria', { name: workout.name })}
                                                    className="size-3.5"
                                                  />
                                                </div>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className={cn(
                                                        "h-5 w-5 flex-shrink-0 -mr-1 text-muted-foreground hover:text-foreground",
                                                        isCopyMode && "invisible"
                                                      )}
                                                      onClick={(e) => e.stopPropagation()}
                                                      onPointerDown={(e) => e.stopPropagation()}
                                                      onMouseDown={(e) => e.stopPropagation()}
                                                      disabled={isCopyMode}
                                                    >
                                                      <MoreHorizontal className="size-3" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCopyWorkout(dateKey, workout);
                                                    }}>
                                                      <Copy className="mr-2 size-3.5" />
                                                      <span>{t('general.copy')}</span>
                                                    </DropdownMenuItem>
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <div>
                                                            <DropdownMenuItem
                                                              disabled={isWorkoutInLibrary}
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!isWorkoutInLibrary) {
                                                                  handleSaveToLibrary(workout);
                                                                }
                                                              }}
                                                              className={isWorkoutInLibrary ? 'opacity-50 cursor-not-allowed' : ''}
                                                            >
                                                              <Save className="mr-2 size-3.5" />
                                                              <span>{t('athletes.trainingCalendar.saveToLibrary')}</span>
                                                            </DropdownMenuItem>
                                                          </div>
                                                        </TooltipTrigger>
                                                        {isWorkoutInLibrary && (
                                                          <TooltipContent side="left">
                                                            <p>{t('athletes.trainingCalendar.alreadySaved')}</p>
                                                          </TooltipContent>
                                                        )}
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Blur the focused element to prevent focus ring on loading overlay
                                                        (document.activeElement as HTMLElement)?.blur();
                                                        handleDeleteWorkout(dateKey, workout.id);
                                                      }}
                                                    >
                                                      <Trash2 className="mr-2 size-3.5" />
                                                      <span>{t('general.delete')}</span>
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </div>
                                            </div>
                                            <div className="px-2 py-1 flex items-center justify-between">
                                              <span className="text-[10px] text-muted-foreground block">
                                                {workout.totalExercises}{' '}
                                                {workout.totalExercises === 1 ? t('athletes.trainingCalendar.exercise') : t('athletes.trainingCalendar.exercises')}
                                              </span>
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <div
                                                      className={cn(
                                                        "h-5 w-5 -mr-1 rounded-full text-foreground flex items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors",
                                                        isCopyMode && "invisible"
                                                      )}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isCopyMode) {
                                                          handleOpenWorkoutDetails(dateKey, workout);
                                                        }
                                                      }}
                                                    >
                                                      <Plus className="size-3" />
                                                    </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>{t('athletes.trainingCalendar.addExercise')}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            </div>
                                          </div>
                                        </DraggableWorkoutWrapper>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>

                              {/* Source day overlay - shown below header */}
                              {isCopySource && !isHoveredForCopy && !isPastedDay && (
                                <div className="absolute inset-0 bg-muted z-30 flex flex-col items-center justify-center gap-2 p-2 rounded-b-lg">
                                  <span className="text-xs text-center text-muted-foreground">
                                    {t('athletes.trainingCalendar.holdShiftToPaste')}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-xs gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelCopy();
                                    }}
                                  >
                                    <X className="size-3" />
                                    {t('general.cancel')}
                                  </Button>
                                </div>
                              )}
                              {/* Destination day overlay - shown below header */}
                              {isHoveredForCopy && (
                                <div className="absolute inset-0 bg-muted z-30 flex flex-col items-center justify-center gap-2 p-2 rounded-b-lg">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePasteWorkout(dateKey);
                                    }}
                                  >
                                    <Copy className="size-3" />
                                    {isShiftPressed ? t('general.paste') : t('general.copy')}
                                  </Button>
                                </div>
                              )}
                              {/* Multi-select copy destination overlay */}
                              {isMultiSelectCopyMode && multiSelectHoveredDay === dateKey && !isDateInPast(date) && (
                                <div className="absolute inset-0 bg-muted z-30 flex flex-col items-center justify-center gap-2 p-2 rounded-b-lg">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMultiSelectPaste(dateKey);
                                    }}
                                  >
                                    <Copy className="size-3" />
                                    {t('general.copy')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </DroppableDayWrapper>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <DragOverlay>
              {draggedWorkout && (
                <div className="rounded-lg border border-border bg-background flex flex-col items-stretch justify-start p-0 overflow-hidden shadow-lg rotate-3">
                  <div className="px-2 py-1 border-b border-border flex items-center justify-between gap-2 bg-muted/30">
                    <span className="text-[11px] font-medium block truncate">
                      {draggedWorkout.workout.name}
                    </span>
                  </div>
                  <div className="px-2 py-1">
                    <span className="text-[10px] text-muted-foreground block">
                      {draggedWorkout.workout.totalExercises}{' '}
                      {draggedWorkout.workout.totalExercises === 1 ? t('athletes.trainingCalendar.exercise') : t('athletes.trainingCalendar.exercises')}
                    </span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>


        <SidePanel
          open={!!selectedWorkoutDetails}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseWorkoutDetails();
            }
          }}
          title={selectedWorkoutDetails?.workout.name || ''}
          contentClassName="w-full sm:w-[800px] sm:max-w-[800px]"
        >
          {selectedWorkoutDetails && (() => {
            const workoutSchema = buildWorkoutSchema(selectedWorkoutDetails.workout);
            return (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-2">
                  {workoutSchema.length > 0 ? (
                    <div className="flex flex-col gap-2 w-full">
                      {workoutSchema.map((section) => (
                        <div key={section.id} className="relative flex w-full items-stretch flex-shrink-0">
                          <Card className="bg-background w-full flex flex-col relative">
                            <CardHeader className="border-b p-0 pb-1">
                              <div className="flex items-center justify-between px-2 pt-1">
                                <CardTitle className="uppercase tracking-wide text-sm font-medium flex items-center gap-2">
                                  {section.type === 'regular' ? t('athletes.trainingCalendar.section.regular') : section.type === 'amrap' ? t('athletes.trainingCalendar.section.amrap') : t('athletes.trainingCalendar.section.timed')}{' '}
                                  <span className="font-normal text-xs">
                                    ({section.exercises ? section.exercises.length : 0})
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="size-4 text-foreground translate-y-[1px]" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {section.type === 'regular'
                                        ? t('athletes.trainingCalendar.section.regularDescription')
                                        : section.type === 'amrap'
                                          ? t('athletes.trainingCalendar.section.amrapDescription')
                                          : t('athletes.trainingCalendar.section.timedDescription')}
                                    </TooltipContent>
                                  </Tooltip>
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                  {(section.type === 'amrap' || section.type === 'timed') && (
                                    <>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="font-medium">
                                          {section.type === 'amrap' ? t('athletes.trainingCalendar.section.timeSeconds') : t('athletes.trainingCalendar.section.rounds')}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {section.type === 'amrap'
                                            ? section.roundDurationSec || '—'
                                            : section.targetRounds || '—'}
                                        </span>
                                      </div>
                                      {selectedWorkoutDetails && (
                                        <div className="flex items-center">
                                          {renderWorkoutStatusIcon(
                                            getSectionStatus(
                                              selectedWorkoutDetails.workout.id,
                                              section.id
                                            )
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col px-2 py-1">
                              <div className="flex-1 w-full flex flex-col gap-0">
                                {section.exercises && section.exercises.length > 0 ? (
                                  <div className="w-full flex flex-col gap-0">
                                    {section.exercises.map((exercise, exerciseIndex) => {
                                      const nextExercise = section.exercises?.[exerciseIndex + 1];
                                      const prevExercise =
                                        exerciseIndex > 0 ? section.exercises?.[exerciseIndex - 1] : null;
                                      const isLinkedToNext = !!(
                                        exercise.supersetGroupId &&
                                        nextExercise?.supersetGroupId === exercise.supersetGroupId
                                      );
                                      const isLinkedToPrev = !!(
                                        exercise.supersetGroupId &&
                                        prevExercise?.supersetGroupId === exercise.supersetGroupId
                                      );
                                      return (
                                        <div
                                          key={exercise.instanceId}
                                          className={cn(
                                            'flex flex-col',
                                            isLinkedToNext ? 'gap-0' : 'gap-2',
                                            exerciseIndex === 0
                                              ? ''
                                              : isLinkedToPrev
                                                ? '-mt-px'
                                                : isLinkedToNext
                                                  ? 'mt-0'
                                                  : 'mt-1'
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              'relative flex flex-col gap-2 p-2 bg-background dark:bg-transparent border',
                                              isLinkedToPrev && isLinkedToNext
                                                ? 'rounded-none border-y-0'
                                                : isLinkedToPrev
                                                  ? 'rounded-b-lg rounded-t-none border-t-0'
                                                  : isLinkedToNext
                                                    ? 'rounded-t-lg rounded-b-none border-b-0'
                                                    : 'rounded-lg'
                                            )}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium flex-1 truncate">
                                                {exercise.name}
                                              </span>
                                            </div>
                                            {(exercise.exerciseType === 'weight_reps' ||
                                              exercise.exerciseType === 'reps' ||
                                              exercise.exerciseType === 'distance_duration') &&
                                              exercise.sets &&
                                              exercise.sets.length > 0 && (
                                                <div className="w-full border rounded-lg overflow-hidden">
                                                  <Table className="text-[11px] leading-tight">
                                                    <TableHeader className="bg-sidebar">
                                                      <TableRow className="h-8">
                                                        <TableHead className="text-center h-8 py-1 px-2">
                                                          {t('athletes.trainingCalendar.table.set')}
                                                        </TableHead>
                                                        <TableHead className="text-center h-8 py-1 px-2 w-[130px]">
                                                          {t('athletes.trainingCalendar.table.type')}
                                                        </TableHead>
                                                        {exercise.exerciseType === 'distance_duration' ? (
                                                          <>
                                                            <TableHead className="text-center h-8 py-1 px-2">
                                                              {t('athletes.trainingCalendar.table.distance')}
                                                            </TableHead>
                                                            <TableHead className="text-center h-8 py-1 px-2">
                                                              {t('athletes.trainingCalendar.table.duration')}
                                                            </TableHead>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <TableHead className="text-center h-8 py-1 px-2">
                                                              {t('athletes.trainingCalendar.table.reps')}
                                                            </TableHead>
                                                            {exercise.exerciseType === 'weight_reps' && (
                                                              <TableHead className="text-center h-8 py-1 px-2">
                                                                {t('athletes.trainingCalendar.table.weight')}
                                                              </TableHead>
                                                            )}
                                                          </>
                                                        )}
                                                        <TableHead className="text-center h-8 py-1 px-2">
                                                          {t('athletes.trainingCalendar.table.restSeconds')}
                                                        </TableHead>
                                                        {/* Only show status column for regular sections, not AMRAP/timed */}
                                                        {section.type !== 'amrap' && section.type !== 'timed' && (
                                                          <TableHead className="text-center h-8 py-1 px-2">
                                                            {t('athletes.trainingCalendar.table.status')}
                                                          </TableHead>
                                                        )}
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {exercise.sets.map((set, index) => {
                                                        const isAmrapOrTimed = section.type === 'amrap' || section.type === 'timed';

                                                        return (
                                                          <TableRow key={index} className="h-10">
                                                            <TableCell className="font-medium text-center py-1 px-2">
                                                              {index + 1}
                                                            </TableCell>
                                                            <TableCell className="py-1 px-2 w-[130px]">
                                                              <div className="flex justify-center">
                                                                <span className="text-[11px] capitalize">
                                                                  {set.type === 'warmUp'
                                                                    ? t('athletes.trainingCalendar.table.warmUp')
                                                                    : set.type === 'dropset'
                                                                      ? t('athletes.trainingCalendar.table.dropset')
                                                                      : set.type}
                                                                </span>
                                                              </div>
                                                            </TableCell>
                                                            {exercise.exerciseType === 'distance_duration' ? (
                                                              <>
                                                                <TableCell className="py-1 px-2 text-center">
                                                                  {set.distance || '—'}
                                                                </TableCell>
                                                                <TableCell className="py-1 px-2 text-center">
                                                                  {set.duration || '—'}
                                                                </TableCell>
                                                              </>
                                                            ) : (
                                                              <>
                                                                <TableCell className="py-1 px-2 text-center">
                                                                  {set.reps || '—'}
                                                                </TableCell>
                                                                {exercise.exerciseType === 'weight_reps' && (
                                                                  <TableCell className="py-1 px-2 text-center">
                                                                    {set.weight || '—'}
                                                                  </TableCell>
                                                                )}
                                                              </>
                                                            )}
                                                            <TableCell className="py-1 px-2 text-center">
                                                              {set.rest || '—'}
                                                            </TableCell>
                                                            {/* Only show status cell for regular sections, not AMRAP/timed */}
                                                            {!isAmrapOrTimed && (
                                                              <TableCell className="py-1 px-2 text-center">
                                                                <div className="flex justify-center">
                                                                  {renderSetStatusIcon(
                                                                    getSetStatus(
                                                                      selectedWorkoutDetails.workout.id,
                                                                      exercise.instanceId,
                                                                      set.setNumber
                                                                    )
                                                                  )}
                                                                </div>
                                                              </TableCell>
                                                            )}
                                                          </TableRow>
                                                        );
                                                      })}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center w-full my-4 py-3 border-2 border-dashed rounded-lg border-muted">
                                    <p className="text-muted-foreground text-sm text-center">
                                      {t('athletes.trainingCalendar.noExercises')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <p className="text-muted-foreground text-center">{t('athletes.trainingCalendar.noSections')}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </SidePanel>

      </Card>
      <SaveAsWorkout
        isOpen={isSaveAsWorkoutOpen}
        onClose={() => setIsSaveAsWorkoutOpen(false)}
        clientId={clientId}
        workoutsByDate={workoutsByDate}
      />
      <SaveAsProgram
        isOpen={isSaveAsProgramOpen}
        onClose={() => setIsSaveAsProgramOpen(false)}
        clientId={clientId}
        workoutsByDate={workoutsByDate}
      />
      <AddWorkoutSidePanel
        open={isAddWorkoutPanelOpen}
        onOpenChange={setIsAddWorkoutPanelOpen}
        onSave={handleSaveWorkout}
        onCreateNewWorkout={() => {
          setIsAddWorkoutPanelOpen(false);
          // Open Workout Builder instead of CreateWorkoutSidePanel
          setIsWorkoutBuilderOpen(true);
          // Ensure editingWorkout is null so we know it's a new one
          setEditingWorkout(null);
          // selectedDateForWorkout is already set by the dropdown that opened this panel
        }}
        selectedDate={selectedDateForWorkout ?? undefined}
        mode="program"
        availableWorkouts={availableWorkouts}
      />
      <TrainingDataProvider>
        <CreateWorkoutSidePanel
          open={isCreateWorkoutPanelOpen}
          onOpenChange={setIsCreateWorkoutPanelOpen}
          onSuccess={() => {
            setIsCreateWorkoutPanelOpen(false);
            // Refresh workouts to include the newly created one
            queryClient.invalidateQueries({ queryKey: ['coach-workouts'] });
          }}
        />
      </TrainingDataProvider>
      <AddProgramSidePanel
        open={isAddProgramPanelOpen}
        onOpenChange={setIsAddProgramPanelOpen}
        onSave={handleSaveProgram}
        selectedDate={selectedDateForWorkout ?? undefined}
      />
      <AddExerciseSidePanel
        open={isAddExercisePanelOpen}
        onOpenChange={setIsAddExercisePanelOpen}
        onSave={handleSaveExercise}
      />
      <WorkoutBuilder
        open={isWorkoutBuilderOpen}
        onOpenChange={(open) => {
          setIsWorkoutBuilderOpen(open);
          if (!open) {
            setEditingWorkout(null);
            setFetchedWorkoutData(null);
            setIsLoadingWorkoutData(false);
          }
        }}
        meta={editingWorkout ? {
          name: editingWorkout.workout.name,
          type: editingWorkout.workout.type,
          difficulty: editingWorkout.workout.difficulty || 'Intermediate',
          description: editingWorkout.workout.description || '',
        } : {
          name: '',
          type: '',
          difficulty: 'Intermediate',
          description: '',
        }}
        initialData={editingWorkout ? fetchedWorkoutData : undefined}
        isLoadingInitialData={isLoadingWorkoutData}
        saveSignal={0}
        onSaveSuccess={handleSaveEditedWorkout}
        onSaveError={() => { }}
        onDirtyChange={() => { }}
      />
      <ClientInProgressTrainingDaySummary
        open={!!inProgressSummaryWorkout}
        onOpenChange={(open) => {
          if (!open) setInProgressSummaryWorkout(null);
        }}
        workout={inProgressSummaryWorkout?.workout || null}
        dateKey={inProgressSummaryWorkout?.dateKey || ''}
      />
      <ClientCompletedTrainingDaySummary
        open={!!completedSummaryWorkout}
        onOpenChange={(open) => {
          if (!open) {
            setCompletedSummaryWorkout(null);
            setIsLoadingCompletedSummary(false);
            setFetchedCompletedWorkoutData(null);
          }
        }}
        workoutName={completedSummaryWorkout?.workout.name || ''}
        isLoading={isLoadingCompletedSummary}
        athlete={athlete}
        completedSummary={fetchedCompletedWorkoutData?.workout_data?.completedSummary || fetchedCompletedWorkoutData?.completedSummary || completedSummaryWorkout?.workout.completedSummary}
        workoutData={fetchedCompletedWorkoutData}
        stats={{
          exercisesCompleted: fetchedCompletedWorkoutData?.total_exercises || fetchedCompletedWorkoutData?.totalExercises || completedSummaryWorkout?.workout.totalExercises || 0,
          exercisesTotal: fetchedCompletedWorkoutData?.total_exercises || fetchedCompletedWorkoutData?.totalExercises || completedSummaryWorkout?.workout.totalExercises || 0,
          duration: fetchedCompletedWorkoutData?.workout_data?.completedSummary?.totalDurationMin || fetchedCompletedWorkoutData?.completedSummary?.totalDurationMin || completedSummaryWorkout?.workout.completedSummary?.totalDurationMin || 0,
          intensity: fetchedCompletedWorkoutData?.workout_data?.post?.intensity || fetchedCompletedWorkoutData?.post?.intensity || completedSummaryWorkout?.workout.post?.intensity || 0,
          volume: fetchedCompletedWorkoutData?.workout_data?.completedSummary?.totalWeightLifted || fetchedCompletedWorkoutData?.completedSummary?.totalWeightLifted || completedSummaryWorkout?.workout.completedSummary?.totalWeightLifted || 0,
          readiness: fetchedCompletedWorkoutData?.workout_data?.pre?.readiness || fetchedCompletedWorkoutData?.pre?.readiness || completedSummaryWorkout?.workout.pre?.readiness || 0,
          rating: fetchedCompletedWorkoutData?.workout_data?.post?.rating || fetchedCompletedWorkoutData?.post?.rating || completedSummaryWorkout?.workout.post?.rating || 0
        }}
      />
      <MultiSelectActionBar
        selectedCount={selectedWorkouts.length}
        isVisible={isMultiSelectMode || isMultiSelectCopyMode}
        isCopyMode={isMultiSelectCopyMode}
        onDelete={handleDeleteSelectedWorkouts}
        onCopy={handleStartMultiSelectCopy}
        onCancel={handleCancelMultiSelect}
      />
    </div>
  );
};

export default ClientTrainingCalendarPage;
