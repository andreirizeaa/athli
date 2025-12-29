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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  FileText,
  Plus,
  Search,
  Trash2,
  CircleX,
  CircleEllipsis,
  CircleCheck,
  Info,
  Activity,
} from 'lucide-react';
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
import { AddWorkoutSidePanel } from '@/app/training/workouts/components/add-workout-side-panel';
import { AddProgramSidePanel } from './add-program-side-panel';
import { AddExerciseSidePanel } from './add-exercise-side-panel';
import type { Exercise as CoachExercise } from '@/api/coach/coach-exercise-service';


const DAY_MS = 24 * 60 * 60 * 1000;

const ClientTrainingCalendarPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = useMemo(() => (params.clientId as string) || '', [params.clientId]);
  const [selectedWeek, setSelectedWeek] = useState<string>('2');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks] = useState<number>(52); // Default to 52 weeks (1 year)
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  const [isAddWorkoutPanelOpen, setIsAddWorkoutPanelOpen] = useState<boolean>(false);
  const [isSaveAsWorkoutOpen, setIsSaveAsWorkoutOpen] = useState<boolean>(false);
  const [isSaveAsProgramOpen, setIsSaveAsProgramOpen] = useState<boolean>(false);
  const [selectedDateForWorkout, setSelectedDateForWorkout] = useState<Date | null>(null);
  const [workoutsByDate, setWorkoutsByDate] = useState<{
    [dateKey: string]: Array<Workout & { id: string }>;
  }>({});
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
            name: `${workout.program} - Main lift`,
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

  const handlePreviousWeek = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const newWeek = currentWeek - weeksView;
    // Allow going to past weeks without limit
    setCurrentWeek(newWeek);
  };

  const handleNextWeek = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const maxStartWeek = totalWeeks - weeksView + 1;
    const newWeek = currentWeek + weeksView;
    if (newWeek <= maxStartWeek) {
      setCurrentWeek(newWeek);
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
      setCurrentWeek(weekNumber);
    } else {
      setCurrentWeek(maxWeek);
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

  // Track the currently loaded date range to avoid redundant fetches
  const [loadedDateRange, setLoadedDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [isLoadingTraining, setIsLoadingTraining] = useState<boolean>(false);

  // Calculate the required date range based on current view
  const requiredDateRange = useMemo(() => {
    const weeksView = parseInt(selectedWeek, 10);

    // Calculate the start of the visible range
    const weekOffset = currentWeek - 1;
    const visibleStart = new Date(startDate);
    visibleStart.setDate(startDate.getDate() + weekOffset * 7);

    // Calculate the end of the visible range
    const visibleEnd = new Date(visibleStart);
    visibleEnd.setDate(visibleStart.getDate() + weeksView * 7 - 1);

    // Add buffer: ±1 week for smooth navigation
    const bufferStart = new Date(visibleStart);
    bufferStart.setDate(visibleStart.getDate() - 7);

    const bufferEnd = new Date(visibleEnd);
    bufferEnd.setDate(visibleEnd.getDate() + 7);

    return { start: bufferStart, end: bufferEnd };
  }, [selectedWeek, currentWeek, startDate]);

  // Load training calendar and completion logs when date range changes
  useEffect(() => {
    const loadTrainingData = async () => {
      if (!clientId) return;

      // Check if we need to fetch new data
      const needsFetch =
        !loadedDateRange.start ||
        !loadedDateRange.end ||
        requiredDateRange.start < loadedDateRange.start ||
        requiredDateRange.end > loadedDateRange.end;

      if (!needsFetch) {
        // Data already loaded for this range
        return;
      }

      setIsLoadingTraining(true);

      try {
        // Format dates as YYYY-MM-DD for API
        const formatDateForAPI = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const startDateStr = formatDateForAPI(requiredDateRange.start);
        const endDateStr = formatDateForAPI(requiredDateRange.end);

        // Load training calendar with date range
        const calendar = await getTrainingCalendarRange(clientId, startDateStr, endDateStr);

        // Convert calendar format from dd-mm-yyyy to YYYY-MM-DD
        const convertedCalendar: {
          [dateKey: string]: Array<Workout & { id: string }>;
        } = {};

        Object.keys(calendar).forEach((dateKey) => {
          // dateKey is in dd-mm-yyyy format
          const [day, month, year] = dateKey.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const isoKey = getDateKey(date);
          convertedCalendar[isoKey] = calendar[dateKey].map((workout) => ({
            ...workout,
            id: workout.id,
          }));
        });

        // Merge with existing data (don't replace, extend)
        setWorkoutsByDate((prev) => ({
          ...prev,
          ...convertedCalendar,
        }));

        // Update loaded range
        setLoadedDateRange({
          start: requiredDateRange.start,
          end: requiredDateRange.end,
        });

        // Load completion logs (only once on mount, not on every range change)
        if (!loadedDateRange.start) {
          const completionLogs = await getTrainingCalendarCompletionLogs(clientId);

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

          // Load section completion status (for AMRAP and timed sections)
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
      } catch (error) {
        console.error('Failed to load training data:', error);
      } finally {
        setIsLoadingTraining(false);
      }
    };

    loadTrainingData();
  }, [clientId, requiredDateRange, loadedDateRange]);

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

    // Call the service to update the training calendar
    if (clientId) {
      updateTrainingCalendar(clientId, schema).catch((error) => {
        console.error('Failed to update training calendar:', error);
      });
    }
  }, [workoutsByDate, clientId]);

  // Format workout created date from dd-mm-yy format (used in mockWorkouts)
  const formatWorkoutCreatedDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-');
    const date = new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${date.getDate()} ${months[date.getMonth()]}, 20${year}`;
  };

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
    workoutSchema?: WorkoutSection[]
  ): 'not_started' | 'in_progress' | 'completed' => {
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

    const workoutToAdd = {
      ...selectedWorkout,
      id: `${selectedWorkout.id}-${Date.now()}`,
    };

    setWorkoutsByDate((prev) => {
      const updated: {
        [dateKey: string]: Array<Workout & { id: string }>;
      } = { ...prev };

      const addToDate = (date: Date) => {
        const key = getDateKey(date);
        updated[key] = [...(updated[key] ?? []), workoutToAdd];
      };

      // Calculate upper bound based on configured total weeks
      const calendarEndDate = new Date(startDate);
      calendarEndDate.setDate(startDate.getDate() + totalWeeks * 7 - 1);

      if (scheduleOption === 'every' && config) {
        const daysInterval = parseInt(config, 10);
        if (Number.isFinite(daysInterval) && daysInterval > 0) {
          const current = new Date(selectedDateForWorkout);
          current.setHours(0, 0, 0, 0);

          while (current <= calendarEndDate) {
            addToDate(current);
            current.setDate(current.getDate() + daysInterval);
          }
        } else {
          addToDate(selectedDateForWorkout);
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
              addToDate(target);
            }
          }
        } else {
          addToDate(selectedDateForWorkout);
        }
      } else {
        // Default: add only for the selected day
        addToDate(selectedDateForWorkout);
      }

      return updated;
    });

    setIsAddWorkoutPanelOpen(false);
  };

  const handleSaveProgram = async (selectedProgram: Program, startDateInput: Date) => {
    if (!selectedProgram || !startDateInput) {
      setIsAddProgramPanelOpen(false);
      return;
    }

    const start = new Date(startDateInput);
    start.setHours(0, 0, 0, 0);

    const weeksText = selectedProgram.length.split(' ')[0];
    const weeksNumber = parseInt(weeksText, 10);
    const totalProgramWeeks = Number.isFinite(weeksNumber) && weeksNumber > 0 ? weeksNumber : 1;

    const baseWorkout: Workout = {
      id: selectedProgram.id,
      program: selectedProgram.program,
      description: selectedProgram.description,
      type: selectedProgram.type,
      difficulty: 'Intermediate',
      length: selectedProgram.length,
      totalExercises: selectedProgram.totalExercises,
      equipment: selectedProgram.equipment,
      created: selectedProgram.created,
    };

    setWorkoutsByDate((previousWorkouts) => {
      const updated: {
        [dateKey: string]: Array<Workout & { id: string }>;
      } = { ...previousWorkouts };

      const addToDate = (date: Date) => {
        const key = getDateKey(date);
        const workoutToAdd: Workout & { id: string } = {
          ...baseWorkout,
          id: `${baseWorkout.id}-${key}-${Date.now()}`,
        };
        updated[key] = [...(updated[key] ?? []), workoutToAdd];
      };

      for (let weekIndex = 0; weekIndex < totalProgramWeeks; weekIndex += 1) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + weekIndex * 7);
        weekStart.setHours(0, 0, 0, 0);

        const offsets = [0, 2, 4]; // three sessions per week
        offsets.forEach((offset) => {
          const sessionDate = new Date(weekStart);
          sessionDate.setDate(weekStart.getDate() + offset);
          sessionDate.setHours(0, 0, 0, 0);

          if (sessionDate >= start) {
            addToDate(sessionDate);
          }
        });
      }

      return updated;
    });

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
      program: selectedExercise.name,
      description: selectedExercise.description || '',
      type: selectedExercise.category || '',
      difficulty: 'Intermediate',
      length: '1 sess',
      totalExercises: 1,
      equipment: selectedExercise.equipment || [],
      created: formatDate(new Date()),
      workout_data: {
        sections: [
          {
            id: `section-${Date.now()}`,
            title: selectedExercise.name,
            type: 'timed',
            exercises: [
              {
                id: `ex-${Date.now()}`,
                exercise_id: selectedExercise.id,
                program: selectedExercise.name,
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
        ]
      }
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

  const handleOpenWorkoutDetails = (dateKey: string, workout: Workout & { id: string }) => {
    // Parse the dateKey to check if it's in the future
    const [year, month, day] = dateKey.split('-').map(Number);
    const workoutDate = new Date(year, month - 1, day);
    workoutDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If workout is in the future, navigate to edit page instead of opening side panel
    if (workoutDate > today) {
      // Build workout schema
      const workoutSchema = buildWorkoutSchema(workout);

      // Store workout schema and view state in localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('athli_workout_schema', JSON.stringify({ sections: workoutSchema }));
        window.localStorage.setItem('athli_training_calendar_view_state', JSON.stringify({
          currentWeek,
          selectedWeek,
        }));
        window.localStorage.setItem('athli_workout_builder_access', 'edit-standard');
        window.localStorage.setItem('athli_new_workout_meta', JSON.stringify({
          title: workout.program || 'Workout',
          description: workout.description || '',
          type: workout.type || 'Push',
          difficulty: 'Intermediate',
          builder: 'standard',
        }));
        // Store workout date for breadcrumb
        window.localStorage.setItem('athli_workout_date', dateKey);
      }

      // Navigate to edit page
      router.push(`/athletes/${clientId}/training-calendar/${workout.id}/edit`);
      return;
    }

    // For past or today workouts, open side panel as before
    setSelectedWorkoutDetails({ dateKey, workout });
  };

  const handleCloseWorkoutDetails = () => {
    setSelectedWorkoutDetails(null);
  };

  const handleDeleteWorkout = (dateKey: string, workoutId: string) => {
    setWorkoutsByDate((previousWorkouts) => {
      const workoutsForDate = previousWorkouts[dateKey];

      if (!workoutsForDate) {
        return previousWorkouts;
      }

      const updatedWorkoutsForDate = workoutsForDate.filter((workout) => workout.id !== workoutId);

      let updatedState: {
        [dateKey: string]: Array<Workout & { id: string }>;
      };

      if (updatedWorkoutsForDate.length === 0) {
        const { [dateKey]: _, ...rest } = previousWorkouts;
        updatedState = rest;
      } else {
        updatedState = {
          ...previousWorkouts,
          [dateKey]: updatedWorkoutsForDate,
        };
      }

      return updatedState;
    });
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
    setCurrentWeek(finalWeekNumber);
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
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-md px-2 py-1 transition-colors">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{getWeekRange()}</span>
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
                  (() => {
                    const weeksView = parseInt(selectedWeek, 10);
                    const maxStartWeek = totalWeeks - weeksView + 1;
                    return currentWeek >= maxStartWeek;
                  })()
                }
                className="h-8 w-8"
                aria-label={t('athletes.trainingCalendar.nextWeek')}
              >
                <ChevronRight className="size-4" />
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
            </div>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
        <div className="w-full flex-1 bg-background rounded-none px-4 pb-0 pt-0 min-h-0 flex flex-col">
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
          <div className="flex-1 flex flex-col min-h-0" style={{ gap: '1rem' }}>
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

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          'flex-1 bg-muted rounded-lg border flex flex-col min-h-0 h-full',
                          isToday(date) ? 'border-primary' : 'border-border',
                        )}
                      >
                        <div className="px-3 py-[2px] border-b border-border flex-shrink-0 flex items-center justify-between">
                          <span className="text-xs uppercase text-muted-foreground">{date.getDate()}</span>
                          {!isDateInPast(date) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 -mr-1 hover:bg-background"
                                  aria-label={t('athletes.trainingCalendar.addWorkoutOrProgram')}
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenAddWorkoutPanel(date)} className="gap-2">
                                  <Dumbbell className="size-3.5 text-muted-foreground" />
                                  <span>{t('athletes.trainingCalendar.addWorkout')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenAddProgramPanel(date)} className="gap-2">
                                  <FileText className="size-3.5 text-muted-foreground" />
                                  <span>{t('athletes.trainingCalendar.addProgram')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenAddExercisePanel(date)} className="gap-2">
                                  <Activity className="size-3.5 text-muted-foreground" />
                                  <span>{t('athletes.trainingCalendar.addExercise')}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0">
                          {workoutsForDate.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {workoutsForDate.map((workout) => {
                                const status = getWorkoutStatus(workout.id);
                                return (
                                  <div
                                    key={workout.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={t('athletes.trainingCalendar.viewDetailsAria', { name: workout.program })}
                                    onClick={() => handleOpenWorkoutDetails(dateKey, workout)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleOpenWorkoutDetails(dateKey, workout);
                                      }
                                    }}
                                    className="p-2 rounded-lg border border-border bg-background flex items-start justify-between gap-2 cursor-pointer"
                                  >
                                    <div className="flex-1 min-w-0 flex items-start gap-2">
                                      <div className="flex-shrink-0 mt-0.5">
                                        {renderWorkoutStatusIcon(status)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span
                                          className="text-[10px] font-medium block break-words line-clamp-2"
                                          title={workout.program}
                                        >
                                          {workout.program}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {workout.totalExercises}{' '}
                                          {workout.totalExercises === 1 ? t('athletes.trainingCalendar.exercise') : t('athletes.trainingCalendar.exercises')}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 flex-shrink-0"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDeleteWorkout(dateKey, workout.id);
                                      }}
                                      aria-label={t('athletes.trainingCalendar.deleteWorkoutAria')}
                                    >
                                      <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            !isDateInPast(date) && (
                              <div className="flex items-center justify-center h-full">
                                <div className={cn("flex gap-2", selectedWeek === '4' ? "flex-row" : "flex-col")}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size={selectedWeek === '4' ? "icon" : "sm"}
                                        className={cn(
                                          "gap-1.5 text-xs h-7 px-2 text-muted-foreground",
                                          selectedWeek !== '4' && "justify-start"
                                        )}
                                        aria-label={t('athletes.trainingCalendar.addWorkout')}
                                        onClick={() => handleOpenAddWorkoutPanel(date)}
                                      >
                                        <Dumbbell className="size-3" />
                                        {selectedWeek !== '4' && <span>{t('athletes.trainingCalendar.addWorkout')}</span>}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t('athletes.trainingCalendar.addWorkout')}
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size={selectedWeek === '4' ? "icon" : "sm"}
                                        className={cn(
                                          "gap-1.5 text-xs h-7 px-2 text-muted-foreground",
                                          selectedWeek !== '4' && "justify-start"
                                        )}
                                        aria-label={t('athletes.trainingCalendar.addProgram')}
                                        onClick={() => handleOpenAddProgramPanel(date)}
                                      >
                                        <FileText className="size-3" />
                                        {selectedWeek !== '4' && <span>{t('athletes.trainingCalendar.addProgram')}</span>}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t('athletes.trainingCalendar.addProgram')}
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size={selectedWeek === '4' ? "icon" : "sm"}
                                        className={cn(
                                          "gap-1.5 text-xs h-7 px-2 text-muted-foreground",
                                          selectedWeek !== '4' && "justify-start"
                                        )}
                                        aria-label={t('athletes.trainingCalendar.addExercise')}
                                        onClick={() => handleOpenAddExercisePanel(date)}
                                      >
                                        <Activity className="size-3" />
                                        {selectedWeek !== '4' && <span>{t('athletes.trainingCalendar.addExercise')}</span>}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t('athletes.trainingCalendar.addExercise')}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>


        <SidePanel
          open={!!selectedWorkoutDetails}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseWorkoutDetails();
            }
          }}
          title={selectedWorkoutDetails?.workout.program || ''}
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
        selectedDate={selectedDateForWorkout ?? undefined}
      />
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
    </div>
  );
};

export default ClientTrainingCalendarPage;
