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
import { Calendar, Check, ChevronLeft, ChevronRight, Copy, Plus, Redo, Search, Trash2, Undo, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Workout } from '@/components/app/app-shell';
import { mockWorkouts } from '@/components/app/app-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiscardChangesDialog } from '@/app/library/workouts/new/components/discard-changes-dialog';

type ProgramMeta = {
  name: string;
  type: string;
  difficulty: string;
  weeks: string;
  description: string;
};

type ProgramSchema = Array<{ day: number; workouts: string[] }>;

type ProgramBuilderProps = {
  mode: 'new' | 'edit';
  programId?: string;
  initialProgramMeta?: ProgramMeta | null;
  onLoadProgramData?: () => Promise<{
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  } | null>;
};

export const ProgramBuilder = ({
  mode,
  programId,
  initialProgramMeta,
  onLoadProgramData,
}: ProgramBuilderProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [programMeta, setProgramMeta] = useState<ProgramMeta | null>(initialProgramMeta || null);
  const [selectedWeek, setSelectedWeek] = useState<string>('1');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks, setTotalWeeks] = useState<number>(1);
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState<boolean>(false);
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState<string>('');
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedScheduleOption, setSelectedScheduleOption] = useState<string | null>('once');
  const [everyDaysInput, setEveryDaysInput] = useState<string>('');
  const [weeklyDayInput, setWeeklyDayInput] = useState<string>('');
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
  const [isLoading, setIsLoading] = useState<boolean>(mode === 'edit');
  const [selectedWorkoutDetails, setSelectedWorkoutDetails] = useState<{
    week: number;
    day: number;
    workout: Workout & { id: string };
  } | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (mode === 'new') {
      // Use a small delay to ensure localStorage is available after navigation
      const timeoutId = setTimeout(() => {
        // Check for access flag - if not present, redirect to programs
        const accessFlag = window.localStorage.getItem('oneninety_program_builder_access');
        if (accessFlag !== 'true') {
          router.push('/library/programs');
          return;
        }

        // Try to load meta from localStorage (if coming from create panel)
        const raw = window.localStorage.getItem('oneninety_new_program_meta');
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ProgramMeta;
            setProgramMeta(parsed);
            // Initialize total weeks from meta if available
            if (parsed.weeks && parsed.weeks.trim() !== '') {
              const weeksNum = parseInt(parsed.weeks, 10);
              if (!Number.isNaN(weeksNum) && weeksNum > 0) {
                setTotalWeeks(weeksNum);
                // Initialize history with the correct totalWeeks
                setHistory([{ workoutsByDay: {}, totalWeeks: weeksNum }]);
                // Update initial state
                setInitialState({ workoutsByDay: {}, totalWeeks: weeksNum });
              }
            }
            // Clear the access flag after loading
            window.localStorage.removeItem('oneninety_program_builder_access');
            return;
          } catch {
            // If parsing fails, fall through to default values
          }
        }

        // If no meta in localStorage, use default values
        setProgramMeta({
          name: t('programs.builder.newProgram'),
          type: '',
          difficulty: 'all levels',
          weeks: '',
          description: '',
        });
      }, 50);

      return () => clearTimeout(timeoutId);
    } else if (mode === 'edit' && onLoadProgramData) {
      // Load program data for edit mode
      onLoadProgramData()
        .then((data) => {
          if (data) {
            setWorkoutsByDay(data.workoutsByDay);
            setTotalWeeks(data.totalWeeks);
            setHistory([{ workoutsByDay: data.workoutsByDay, totalWeeks: data.totalWeeks }]);
            setInitialState({ workoutsByDay: data.workoutsByDay, totalWeeks: data.totalWeeks });
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [mode, router, onLoadProgramData]);

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
    router.push('/library/programs');
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

  const handleSave = () => {
    // Build the program schema: list of days with workout IDs
    const programSchema: ProgramSchema = [];
    
    // Iterate through all days (1 to totalWeeks * 7)
    for (let dayNum = 1; dayNum <= totalWeeks * 7; dayNum++) {
      const { week, day } = getWeekAndDay(dayNum);
      const workouts = workoutsByDay[week]?.[day] || [];
      // Extract workout IDs (use the original workout.id, not the generated one)
      const workoutIds = workouts.map((workout) => {
        // The workout.id might be like "workout-id-timestamp", extract the original ID
        const parts = workout.id.split('-');
        // Remove the last 2 parts (timestamp and random) if they exist
        return parts.length > 2 ? parts.slice(0, -2).join('-') : workout.id;
      });
      
      if (workoutIds.length > 0) {
        programSchema.push({
          day: dayNum,
          workouts: workoutIds,
        });
      }
    }
    
    // Save schema to localStorage (in a real app, this would be saved to a database)
    if (mode === 'edit' && programId) {
      const programSchemaKey = `oneninety_program_schema_${programId}`;
      window.localStorage.setItem(programSchemaKey, JSON.stringify(programSchema));
    }
    
    // eslint-disable-next-line no-console
    console.log('Program schema:', programSchema);
    
    // Update initial state to reflect saved state
    setInitialState({ workoutsByDay, totalWeeks });
    
    // Navigate back to programs page
    router.push('/library/programs');
  };

  const handleSaveClick = () => {
    handleSave();
  };

  const handleBreadcrumbClick = (path: string) => {
    if (path === '/library') {
      handleActionWithConfirmation(() => {
        router.push('/library');
      });
    } else if (path === '/library/programs') {
      handleActionWithConfirmation(() => {
        navigateBackToPrograms();
      });
    }
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

  const handleAddWorkout = () => {
    if (!selectedWorkout || selectedDay === null) return;

    const workoutToAdd = {
      ...selectedWorkout,
      id: `${selectedWorkout.id}-${Date.now()}`,
    };

    setWorkoutsByDay((prev) => {
      const updated = { ...prev };

      if (selectedScheduleOption === 'once') {
        const { week, day } = getWeekAndDay(selectedDay);
        updated[week] = {
          ...(updated[week] || {}),
          [day]: [...(updated[week]?.[day] || []), workoutToAdd],
        };
      } else if (selectedScheduleOption === 'every' && everyDaysInput) {
        const daysInterval = parseInt(everyDaysInput, 10);
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
      } else if (selectedScheduleOption === 'weekly' && weeklyDayInput) {
        const dayOfWeek = parseInt(weeklyDayInput, 10);
        if (dayOfWeek >= 1 && dayOfWeek <= 7) {
          for (let week = 1; week <= totalWeeks; week++) {
            updated[week] = {
              ...(updated[week] || {}),
              [dayOfWeek]: [...(updated[week]?.[dayOfWeek] || []), workoutToAdd],
            };
          }
        }
      }

      saveToHistory(updated);
      return updated;
    });

    // Close modal and reset
    setIsAddWorkoutModalOpen(false);
    setSelectedWorkout(null);
    setWorkoutSearchQuery('');
    setSelectedScheduleOption('once');
    setEveryDaysInput('');
    setWeeklyDayInput('');
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

  // Filter workouts based on search query
  const filteredWorkouts = mockWorkouts.filter((workout) => {
    if (!workoutSearchQuery.trim()) {
      return true;
    }
    const query = workoutSearchQuery.toLowerCase().trim();
    return (
      workout.program.toLowerCase().includes(query) ||
      workout.description.toLowerCase().includes(query) ||
      workout.type.toLowerCase().includes(query) ||
      workout.equipment.toLowerCase().includes(query)
    );
  });

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

  const pageTitle = mode === 'new' ? t('programs.builder.newProgram') : t('programs.builder.editProgram');

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/library')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('programs.detail.breadcrumb.library')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/library/programs')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('programs.detail.breadcrumb.programs')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {pageTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">{programMeta.name}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="secondary"
              onClick={handleCancel}
              className="gap-2"
              aria-label={t('programs.builder.cancelAria')}
            >
              <X className="size-4" />
              <span>{t('programs.builder.cancel')}</span>
            </Button>
            <ButtonGroupSeparator />
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
              variant="ghost"
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
              variant="ghost"
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
      <Dialog
        open={isAddWorkoutModalOpen}
        onOpenChange={(open) => {
          setIsAddWorkoutModalOpen(open);
          if (!open) {
            setSelectedWorkout(null);
            setWorkoutSearchQuery('');
            setSelectedScheduleOption('once');
            setEveryDaysInput('');
            setWeeklyDayInput('');
            setSelectedDay(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl sm:max-w-4xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('programs.builder.addWorkout.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {!selectedWorkout ? (
              <>
                <div className="relative w-full flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder={t('programs.builder.addWorkout.searchPlaceholder')}
                    className="w-full pl-9"
                    aria-label={t('programs.builder.addWorkout.searchPlaceholder')}
                    value={workoutSearchQuery}
                    onChange={(e) => setWorkoutSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
                  {filteredWorkouts.length > 0 ? (
                    filteredWorkouts.map((workout) => {
                      const equipmentList = workout.equipment
                        .split(',')
                        .map((item) => item.trim())
                        .filter((item) => item !== '');
                      return (
                        <div
                          key={workout.id}
                          className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                          role="button"
                          tabIndex={0}
                          aria-label={t('programs.builder.selectWorkout', { name: workout.program })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedWorkout(workout);
                            }
                          }}
                          onClick={() => {
                            setSelectedWorkout(workout);
                          }}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{workout.program}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(workout.created)}</span>
                            </div>
                            {workout.description && (
                              <span className="text-xs text-muted-foreground line-clamp-2">
                                {workout.description}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {t('general.type')}: {workout.type}
                              </Badge>
                              {equipmentList.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('general.equipment')}: {equipmentList.join(', ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {t('programs.builder.addWorkout.noWorkoutsFound')}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
                {selectedWorkout && (
                  <Card className="p-4 border rounded-lg bg-background">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{selectedWorkout.program}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(selectedWorkout.created)}</span>
                      </div>
                      {selectedWorkout.description && (
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {selectedWorkout.description}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {t('general.type')}: {selectedWorkout.type}
                        </Badge>
                        {selectedWorkout.equipment && selectedWorkout.equipment.split(',').filter((item) => item.trim() !== '').length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {t('general.equipment')}: {selectedWorkout.equipment.split(',').map((item) => item.trim()).filter((item) => item !== '').join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium">{t('athletes.trainingCalendar.addConfigurations')}</h3>
                  <Card
                    className={cn(
                      'p-4 border rounded-lg cursor-pointer transition-colors',
                      selectedScheduleOption === 'once'
                        ? 'border-primary bg-primary/5'
                        : 'bg-background hover:bg-accent/30'
                    )}
                    role="button"
                    tabIndex={0}
                    aria-label={t('programs.builder.addWorkout.scheduleOption.once')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedScheduleOption('once');
                      }
                    }}
                    onClick={() => {
                      setSelectedScheduleOption('once');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {t('programs.builder.addWorkout.scheduleOption.once')} {selectedDay !== null ? selectedDay : ''}
                      </span>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                          selectedScheduleOption === 'once'
                            ? 'border-primary bg-primary/10'
                            : 'border-input bg-background'
                        )}
                      >
                        {selectedScheduleOption === 'once' && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </Card>
                  <Card
                    className={cn(
                      'p-4 border rounded-lg transition-colors',
                      selectedScheduleOption === 'every'
                        ? 'border-primary bg-primary/5'
                        : 'bg-background'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t('programs.builder.addWorkout.scheduleOption.everyDays')}</span>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          className="w-24"
                          value={everyDaysInput}
                          onChange={(e) => {
                            setEveryDaysInput(e.target.value);
                            if (e.target.value) {
                              setSelectedScheduleOption('every');
                            }
                          }}
                          aria-label={t('programs.builder.addWorkout.numberOfDays')}
                        />
                        <span className="text-sm text-muted-foreground">{t('programs.builder.addWorkout.days')}</span>
                      </div>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer',
                          selectedScheduleOption === 'every'
                            ? 'border-primary bg-primary/10'
                            : 'border-input bg-background'
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label={t('programs.builder.selectRepeatEveryDays')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedScheduleOption('every');
                          }
                        }}
                        onClick={() => {
                          setSelectedScheduleOption('every');
                        }}
                      >
                        {selectedScheduleOption === 'every' && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </Card>
                  <Card
                    className={cn(
                      'p-4 border rounded-lg transition-colors',
                      selectedScheduleOption === 'weekly'
                        ? 'border-primary bg-primary/5'
                        : 'bg-background'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t('programs.builder.addWorkout.scheduleOption.weekly')}</span>
                        <Input
                          type="number"
                          min="1"
                          max="7"
                          placeholder="1"
                          className="w-24"
                          value={weeklyDayInput}
                          onChange={(e) => {
                            setWeeklyDayInput(e.target.value);
                            if (e.target.value) {
                              setSelectedScheduleOption('weekly');
                            }
                          }}
                          aria-label={t('programs.builder.addWorkout.dayOfWeek')}
                        />
                      </div>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer',
                          selectedScheduleOption === 'weekly'
                            ? 'border-primary bg-primary/10'
                            : 'border-input bg-background'
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label={t('programs.builder.selectRepeatWeekly')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedScheduleOption('weekly');
                          }
                        }}
                        onClick={() => {
                          setSelectedScheduleOption('weekly');
                        }}
                      >
                        {selectedScheduleOption === 'weekly' && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
          {selectedWorkout && (
            <div className="flex items-center justify-end gap-2 flex-shrink-0 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsAddWorkoutModalOpen(false);
                  setSelectedWorkout(null);
                  setWorkoutSearchQuery('');
                  setSelectedScheduleOption('once');
                  setEveryDaysInput('');
                  setWeeklyDayInput('');
                  setSelectedDay(null);
                }}
                aria-label={t('programs.builder.addWorkout.cancel')}
              >
                {t('programs.builder.addWorkout.cancel')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedWorkout(null);
                  setSelectedScheduleOption('once');
                  setEveryDaysInput('');
                  setWeeklyDayInput('');
                }}
                aria-label={t('general.select')}
              >
                {t('general.select')}
              </Button>
              <Button
                type="button"
                onClick={handleAddWorkout}
                aria-label={t('programs.builder.addWorkout.addAria')}
              >
                {t('programs.builder.addWorkout.add')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
                            selectedWorkoutDetails.workout.equipment
                              .split(',')
                              .filter((item) => item.trim() !== '').length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedWorkoutDetails.workout.equipment
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter((item) => item !== '')
                                  .join(', ')}
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
    </div>
  );
};

