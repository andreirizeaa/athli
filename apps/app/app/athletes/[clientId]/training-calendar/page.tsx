'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  FileText,
  Plus,
  Search,
  Trash2,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Program, Workout } from '@/components/app/app-shell';
import { mockPrograms, mockWorkouts } from '@/components/app/app-shell';

const DAY_MS = 24 * 60 * 60 * 1000;

const ClientTrainingCalendarPage = () => {
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState<string>('1');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks] = useState<number>(52); // Default to 52 weeks (1 year)
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState<boolean>(false);
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState<string>('');
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedScheduleOption, setSelectedScheduleOption] = useState<string | null>('once');
  const [everyDaysInput, setEveryDaysInput] = useState<string>('');
  const [weeklyDayInput, setWeeklyDayInput] = useState<string>('');
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

  const [history, setHistory] = useState<
    Array<{
      workoutsByDate: {
        [dateKey: string]: Array<Workout & { id: string }>;
      };
    }>
  >([{ workoutsByDate: {} }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isUndoRedo, setIsUndoRedo] = useState<boolean>(false);

  const [isAddProgramModalOpen, setIsAddProgramModalOpen] = useState<boolean>(false);
  const [programSearchQuery, setProgramSearchQuery] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programStartDate, setProgramStartDate] = useState<Date | null>(null);

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
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

  // Filter workouts based on search query (same as program builder)
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

  const filteredPrograms = mockPrograms.filter((program) => {
    if (!programSearchQuery.trim()) {
      return true;
    }
    const query = programSearchQuery.toLowerCase().trim();
    return (
      program.program.toLowerCase().includes(query) ||
      program.description.toLowerCase().includes(query) ||
      program.type.toLowerCase().includes(query)
    );
  });

  const handleOpenAddWorkoutModal = (date: Date) => {
    setSelectedDateForWorkout(date);
    setIsAddWorkoutModalOpen(true);
  };

  const handleOpenAddProgramModal = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveStart = new Date(date);
    effectiveStart.setHours(0, 0, 0, 0);
    const start = effectiveStart > today ? effectiveStart : today;

    setProgramStartDate(start);
    setSelectedProgram(null);
    setProgramSearchQuery('');
    setIsAddProgramModalOpen(true);
  };

  const handleCloseAddProgramModal = () => {
    setIsAddProgramModalOpen(false);
    setSelectedProgram(null);
    setProgramSearchQuery('');
    setProgramStartDate(null);
  };

  const handleCloseAddWorkoutModal = () => {
    setIsAddWorkoutModalOpen(false);
    setSelectedWorkout(null);
    setWorkoutSearchQuery('');
    setSelectedScheduleOption('once');
    setEveryDaysInput('');
    setWeeklyDayInput('');
    setSelectedDateForWorkout(null);
  };

  const handleAddWorkoutConfirm = () => {
    if (!selectedWorkout || !selectedDateForWorkout) {
      handleCloseAddWorkoutModal();
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

      if (selectedScheduleOption === 'every' && everyDaysInput) {
        const daysInterval = parseInt(everyDaysInput, 10);
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
      } else if (selectedScheduleOption === 'weekly' && weeklyDayInput) {
        const dayOfWeek = parseInt(weeklyDayInput, 10);
        if (Number.isFinite(dayOfWeek) && dayOfWeek >= 1 && dayOfWeek <= 7) {
          for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
            const monday = new Date(startDate);
            monday.setDate(startDate.getDate() + weekIndex * 7);
            monday.setHours(0, 0, 0, 0);

            const target = new Date(monday);
            target.setDate(monday.getDate() + (dayOfWeek - 1));
            target.setHours(0, 0, 0, 0);

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

      if (!isUndoRedo) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          workoutsByDate: JSON.parse(JSON.stringify(updated)),
        });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }

      return updated;
    });

    handleCloseAddWorkoutModal();
  };

  const handleOpenWorkoutDetails = (dateKey: string, workout: Workout & { id: string }) => {
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

      if (!isUndoRedo) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          workoutsByDate: JSON.parse(JSON.stringify(updatedState)),
        });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }

      return updatedState;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setWorkoutsByDate(JSON.parse(JSON.stringify(state.workoutsByDate)));
      setTimeout(() => setIsUndoRedo(false), 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setWorkoutsByDate(JSON.parse(JSON.stringify(state.workoutsByDate)));
      setTimeout(() => setIsUndoRedo(false), 0);
    }
  };

  const handleAddProgramConfirm = () => {
    if (!selectedProgram || !programStartDate) {
      handleCloseAddProgramModal();
      return;
    }

    const start = new Date(programStartDate);
    start.setHours(0, 0, 0, 0);

    const weeksText = selectedProgram.length.split(' ')[0];
    const weeksNumber = parseInt(weeksText, 10);
    const totalProgramWeeks = Number.isFinite(weeksNumber) && weeksNumber > 0 ? weeksNumber : 1;

    const baseWorkout: Workout = {
      id: selectedProgram.id,
      program: selectedProgram.program,
      description: selectedProgram.description,
      type: selectedProgram.type,
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

      if (!isUndoRedo) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          workoutsByDate: JSON.parse(JSON.stringify(updated)),
        });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }

      return updated;
    });

    handleCloseAddProgramModal();
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
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="w-full px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleToday}
              className="h-8"
              aria-label="Go to today"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePreviousWeek}
              className="h-8 w-8"
              aria-label="Previous week"
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
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="h-8 w-8 p-0"
              aria-label="Undo"
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
              aria-label="Redo"
            >
              <Redo className="size-4" />
            </Button>
          </div>
          <Tabs value={selectedWeek} onValueChange={setSelectedWeek}>
            <TabsList className="w-auto">
              <TabsTrigger
                value="1"
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                title="Show 1 week at a time on screen"
              >
                1 week
              </TabsTrigger>
              <TabsTrigger
                value="2"
                disabled={!is2WeeksAvailable}
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  is2WeeksAvailable
                    ? 'Show 2 weeks at a time on screen'
                    : '2 weeks view requires total weeks to be divisible by 2'
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
                    ? 'Show 4 weeks at a time on screen'
                    : '4 weeks view requires total weeks to be divisible by 4'
                }
              >
                4 weeks
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto bg-background px-4 pb-4 pt-2">
        <div className="h-full flex flex-col">
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
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {Array.from({ length: getRowsCount() }, (_, rowIndex) => {
              const weekDates = calendarDates[rowIndex] || [];
              return (
                <div key={rowIndex} className="flex gap-4 flex-1 min-h-0">
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
                                  aria-label="Add workout or program"
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenAddWorkoutModal(date)}>
                                  <span>Add workout</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenAddProgramModal(date)}>
                                  <span>Add program</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0">
                          {workoutsForDate.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {workoutsForDate.map((workout) => (
                                <div
                                  key={workout.id}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`View details for workout ${workout.program}`}
                                  onClick={() => handleOpenWorkoutDetails(dateKey, workout)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      handleOpenWorkoutDetails(dateKey, workout);
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
                                      {workout.totalExercises === 1 ? 'exercise' : 'exercises'}
                                    </span>
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
                                    aria-label="Delete workout"
                                  >
                                    <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            !isDateInPast(date) && (
                              <div className="flex items-center justify-center h-full">
                                <div className="flex flex-col gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs h-7 px-2 text-muted-foreground"
                                    aria-label="Add workout"
                                    onClick={() => handleOpenAddWorkoutModal(date)}
                                  >
                                    <Dumbbell className="size-3" />
                                    <span>Add workout</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs h-7 px-2 text-muted-foreground"
                                    aria-label="Add program"
                                    onClick={() => handleOpenAddProgramModal(date)}
                                  >
                                    <FileText className="size-3" />
                                    <span>Add program</span>
                                  </Button>
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
      </div>
      <Dialog
        open={isAddWorkoutModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseAddWorkoutModal();
          } else {
            setIsAddWorkoutModalOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-4xl sm:max-w-4xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {selectedDateForWorkout ? `Add workout - ${formatDate(selectedDateForWorkout)}` : 'Add workout'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {!selectedWorkout ? (
              <>
                <div className="relative w-full flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search workouts"
                    className="w-full pl-9"
                    aria-label="Search workouts"
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
                          aria-label={`Select workout ${workout.program}`}
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
                              <span className="text-xs text-muted-foreground">
                                {formatWorkoutCreatedDate(workout.created)}
                              </span>
                            </div>
                            {workout.description && (
                              <span className="text-xs text-muted-foreground line-clamp-2">
                                {workout.description}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">
                                Type: {workout.type}
                              </Badge>
                              {equipmentList.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  Equipment: {equipmentList.join(', ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No workouts found
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
                <Card className="p-4 border rounded-lg bg-background">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{selectedWorkout.program}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatWorkoutCreatedDate(selectedWorkout.created)}
                      </span>
                    </div>
                    {selectedWorkout.description && (
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {selectedWorkout.description}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        Type: {selectedWorkout.type}
                      </Badge>
                      {selectedWorkout.equipment &&
                        selectedWorkout.equipment
                          .split(',')
                          .filter((item) => item.trim() !== '').length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedWorkout.equipment
                              .split(',')
                              .map((item) => item.trim())
                              .filter((item) => item !== '')
                              .join(', ')}
                          </Badge>
                        )}
                    </div>
                  </div>
                </Card>
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium">Add configurations</h3>
                  <Card
                    className={cn(
                      'p-4 border rounded-lg cursor-pointer transition-colors',
                      selectedScheduleOption === 'once'
                        ? 'border-primary bg-primary/5'
                        : 'bg-background hover:bg-accent/30',
                    )}
                    role="button"
                    tabIndex={0}
                    aria-label="Add only for this day"
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
                        Add only for this day
                      </span>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                          selectedScheduleOption === 'once'
                            ? 'border-primary bg-primary/10'
                            : 'border-input bg-background',
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
                        : 'bg-background',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Add this workout every</span>
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
                          aria-label="Number of days"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer',
                          selectedScheduleOption === 'every'
                            ? 'border-primary bg-primary/10'
                            : 'border-input bg-background',
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label="Select repeat every days option"
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
                        : 'bg-background',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Repeat weekly on day</span>
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
                          aria-label="Day of week"
                        />
                      </div>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer',
                          selectedScheduleOption === 'weekly'
                            ? 'border-primary bg-primary/10'
                            : 'border-input bg-background',
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label="Select repeat weekly option"
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
                onClick={handleCloseAddWorkoutModal}
                aria-label="Cancel"
              >
                Cancel
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
                aria-label="Select new workout"
              >
                Select new workout
              </Button>
              <Button
                type="button"
                onClick={handleAddWorkoutConfirm}
                aria-label="Add workout"
              >
                Add
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selectedWorkoutDetails}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseWorkoutDetails();
          }
        }}
      >
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
              <div className="flex flex-1 min-h-0 gap-4 pt-2">
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
                            {formatWorkoutCreatedDate(selectedWorkoutDetails.workout.created)}
                          </span>
                        </div>
                        {selectedWorkoutDetails.workout.description && (
                          <span className="text-xs text-muted-foreground line-clamp-3">
                            {selectedWorkoutDetails.workout.description}
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            Type: {selectedWorkoutDetails.workout.type}
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
                    <h2 className="text-xs font-semibold uppercase tracking-wide">Overview</h2>
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
              <div className="flex items-center justify-end gap-2 pt-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const baseId = selectedWorkoutDetails.workout.id.split('-')[0];
                    router.push(`/library/workouts/${baseId}/edit/standard`);
                  }}
                  aria-label="Edit workout"
                >
                  Edit workout
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseWorkoutDetails}
                  aria-label="Close workout details"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isAddProgramModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseAddProgramModal();
          } else {
            setIsAddProgramModalOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-4xl sm:max-w-4xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add program</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex flex-1 min-h-0 gap-4">
              <div className="flex-[2] flex flex-col min-w-0">
                <div className="relative w-full flex-shrink-0 mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search programs"
                    className="w-full pl-9"
                    aria-label="Search programs"
                    value={programSearchQuery}
                    onChange={(event) => setProgramSearchQuery(event.target.value)}
                  />
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  {filteredPrograms.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {filteredPrograms.map((program) => {
                        const isActive = selectedProgram?.id === program.id;
                        return (
                          <Card
                            key={program.id}
                            className={cn(
                              'p-3 border rounded-lg cursor-pointer transition-colors',
                              isActive
                                ? 'border-primary bg-primary/5'
                                : 'bg-background hover:bg-accent/30',
                            )}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select program ${program.program}`}
                            onClick={() => setSelectedProgram(program)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedProgram(program);
                              }
                            }}
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">
                                  {program.program}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {program.length}
                                </span>
                              </div>
                              {program.description && (
                                <span className="text-xs text-muted-foreground line-clamp-2">
                                  {program.description}
                                </span>
                              )}
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  Type: {program.type}
                                </Badge>
                                {program.equipment && (
                                  <Badge variant="secondary" className="text-xs">
                                    {program.equipment}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-8 text-center">
                      No programs found.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-[1.5] flex flex-col gap-4 min-w-0">
                <Card className="p-4 border rounded-lg bg-background">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Start date</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left text-xs font-normal"
                            aria-label="Program start date"
                          >
                            <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            {programStartDate ? formatDate(programStartDate) : 'Select start date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={programStartDate ?? undefined}
                            onSelect={(date) => {
                              if (!date) {
                                setProgramStartDate(null);
                                return;
                              }
                              const normalized = new Date(date);
                              normalized.setHours(0, 0, 0, 0);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const finalDate = normalized < today ? today : normalized;
                              setProgramStartDate(finalDate);
                            }}
                            defaultMonth={programStartDate ?? new Date()}
                            initialFocus
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2030}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">End date</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedProgram && programStartDate
                          ? (() => {
                              const start = new Date(programStartDate);
                              const weeksText = selectedProgram.length.split(' ')[0];
                              const weeksNumber = parseInt(weeksText, 10);
                              const totalProgramWeeks =
                                Number.isFinite(weeksNumber) && weeksNumber > 0
                                  ? weeksNumber
                                  : 1;
                              const end = new Date(start);
                              end.setDate(start.getDate() + totalProgramWeeks * 7 - 1);
                              return formatDate(end);
                            })()
                          : 'Select a program and start date'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 flex-shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseAddProgramModal}
              aria-label="Cancel add program"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddProgramConfirm}
              disabled={!selectedProgram || !programStartDate}
              aria-label="Add program to calendar"
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientTrainingCalendarPage;
