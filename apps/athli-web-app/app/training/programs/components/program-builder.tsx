'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Calendar, Check, ChevronLeft, ChevronRight, Copy, Plus, Redo, Search, Trash2, Undo, X, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AddWorkoutSidePanel } from '@/app/training/workouts/components/add-workout-side-panel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/general/utils';
import type { Workout } from '@/components/app/app-shell';
import { getWorkouts } from '@/api/coach/coach-workout-service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiscardChangesDialog } from '@/components/app/discard-changes-dialog';
import type { WorkoutPayload, WorkoutSectionPayload } from '@/app/training/workouts/new/workout-schema';
import { createProgram, editProgram, deletePrograms, updateProgramDetails, type ProgramData } from '@/api/coach/coach-program-service';
import { toast } from 'sonner';
import { EditProgramDetailsSidePanel } from './edit-program-details-side-panel';
import { PROGRAM_TYPES, DIFFICULTY_LEVELS } from '@/lib/constants/training';

type ProgramMeta = {
  name: string;
  type: string;
  difficulty: string;
  weeks: string;
  description: string;
};

// Each day in the program can have multiple workout schemas
type ProgramSchema = Array<{
  day: number;
  workouts: WorkoutPayload[] // Full workout schemas instead of just IDs
}>;

type ProgramBuilderProps = {
  mode: 'new' | 'edit';
  programId?: string;
  initialProgramMeta?: ProgramMeta | null;
  initialData?: {
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  } | null;
};

export const ProgramBuilder = ({
  mode,
  programId,
  initialProgramMeta,
  initialData,
}: ProgramBuilderProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [programMeta, setProgramMeta] = useState<ProgramMeta | null>(initialProgramMeta || null);
  const [selectedWeek, setSelectedWeek] = useState<string>('1');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks, setTotalWeeks] = useState<number>(1);
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [workoutsByDay, setWorkoutsByDay] = useState<{
    [week: number]: { [day: number]: Array<Workout & { id: string }> };
  }>({});
  const [history, setHistory] = useState<Array<{
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  }>>([{ workoutsByDay: {}, totalWeeks: 1 }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isUndoRedo, setIsUndoRedo] = useState<boolean>(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [initialState, setInitialState] = useState<{
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  }>({ workoutsByDay: {}, totalWeeks: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedWorkoutDetails, setSelectedWorkoutDetails] = useState<{
    week: number;
    day: number;
    workout: Workout & { id: string };
  } | null>(null);

  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);


  type PreviewExercise = {
    id: string;
    name: string;
    sets: string;
  };

  type PreviewSection = {
    id: string;
    type: 'regular' | 'amrap' | 'timed';
    exercises: PreviewExercise[];
  };

  const buildMockPreviewSections = (workout: Workout): PreviewSection[] => {
    return [
      {
        id: 'sec-1',
        type: 'regular',
        exercises: [
          {
            id: 'ex-1',
            name: `${workout.program} - Main lift`,
            sets: '3 x 8–10',
          },
          {
            id: 'ex-2',
            name: 'Accessory 1',
            sets: '3 x 10–12',
          },
          {
            id: 'ex-3',
            name: 'Accessory 2',
            sets: '3 x 12–15',
          },
        ],
      },
      {
        id: 'sec-2',
        type: 'timed',
        exercises: [
          {
            id: 'ex-4',
            name: 'Finisher circuit',
            sets: '10 min',
          },
        ],
      },
    ];
  };

  const initializeEmptyWorkouts = (weeks: number) => {
    const workouts: { [week: number]: { [day: number]: Array<Workout & { id: string }> } } = {};
    for (let i = 1; i <= weeks; i++) {
      workouts[i] = {};
      for (let j = 1; j <= 7; j++) {
        workouts[i][j] = [];
      }
    }
    return workouts;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (mode === 'new') {
      // Use a small delay to ensure localStorage is available after navigation
      const timeoutId = setTimeout(() => {
        // Check for access flag - if not present, redirect to programs
        const accessFlag = window.localStorage.getItem('athli_program_builder_access');
        if (accessFlag !== 'true') {
          router.push('/training/programs');
          return;
        }

        // Try to load meta from localStorage (if coming from create panel)
        const raw = window.localStorage.getItem('athli_new_program_meta');
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ProgramMeta;
            setProgramMeta(parsed);

            // Initialize total weeks from meta if available
            if (parsed.weeks && parsed.weeks.trim() !== '') {
              const weeksNum = parseInt(parsed.weeks, 10);
              if (!Number.isNaN(weeksNum) && weeksNum > 0) {
                setTotalWeeks(weeksNum);

                // Initialize empty workouts structure for the specified weeks
                const initialWorkouts = initializeEmptyWorkouts(weeksNum);
                setWorkoutsByDay(initialWorkouts); // Ensure current state is also set

                // Initialize history with the correct totalWeeks and empty schema
                setHistory([{ workoutsByDay: initialWorkouts, totalWeeks: weeksNum }]);
                // Update initial state
                setInitialState({ workoutsByDay: initialWorkouts, totalWeeks: weeksNum });
              }
            }
            // Clear the access flag after loading
            window.localStorage.removeItem('athli_program_builder_access');
            return;
          } catch {
            // If parsing fails, fall through to default values
          }
        }

        // If no meta in localStorage, use default values
        setProgramMeta({
          name: t('programs.builder.newProgram'),
          type: PROGRAM_TYPES[0].value,
          difficulty: DIFFICULTY_LEVELS[0].value,
          weeks: '',
          description: '',
        });
      }, 50);

      return () => clearTimeout(timeoutId);
    } else if (mode === 'edit' && initialData) {
      // Load program data for edit mode
      setWorkoutsByDay(initialData.workoutsByDay);
      setTotalWeeks(initialData.totalWeeks);
      setHistory([{ workoutsByDay: initialData.workoutsByDay, totalWeeks: initialData.totalWeeks }]);
      setInitialState({ workoutsByDay: initialData.workoutsByDay, totalWeeks: initialData.totalWeeks });
    }
  }, [mode, router, initialData]);

  // Convert day number to week and day within week
  const getWeekAndDay = (dayNumber: number) => {
    const week = Math.ceil(dayNumber / 7);
    const day = ((dayNumber - 1) % 7) + 1;
    return { week, day };
  };

  // Convert week and day to day number
  const getDayNumber = (week: number, day: number) => {
    return (week - 1) * 7 + day;
  };

  const navigateBackToPrograms = () => {
    router.push('/training/programs');
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    // Check if workouts have changed
    const currentWorkoutsStr = JSON.stringify(workoutsByDay);
    const initialWorkoutsStr = JSON.stringify(initialState.workoutsByDay);
    const workoutsChanged = currentWorkoutsStr !== initialWorkoutsStr;

    // Check if totalWeeks has changed
    const weeksChanged = totalWeeks !== initialState.totalWeeks;

    return workoutsChanged || weeksChanged;
  };

  const handleActionWithConfirmation = (action: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => action);
      setIsDiscardDialogOpen(true);
    } else {
      action();
    }
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelDiscard = () => {
    setIsDiscardDialogOpen(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    handleActionWithConfirmation(() => {
      navigateBackToPrograms();
    });
  };

  const handleSave = async () => {
    if (!programMeta) return;

    // Build the program schema: list of days with full workout schemas
    const programSchema: ProgramSchema = [];

    // Iterate through all days (1 to totalWeeks * 7)
    for (let dayNum = 1; dayNum <= totalWeeks * 7; dayNum++) {
      const { week, day } = getWeekAndDay(dayNum);
      const workouts = workoutsByDay[week]?.[day] || [];

      // Each workout should already be a WorkoutPayload
      // Store the full workout schemas as-is
      const workoutSchemas: WorkoutPayload[] = workouts.map((workout) => {
        // Temporary placeholder that matches WorkoutPayload structure
        return {
          title: workout.program,
          description: workout.description || '',
          type: workout.type,
          difficulty: 'intermediate',
          equipment: typeof workout.equipment === 'string' ? workout.equipment.split(',').map((e: string) => e.trim()).filter((e: string) => e) : [],
          sections: [] as WorkoutSectionPayload[], // In a real app, this would be the actual workout data
          totalExercises: workout.totalExercises,
        };
      });

      if (workoutSchemas.length > 0) {
        programSchema.push({
          day: dayNum,
          workouts: workoutSchemas,
        });
      }
    }

    const programData: ProgramData = {
      name: programMeta.name,
      description: programMeta.description,
      type: programMeta.type,
      difficulty: programMeta.difficulty,
      weeks: totalWeeks.toString(),
      // We store the full schema in program_data via the service
    };

    try {
      if (mode === 'edit' && programId) {
        await editProgram(programId, programData);
      } else {
        await createProgram(programData);
      }

      toast.success(t('programs.new.toast.savedSuccessfully', { name: programMeta.name }));

      // Update initial state to reflect saved state
      setInitialState({ workoutsByDay, totalWeeks });

      // Navigate back to programs page
      router.push('/training/programs');
    } catch (error) {
      console.error('Failed to save program:', error);
      toast.error(t('programs.builder.saveFailed'));
    }
  };




  const handleSaveClick = async () => {
    await handleSave();
  };

  const handleBreadcrumbClick = (path: string) => {
    handleActionWithConfirmation(() => {
      router.push(path);
    });
  };

  const handlePreviousWeek = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const newWeek = currentWeek - weeksView;
    if (newWeek >= 1) {
      setCurrentWeek(newWeek);
    } else {
      setCurrentWeek(1);
    }
  };

  const handleNextWeek = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const newWeek = currentWeek + weeksView;
    const maxStartWeek = totalWeeks - weeksView + 1;
    if (newWeek <= maxStartWeek) {
      setCurrentWeek(newWeek);
    } else {
      setCurrentWeek(Math.max(1, maxStartWeek));
    }
  };

  const handleAddWeek = () => {
    const newTotalWeeks = totalWeeks + 1;
    saveToHistory(workoutsByDay, newTotalWeeks);
    setTotalWeeks(newTotalWeeks);
  };

  const handleDuplicateWeek = (weekNumber: number) => {
    const newTotalWeeks = totalWeeks + 1;
    const updatedWorkouts = { ...workoutsByDay };
    // Copy workouts from the week to duplicate to the new week
    if (workoutsByDay[weekNumber]) {
      updatedWorkouts[newTotalWeeks] = JSON.parse(
        JSON.stringify(workoutsByDay[weekNumber])
      );
    }
    saveToHistory(updatedWorkouts, newTotalWeeks);
    setWorkoutsByDay(updatedWorkouts);
    setTotalWeeks(newTotalWeeks);
    toast.success(`Week ${weekNumber} duplicated successfully`);
  };

  const handleDeleteWeek = (weekNumber: number) => {
    if (totalWeeks > 1) {
      const newTotalWeeks = totalWeeks - 1;
      // Remove workouts from the deleted week
      const updatedWorkouts = { ...workoutsByDay };
      delete updatedWorkouts[weekNumber];
      // Adjust week numbers for weeks after the deleted one
      const reindexedWorkouts: {
        [week: number]: { [day: number]: Array<Workout & { id: string }> };
      } = {};
      Object.keys(updatedWorkouts).forEach((weekKey) => {
        const week = parseInt(weekKey, 10);
        if (week < weekNumber) {
          reindexedWorkouts[week] = updatedWorkouts[week];
        } else if (week > weekNumber) {
          reindexedWorkouts[week - 1] = updatedWorkouts[week];
        }
      });
      saveToHistory(reindexedWorkouts, newTotalWeeks);
      setWorkoutsByDay(reindexedWorkouts);
      setTotalWeeks(newTotalWeeks);
      // Adjust current week if needed
      if (currentWeek > newTotalWeeks) {
        setCurrentWeek(Math.max(1, newTotalWeeks));
      }
      toast.success(`Week ${weekNumber} deleted successfully`);
    }
  };

  const handleSaveDetails = async (details: { name: string; type: string; difficulty: string; description: string }) => {
    // Update local state
    setProgramMeta((prev) => prev ? ({ ...prev, ...details }) : null);

    // If editing an existing program, update backend immediately
    if (mode === 'edit' && programId) {
      try {
        await updateProgramDetails(programId, details);
        toast.success(t('programs.edit.toast.updatedSuccessfully', { name: details.name }));
      } catch (error) {
        console.error('Failed to update program details:', error);
        toast.error('Failed to update details');
      }
    }
  };

  const handleDeleteProgram = async () => {
    if (programId) {
      try {
        await deletePrograms(programId);
        toast.success(t('programs.delete.toast.success'));
        router.push('/training/programs');
      } catch (error) {
        console.error('Failed to delete program:', error);
        toast.error(t('programs.delete.toast.error'));
      }
    }
  };

  const saveToHistory = (
    workoutsState: {
      [week: number]: { [day: number]: Array<Workout & { id: string }> };
    },
    weeksState?: number
  ) => {
    if (isUndoRedo) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      workoutsByDay: JSON.parse(JSON.stringify(workoutsState)),
      totalWeeks: weeksState !== undefined ? weeksState : totalWeeks,
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleOpenAddWorkoutModal = (day: number) => {
    setSelectedDay(day);
    setIsAddWorkoutModalOpen(true);
  };

  const handleSaveWorkoutFromPanel = async (workout: Workout, scheduleOption: string, config: string) => {
    if (!workout || selectedDay === null) return;

    const workoutToAdd = {
      ...workout,
      id: `${workout.id}-${Date.now()}`,
    };

    setWorkoutsByDay((prev) => {
      const updated = { ...prev };

      if (scheduleOption === 'once') {
        const { week, day } = getWeekAndDay(selectedDay);
        updated[week] = {
          ...(updated[week] || {}),
          [day]: [...(updated[week]?.[day] || []), workoutToAdd],
        };
      } else if (scheduleOption === 'every' && config) {
        const daysInterval = parseInt(config, 10);
        if (daysInterval > 0) {
          const maxDay = totalWeeks * 7;
          for (let dayNum = selectedDay; dayNum <= maxDay; dayNum += daysInterval) {
            const { week, day } = getWeekAndDay(dayNum);
            updated[week] = {
              ...(updated[week] || {}),
              [day]: [...(updated[week]?.[day] || []), workoutToAdd],
            };
          }
        }
      } else if (scheduleOption === 'weekly' && config) {
        // config is day name (Monday, Tuesday etc)
        const daysMap: { [key: string]: number } = {
          'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
        };
        // Get day index (0-6) from config
        const targetDayIndex = daysMap[config];

        if (targetDayIndex !== undefined) {
          // Get the start date day index based on selected day (assuming day 1 is Monday for simplified logic)
          // Ideally use actual dates, but here we work with relative days 1..7
          // Let's assume day 1 = Monday, day 7 = Sunday
          const targetDay = targetDayIndex + 1; // 1-7

          for (let week = 1; week <= totalWeeks; week++) {
            // For each week, add to the target day
            // Only add if (week-1)*7 + targetDay >= selectedDay
            const dayNum = (week - 1) * 7 + targetDay;

            if (dayNum >= selectedDay) {
              updated[week] = {
                ...(updated[week] || {}),
                [targetDay]: [...(updated[week]?.[targetDay] || []), workoutToAdd],
              };
            }
          }
        }
      }

      saveToHistory(updated);
      return updated;
    });

    // Close modal and reset
    setIsAddWorkoutModalOpen(false);
    setSelectedDay(null);
  };

  const handleDeleteWorkout = (week: number, day: number, workoutId: string) => {
    setWorkoutsByDay((prev) => {
      const weekData = prev[week];
      if (!weekData || !weekData[day]) return prev;
      const updated = {
        ...prev,
        [week]: {
          ...weekData,
          [day]: weekData[day].filter((w) => w.id !== workoutId),
        },
      };
      saveToHistory(updated);
      return updated;
    });
  };

  const handleOpenWorkoutDetails = (
    week: number,
    day: number,
    workout: Workout & { id: string },
  ) => {
    setSelectedWorkoutDetails({ week, day, workout });
  };

  const handleCloseWorkoutDetails = () => {
    setSelectedWorkoutDetails(null);
  };

  // Format date from dd-mm-yy format to "7 Mar, 2025"
  const formatDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-');
    const date = new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const months = [
      t('programs.builder.months.jan'),
      t('programs.builder.months.feb'),
      t('programs.builder.months.mar'),
      t('programs.builder.months.apr'),
      t('programs.builder.months.may'),
      t('programs.builder.months.jun'),
      t('programs.builder.months.jul'),
      t('programs.builder.months.aug'),
      t('programs.builder.months.sep'),
      t('programs.builder.months.oct'),
      t('programs.builder.months.nov'),
      t('programs.builder.months.dec'),
    ];
    return `${date.getDate()} ${months[date.getMonth()]}, 20${year}`;
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setWorkoutsByDay(JSON.parse(JSON.stringify(state.workoutsByDay)));
      setTotalWeeks(state.totalWeeks);
      setTimeout(() => setIsUndoRedo(false), 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setWorkoutsByDay(JSON.parse(JSON.stringify(state.workoutsByDay)));
      setTotalWeeks(state.totalWeeks);
      setTimeout(() => setIsUndoRedo(false), 0);
    }
  };

  // Filter logic removed as it's handled in the side panel
  // Filter workouts based on search query
  const filteredWorkouts: Workout[] = [];

  // Calculate week range based on selected week view
  const getWeekRange = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const startWeek = currentWeek;
    const endWeek = Math.min(currentWeek + weeksView - 1, totalWeeks);
    if (weeksView === 1) {
      return t('programs.builder.weekRange', { start: startWeek, total: totalWeeks });
    }
    return t('programs.builder.weekRangeMultiple', { start: startWeek, end: endWeek, total: totalWeeks });
  };

  // Check if 2 weeks view is available
  const is2WeeksAvailable = totalWeeks % 2 === 0;
  // Check if 4 weeks view is available
  const is4WeeksAvailable = totalWeeks % 4 === 0;

  // Calculate number of rows based on selected week view
  const getRowsCount = () => {
    const weeksView = parseInt(selectedWeek, 10);
    return weeksView;
  };

  // Calculate days for each row
  const getDaysForRow = (rowIndex: number) => {
    const weeksView = parseInt(selectedWeek, 10);
    const startDay = rowIndex * 7 + 1;
    const endDay = Math.min(startDay + 6, weeksView * 7);
    return Array.from({ length: 7 }, (_, i) => startDay + i);
  };

  if (isLoading || !programMeta) {
    return null;
  }

  const pageTitle = mode === 'new'
    ? t('programs.builder.newProgram')
    : `Editing ${programMeta.name}`;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/training')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('sidebar.links.training')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/training/programs')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('programs.detail.breadcrumb.programs')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="px-0.5 capitalize">
                    {mode === 'new' ? t('general.new') : t('general.edit')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {programMeta.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">{pageTitle}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => setIsEditDetailsOpen(true)}
              className="gap-2 border border-primary"
            >
              <Pencil className="size-4" />
              <span>Edit details</span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="gap-2 border border-primary"
              aria-label={t('programs.builder.cancelAria')}
            >
              <X className="size-4" />
              <span>{t('programs.builder.cancel')}</span>
            </Button>
            <Button onClick={handleSaveClick} className="gap-2" aria-label={t('programs.builder.saveAria')}>
              <Check className="size-4" />
              <span>{t('programs.builder.save')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full relative">
        <div className="w-full px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePreviousWeek}
              disabled={currentWeek === 1}
              className="h-8 w-8"
              aria-label={t('programs.builder.previousWeekAria')}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{getWeekRange()}</span>
            </div>
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
              aria-label={t('programs.builder.nextWeekAria')}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddWeek}
              className="gap-2 h-8"
              aria-label={t('programs.builder.addWeekAria')}
            >
              <Plus className="size-4" />
              <span>{t('programs.builder.addWeek')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="h-8 w-8 p-0"
              aria-label={t('programs.builder.undoAria')}
            >
              <Undo className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="h-8 w-8 p-0"
              aria-label={t('programs.builder.redoAria')}
            >
              <Redo className="size-4" />
            </Button>
          </div>
          <Tabs value={selectedWeek} onValueChange={setSelectedWeek}>
            <TabsList className="w-auto">
              <TabsTrigger
                value="1"
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                title={t('programs.builder.showOneWeek')}
              >
                1 week
              </TabsTrigger>
              <TabsTrigger
                value="2"
                disabled={!is2WeeksAvailable}
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  is2WeeksAvailable
                    ? t('programs.builder.showTwoWeeks')
                    : t('programs.builder.twoWeeksRequirement')
                }
              >
                2 weeks
              </TabsTrigger>
              <TabsTrigger
                value="4"
                disabled={!is4WeeksAvailable}
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  is4WeeksAvailable
                    ? t('programs.builder.showFourWeeks')
                    : t('programs.builder.fourWeeksRequirement')
                }
              >
                4 weeks
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>


        {programMeta && (
          <EditProgramDetailsSidePanel
            open={isEditDetailsOpen}
            onOpenChange={setIsEditDetailsOpen}
            programMeta={programMeta}
            onSave={handleSaveDetails}
            onDelete={mode === 'edit' ? handleDeleteProgram : undefined}
          />
        )}

        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto bg-background p-4">
        <div className="h-full flex flex-col gap-4">
          {Array.from({ length: getRowsCount() }, (_, rowIndex) => {
            const weekNumber = currentWeek + rowIndex;
            return (
              <div key={rowIndex} className="flex gap-4 flex-1 min-h-0">
                <div className="w-8 bg-background rounded-lg border border-border flex-shrink-0 flex flex-col">
                  <div className="flex flex-col items-center gap-1 p-1 flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDuplicateWeek(weekNumber)}
                            aria-label={t('programs.builder.duplicateWeekAria')}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('programs.builder.duplicateWeek')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteWeek(weekNumber)}
                            disabled={totalWeeks === 1}
                            aria-label={t('programs.builder.deleteWeekAria')}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{t('programs.builder.deleteWeek')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs uppercase text-muted-foreground -rotate-90 whitespace-nowrap">
                      {t('programs.builder.weekLabel', { number: weekNumber })}
                    </span>
                  </div>
                </div>
                {getDaysForRow(rowIndex).map((day) => {
                  const { week, day: dayInWeek } = getWeekAndDay(day);
                  const workouts = workoutsByDay[week]?.[dayInWeek] || [];
                  return (
                    <div
                      key={day}
                      className="flex-1 bg-muted rounded-lg border border-border flex flex-col min-h-0 h-full"
                    >
                      <div className="px-3 py-[2px] border-b border-border flex-shrink-0 flex items-center justify-between">
                        <span className="text-xs uppercase text-muted-foreground">{t('programs.builder.dayLabel', { number: day })}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 -mr-1 hover:bg-background"
                                aria-label={t('programs.builder.addWorkout.addAria')}
                                onClick={() => handleOpenAddWorkoutModal(day)}
                              >
                                <Plus className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('programs.builder.addWorkout.add')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0">
                        {workouts.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {workouts.map((workout) => (
                              <div
                                key={workout.id}
                                role="button"
                                tabIndex={0}
                                aria-label={t('programs.builder.viewDetailsForWorkout', { name: workout.program })}
                                onClick={() => handleOpenWorkoutDetails(week, dayInWeek, workout)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleOpenWorkoutDetails(week, dayInWeek, workout);
                                  }
                                }}
                                className="p-2 rounded-lg border border-border bg-background flex items-start justify-between gap-2 cursor-pointer"
                              >
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
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 flex-shrink-0"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteWorkout(week, dayInWeek, workout.id);
                                  }}
                                  aria-label={t('general.delete')}
                                >
                                  <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs h-7 px-2 text-muted-foreground"
                              aria-label={t('programs.builder.addWorkout.addAria')}
                              onClick={() => handleOpenAddWorkoutModal(day)}
                            >
                              <Plus className="size-3" />
                              <span>{t('programs.builder.addWorkout.add')}</span>
                            </Button>
                          </div>
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
      <AddWorkoutSidePanel
        open={isAddWorkoutModalOpen}
        onOpenChange={(open) => {
          setIsAddWorkoutModalOpen(open);
          if (!open) {
            setSelectedDay(null);
          }
        }}
        onSave={handleSaveWorkoutFromPanel}
        workoutTitle={selectedDay ? t('programs.builder.addWorkout.titleDay', { day: selectedDay }) : undefined}
      />
      <Dialog open={!!selectedWorkoutDetails} onOpenChange={(open) => !open && handleCloseWorkoutDetails()}>
        <DialogContent className="max-w-5xl sm:max-w-5xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex-1 min-w-0">
              <span
                className="block truncate text-left"
                title={selectedWorkoutDetails?.workout.program}
              >
                {selectedWorkoutDetails?.workout.program}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedWorkoutDetails && (
            <>
              <Separator />
              <div className="flex flex-1 min-h-0 gap-4 pt-3">
                <div className="flex-[3] h-full overflow-y-auto">
                  <div className="flex flex-col gap-3">
                    <Card className="p-4 border rounded-lg bg-background">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-sm font-medium truncate"
                            title={selectedWorkoutDetails.workout.program}
                          >
                            {selectedWorkoutDetails.workout.program}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(selectedWorkoutDetails.workout.created)}
                          </span>
                        </div>
                        {selectedWorkoutDetails.workout.description && (
                          <span className="text-xs text-muted-foreground line-clamp-3">
                            {selectedWorkoutDetails.workout.description}
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {t('general.type')}: {selectedWorkoutDetails.workout.type}
                          </Badge>
                          {selectedWorkoutDetails.workout.equipment &&
                            (typeof selectedWorkoutDetails.workout.equipment === 'string' ? selectedWorkoutDetails.workout.equipment
                              .split(',')
                              .filter((item: string) => item.trim() !== '').length > 0 : false) && (
                              <Badge variant="secondary" className="text-xs">
                                {typeof selectedWorkoutDetails.workout.equipment === 'string' ? selectedWorkoutDetails.workout.equipment
                                  .split(',')
                                  .map((item: string) => item.trim())
                                  .filter((item: string) => item !== '')
                                  .join(', ') : ''}
                              </Badge>
                            )}
                        </div>
                      </div>
                    </Card>
                    {buildMockPreviewSections(selectedWorkoutDetails.workout).map((section) => (
                      <Card key={section.id} className="bg-background flex flex-col">
                        <CardHeader className="px-3 py-2 border-b">
                          <CardTitle className="uppercase tracking-wide text-[11px] font-medium flex items-center gap-2">
                            {section.type}{' '}
                            <span className="font-normal text-[10px]">
                              ({section.exercises.length})
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            {section.exercises.map((exercise) => (
                              <div
                                key={exercise.id}
                                className="flex items-center justify-between gap-2 rounded-md border bg-muted/60 px-2 py-1.5"
                              >
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className="text-[11px] font-medium truncate"
                                    title={exercise.name}
                                  >
                                    {exercise.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {exercise.sets}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                <Separator orientation="vertical" className="h-full" />
                <div className="flex-[1.5] h-full overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide">{t('programs.builder.overview')}</h2>
                    <div className="flex flex-col gap-2">
                      {buildMockPreviewSections(selectedWorkoutDetails.workout).map((section) => (
                        <Card
                          key={section.id}
                          className="border rounded-lg bg-card/80 shadow-sm flex flex-col"
                        >
                          <CardHeader className="px-3 py-2 border-b">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {section.type}{' '}
                              <span className="font-normal">
                                ({section.exercises.length})
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-2 flex flex-col gap-1">
                            {section.exercises.map((exercise) => (
                              <div
                                key={exercise.id}
                                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                                <span className="text-[11px] flex-1 min-w-0 truncate">
                                  {exercise.name}
                                </span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
    </div >
  );
};

