'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Search, X, Edit, ArrowUp, ArrowDown, Check, Trash2, Flame } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/general/utils';
import { AddHabitSidePanel, type HabitFormValues } from '@/components/habits/add-habit-side-panel';
import { EditHabitSidePanel } from '@/components/habits/edit-habit-side-panel';
import { LogHabitSidePanel } from '@/components/habits/log-habit-side-panel';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { mockAthletes } from '@/components/app/app-shell';
import { addHabit, type Habit } from '@/api/coach/coach-habit-service';
import { assignHabit, deleteClientHabits } from '@/api/client/client-habit-service';

// Mock data - in production this would be filtered by clientId
const mockHabits: Habit[] = [
  {
    id: '1',
    name: 'Daily steps',
    description: 'Track your daily step count to stay active',
    amount: 10000,
    unit: 'steps',
    period: 'daily',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: '2',
    name: 'Drink water',
    description: 'Stay hydrated throughout the day',
    amount: 8,
    unit: 'cups',
    period: 'daily',
    reminderTime: '08:00',
    reminderMessage: 'Time to hydrate!',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: '3',
    name: 'Meditate',
    description: 'Take time for mindfulness and mental clarity',
    amount: 10,
    unit: 'min',
    period: 'daily',
    duration: 30,
    createdAt: Date.now() - 86400000 * 3,
  },
];

type HabitLog = {
  id: string;
  habitId: string;
  value: number;
  completedAt: Date;
};

// Mock habit logs data
const mockHabitLogs: HabitLog[] = [
  { id: 'log-1', habitId: '1', value: 8500, completedAt: new Date(2024, 11, 20) },
  { id: 'log-2', habitId: '1', value: 10200, completedAt: new Date(2024, 11, 21) },
  { id: 'log-3', habitId: '1', value: 9800, completedAt: new Date(2024, 11, 22) },
  { id: 'log-4', habitId: '1', value: 11500, completedAt: new Date(2024, 11, 23) },
  { id: 'log-5', habitId: '1', value: 10500, completedAt: new Date(2024, 11, 24) },
  { id: 'log-6', habitId: '1', value: 12000, completedAt: new Date(2024, 11, 25) },
  { id: 'log-7', habitId: '1', value: 11000, completedAt: new Date(2024, 11, 26) },
  { id: 'log-8', habitId: '1', value: 10000, completedAt: new Date(2024, 11, 27) },
  { id: 'log-9', habitId: '2', value: 8, completedAt: new Date(2024, 11, 20) },
  { id: 'log-10', habitId: '2', value: 7, completedAt: new Date(2024, 11, 21) },
  { id: 'log-11', habitId: '2', value: 9, completedAt: new Date(2024, 11, 22) },
  { id: 'log-12', habitId: '2', value: 8, completedAt: new Date(2024, 11, 23) },
  { id: 'log-13', habitId: '3', value: 10, completedAt: new Date(2024, 11, 20) },
  { id: 'log-14', habitId: '3', value: 12, completedAt: new Date(2024, 11, 21) },
  { id: 'log-15', habitId: '3', value: 10, completedAt: new Date(2024, 11, 22) },
];

const ClientHabitsPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const athlete = mockAthletes.find((item) => item.id === clientId);
  const clientName = athlete?.name || 'this client';
  const [habits, setHabits] = useState<Habit[]>(mockHabits);
  const [isAddHabitOpen, setIsAddHabitOpen] = useState<boolean>(false);
  const [isLogHabitOpen, setIsLogHabitOpen] = useState<boolean>(false);
  const [isEditHabitOpen, setIsEditHabitOpen] = useState<boolean>(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogValue, setEditingLogValue] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('all-time');
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>(mockHabitLogs);

  const filteredHabits = useMemo(() => {
    if (!searchQuery.trim()) {
      return habits;
    }
    const query = searchQuery.toLowerCase();
    return habits.filter(
      (habit) =>
        habit.name.toLowerCase().includes(query) ||
        habit.description?.toLowerCase().includes(query) ||
        habit.unit.toLowerCase().includes(query)
    );
  }, [searchQuery, habits]);

  const selectedHabit = selectedHabitId
    ? habits.find((habit) => habit.id === selectedHabitId)
    : null;

  // Map filter values to translation keys
  const getFilterLabel = (filterValue: string): string => {
    const filterMap: Record<string, string> = {
      'last-week': 'lastWeek',
      'last-2-weeks': 'last2Weeks',
      'last-month': 'lastMonth',
      'last-3-months': 'last3Months',
      'last-6-months': 'last6Months',
      'last-year': 'lastYear',
      'all-time': 'allTime',
    };
    return t(`habits.timeFilter.${filterMap[filterValue] || 'allTime'}`);
  };

  // Filter logs by time period
  const getFilteredLogsByTime = useMemo(() => {
    if (!selectedHabitId) return [];

    const allLogs = habitLogs
      .filter((log) => log.habitId === selectedHabitId)
      .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

    if (timeFilter === 'all-time') {
      return allLogs;
    }

    const now = new Date();
    let cutoffDate: Date;

    switch (timeFilter) {
      case 'last-week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-2-weeks':
        cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case 'last-month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last-3-months':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'last-6-months':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'last-year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return allLogs;
    }

    return allLogs.filter((log) => log.completedAt >= cutoffDate);
  }, [selectedHabitId, habitLogs, timeFilter]);

  // Get logs for selected habit (filtered by time)
  const selectedHabitLogs = getFilteredLogsByTime;

  // Calculate average
  const averageValue = useMemo(() => {
    if (selectedHabitLogs.length === 0) return null;
    const sum = selectedHabitLogs.reduce((acc, log) => acc + log.value, 0);
    return sum / selectedHabitLogs.length;
  }, [selectedHabitLogs]);

  // Calculate completion rate
  const completionRate = useMemo(() => {
    if (!selectedHabit || selectedHabitLogs.length === 0) return null;
    // For daily habits, calculate based on days in period
    // For weekly habits, calculate based on weeks in period
    const now = new Date();
    let expectedCompletions = 0;

    if (timeFilter === 'all-time') {
      // Use habit creation date
      const daysSinceCreation = Math.floor((now.getTime() - selectedHabit.createdAt) / (24 * 60 * 60 * 1000));
      expectedCompletions = selectedHabit.period === 'daily' ? daysSinceCreation : Math.floor(daysSinceCreation / 7);
    } else {
      const cutoffDate = timeFilter === 'last-week'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : timeFilter === 'last-2-weeks'
          ? new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
          : timeFilter === 'last-month'
            ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            : timeFilter === 'last-3-months'
              ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
              : timeFilter === 'last-6-months'
                ? new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
                : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const daysInPeriod = Math.floor((now.getTime() - cutoffDate.getTime()) / (24 * 60 * 60 * 1000));
      expectedCompletions = selectedHabit.period === 'daily' ? daysInPeriod : Math.floor(daysInPeriod / 7);
    }

    if (expectedCompletions === 0) return 0;
    return (selectedHabitLogs.length / expectedCompletions) * 100;
  }, [selectedHabit, selectedHabitLogs, timeFilter]);

  // Calculate movement (current vs first)
  const movement = useMemo(() => {
    if (selectedHabitLogs.length < 2) return null;
    const firstValue = selectedHabitLogs[0].value;
    const currentValue = selectedHabitLogs[selectedHabitLogs.length - 1].value;
    const diff = currentValue - firstValue;
    const percentage = firstValue !== 0 ? ((diff / firstValue) * 100) : 0;
    return {
      value: diff,
      percentage: Math.abs(percentage),
      isUp: diff > 0,
    };
  }, [selectedHabitLogs]);

  // Calculate streak
  const streak = useMemo(() => {
    if (!selectedHabit || selectedHabitLogs.length === 0) {
      return { current: 0, best: 0 };
    }

    // Helper to normalize date to start of day
    const normalizeDate = (date: Date): Date => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      normalized.setMinutes(0);
      normalized.setSeconds(0);
      normalized.setMilliseconds(0);
      return normalized;
    };

    // Helper to get date key for grouping (YYYY-MM-DD for daily, YYYY-WW for weekly)
    const getDateKey = (date: Date): string => {
      const normalized = normalizeDate(date);
      if (selectedHabit.period === 'daily') {
        return format(normalized, 'yyyy-MM-dd');
      } else {
        // For weekly, use ISO week
        const year = normalized.getFullYear();
        const week = getISOWeek(normalized);
        return `${year}-W${week.toString().padStart(2, '0')}`;
      }
    };

    const getISOWeek = (date: Date): number => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // Get unique date keys and sort them
    const dateKeysSet = new Set(selectedHabitLogs.map((log) => getDateKey(log.completedAt)));
    const dateKeys = Array.from(dateKeysSet).sort();

    if (dateKeys.length === 0) {
      return { current: 0, best: 0 };
    }

    // Calculate current streak (from today backwards)
    const now = normalizeDate(new Date());
    const todayKey = getDateKey(now);
    const yesterdayKey = getDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    // Find starting point (today, yesterday, or most recent)
    let startKey = dateKeys.includes(todayKey) ? todayKey :
      dateKeys.includes(yesterdayKey) ? yesterdayKey :
        dateKeys[dateKeys.length - 1];

    let currentStreak = 0;
    let checkDate = new Date(now);

    // If we found today or yesterday, start from there; otherwise start from most recent log date
    if (startKey === todayKey || startKey === yesterdayKey) {
      checkDate = startKey === todayKey ? now : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else {
      // Find the date of the most recent log
      const mostRecentLog = selectedHabitLogs
        .filter((log) => getDateKey(log.completedAt) === startKey)
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
      checkDate = normalizeDate(mostRecentLog.completedAt);
    }

    // Count backwards
    while (true) {
      const checkKey = getDateKey(checkDate);
      if (dateKeys.includes(checkKey)) {
        currentStreak++;
        // Move to previous period
        if (selectedHabit.period === 'daily') {
          checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
          checkDate = new Date(checkDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
      } else {
        break;
      }
    }

    // Calculate best streak (longest consecutive sequence)
    let bestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < dateKeys.length; i++) {
      const prevKey = dateKeys[i - 1];
      const currentKey = dateKeys[i];

      // Parse keys to check if consecutive
      const isConsecutive = (() => {
        if (selectedHabit.period === 'daily') {
          const prevDate = new Date(prevKey);
          const currDate = new Date(currentKey);
          const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
          return diffDays === 1;
        } else {
          // For weekly, parse YYYY-WW format
          const [prevYear, prevWeek] = prevKey.split('-W').map(Number);
          const [currYear, currWeek] = currentKey.split('-W').map(Number);

          if (currYear === prevYear) {
            return currWeek === prevWeek + 1;
          } else if (currYear === prevYear + 1 && currWeek === 1) {
            // Check if previous was last week of previous year
            const prevDate = new Date(prevYear, 11, 31);
            const lastWeekOfPrevYear = getISOWeek(prevDate);
            return prevWeek === lastWeekOfPrevYear;
          }
          return false;
        }
      })();

      if (isConsecutive) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    return { current: currentStreak, best: bestStreak };
  }, [selectedHabit, selectedHabitLogs]);

  // Format chart data
  const chartData = useMemo(() => {
    return selectedHabitLogs.map((log) => ({
      date: format(log.completedAt, 'MMM d'),
      value: log.value,
    }));
  }, [selectedHabitLogs]);

  // Chart config
  const chartConfig: ChartConfig = useMemo(() => {
    return {
      value: {
        label: selectedHabit?.name || 'Value',
        color: 'var(--primary)',
      },
    };
  }, [selectedHabit]);

  // Calculate nice rounded intervals for Y axis
  const calculateNiceInterval = (min: number, max: number) => {
    const range = max - min;
    if (range === 0) return { min: min - 1, max: max + 1, step: 1 };

    // Calculate a nice step size
    const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
    const normalizedRange = range / magnitude;
    let step = magnitude;

    if (normalizedRange <= 1) step = magnitude * 0.1;
    else if (normalizedRange <= 2) step = magnitude * 0.2;
    else if (normalizedRange <= 5) step = magnitude * 0.5;
    else step = magnitude;

    // Round min down and max up to nice values
    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;

    return { min: niceMin, max: niceMax, step };
  };

  // Calculate Y axis domain and ticks
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    if (selectedHabitLogs.length === 0) {
      return { yAxisDomain: ['auto', 'auto'], yAxisTicks: [] };
    }
    const values = selectedHabitLogs.map((log) => log.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const { min: niceMin, max: niceMax, step } = calculateNiceInterval(min, max);

    // Generate tick values
    const ticks: number[] = [];
    for (let value = niceMin; value <= niceMax; value += step) {
      ticks.push(value);
    }

    return { yAxisDomain: [niceMin, niceMax], yAxisTicks: ticks };
  }, [selectedHabitLogs]);

  const handleEditLog = (logId: string) => {
    const log = selectedHabitLogs.find((l) => l.id === logId);
    if (log) {
      setEditingLogId(logId);
      setEditingLogValue(log.value.toString());
    }
  };

  const handleSaveLog = async (logId: string) => {
    const value = parseFloat(editingLogValue);
    if (!isNaN(value) && value > 0) {
      setHabitLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, value } : log))
      );
      setEditingLogId(null);
      setEditingLogValue('');
    }
  };

  const handleCancelEditLog = () => {
    setEditingLogId(null);
    setEditingLogValue('');
  };

  const handleDeleteLog = async (logId: string) => {
    // TODO: Implement delete log for client
    console.log('Deleting log for client:', { clientId, logId });
    setHabitLogs((prev) => prev.filter((log) => log.id !== logId));
    if (editingLogId === logId) {
      setEditingLogId(null);
      setEditingLogValue('');
    }
  };

  const handleOpenAddHabit = () => {
    setIsAddHabitOpen(true);
  };

  const handleCloseAddHabit = () => {
    setIsAddHabitOpen(false);
  };

  const handleOpenLogHabit = () => {
    setIsLogHabitOpen(true);
  };

  const handleCloseLogHabit = () => {
    setIsLogHabitOpen(false);
  };

  const handleOpenEditHabit = () => {
    if (selectedHabit) {
      setIsEditHabitOpen(true);
    }
  };

  const handleCloseEditHabit = () => {
    setIsEditHabitOpen(false);
  };

  const handleSaveHabit = async (values: HabitFormValues) => {
    if (!clientId) return;

    try {
      // Create the habit
      const newHabit = await addHabit(values);

      // Assign it to this client
      await assignHabit({
        habitIds: [newHabit.id],
        clientIds: [clientId],
      });

      // Add to local state
      setHabits((prev) => [...prev, newHabit]);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to add habit:', error);
      // TODO: Show error toast
    }
  };

  const handleSaveLogHabit = async (habitId: string, value: number) => {
    // TODO: Implement save log habit for client
    console.log('Saving log habit for client:', { clientId, habitId, value });
    const newLog: HabitLog = {
      id: `log-${Date.now()}`,
      habitId,
      value,
      completedAt: new Date(),
    };
    setHabitLogs((prev) => [...prev, newLog]);
  };

  const handleSaveEditHabit = async (values: HabitFormValues) => {
    // TODO: Implement update habit for client
    console.log('Updating habit for client:', { clientId, habitId: selectedHabitId, values });
    if (selectedHabitId) {
      setHabits((prev) =>
        prev.map((habit) =>
          habit.id === selectedHabitId
            ? { ...habit, ...values, id: habit.id, createdAt: habit.createdAt }
            : habit
        )
      );
    }
    handleCloseEditHabit();
  };

  const handleDeleteHabit = async () => {
    if (!clientId || !selectedHabitId) return;

    try {
      await deleteClientHabits({
        habitIds: [selectedHabitId],
        clientId: clientId,
      });

      setHabits((prev) => prev.filter((h) => h.id !== selectedHabitId));
      setSelectedHabitId(null);
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const getAimText = (habit: Habit): string => {
    const unitLabel = t(`habits.form.units.${habit.unit as any}`);
    const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
    return `${habit.amount} ${unitLabel} / ${periodText}`;
  };

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="flex h-full w-full flex-1 min-h-0">
        {/* Left sidebar navigation */}
        <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
          <div className="w-full relative flex-shrink-0">
            <div className="px-3 py-3 flex items-center">
              <div className="relative w-full px-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t('habits.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn('pl-9 w-full', searchQuery && 'pr-9')}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Habits list */}
            <div className="space-y-0 flex-1 overflow-y-auto">
              {filteredHabits.map((habit, index) => {
                const isSelected = selectedHabitId === habit.id;
                const isLast = index === filteredHabits.length - 1;

                return (
                  <React.Fragment key={habit.id}>
                    <button
                      onClick={() => setSelectedHabitId(habit.id)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-sm transition-colors text-left',
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="text-sm font-medium">{habit.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getAimText(habit)} {habit.description && `• ${habit.description}`}
                        </span>
                      </div>
                    </button>
                    {!isLast && <Separator className="w-full" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="w-full relative flex-shrink-0">
            <div className="px-3 py-3 flex items-center justify-end">
              <ButtonGroup>
                <Button
                  variant="outline"
                  onClick={handleOpenLogHabit}
                  className="gap-2 rounded-r-none border-r-0"
                >
                  <FileText className="size-4" />
                  <span>{t('habits.logHabit')}</span>
                </Button>
                <Button onClick={handleOpenAddHabit} className="gap-2 rounded-l-none">
                  <Plus className="size-4" />
                  <span>{t('habits.addHabit')}</span>
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0 z-[10]" />
          </div>
          {/* Content area */}
          <div className="flex-1 overflow-auto p-4 relative flex flex-col gap-6">
            {selectedHabit ? (
              <>
                {/* Top row with filter, average, movement, and edit button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue>
                          {getFilterLabel(timeFilter)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-week">{t('habits.timeFilter.lastWeek')}</SelectItem>
                        <SelectItem value="last-2-weeks">{t('habits.timeFilter.last2Weeks')}</SelectItem>
                        <SelectItem value="last-month">{t('habits.timeFilter.lastMonth')}</SelectItem>
                        <SelectItem value="last-3-months">{t('habits.timeFilter.last3Months')}</SelectItem>
                        <SelectItem value="last-6-months">{t('habits.timeFilter.last6Months')}</SelectItem>
                        <SelectItem value="last-year">{t('habits.timeFilter.lastYear')}</SelectItem>
                        <SelectItem value="all-time">{t('habits.timeFilter.allTime')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {averageValue !== null && (
                      <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                        Average: {averageValue.toFixed(1)} {t(`habits.form.units.${selectedHabit.unit as any}`)}
                      </div>
                    )}
                    <div
                      className={cn(
                        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default',
                        movement?.percentage === 0 || movement === null
                          ? 'text-foreground'
                          : movement.isUp
                            ? 'text-green-600'
                            : 'text-red-600'
                      )}
                    >
                      {movement?.isUp === true && movement.percentage !== 0 && <ArrowUp className="size-4" />}
                      {movement?.isUp === false && movement.percentage !== 0 && <ArrowDown className="size-4" />}
                      {movement !== null ? `${movement.percentage.toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                  <Button onClick={handleOpenEditHabit} className="gap-2" variant="outline">
                    <Edit className="size-4" />
                    <span>{t('habits.editHabitTitle')}</span>
                  </Button>
                </div>

                {/* Second row with completion rate and streaks */}
                <div className="flex items-center gap-4">
                  {completionRate !== null && (
                    <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                      Completion: {completionRate.toFixed(1)}%
                    </div>
                  )}
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                    <Flame className="size-4 text-primary" />
                    <span>
                      {t('habits.streak.current')}: {streak.current} {selectedHabit.period === 'daily' ? t('habits.streak.days') : t('habits.streak.weeks')}
                    </span>
                  </div>
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                    <Flame className="size-4 text-primary" />
                    <span>
                      {t('habits.streak.longest')}: {streak.best} {selectedHabit.period === 'daily' ? t('habits.streak.days') : t('habits.streak.weeks')}
                    </span>
                  </div>
                </div>

                {/* Line Chart */}
                <div className="w-full border rounded-lg p-4 bg-background relative z-0">
                  {chartData.length > 0 ? (
                    <ChartContainer
                      config={chartConfig}
                      className="w-full h-[300px]"
                    >
                      <LineChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                          left: 12,
                          right: 12,
                          top: 12,
                          bottom: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          domain={yAxisDomain}
                          ticks={yAxisTicks.length > 0 ? yAxisTicks : undefined}
                          tickFormatter={(value) => value.toFixed(1)}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Line
                          dataKey="value"
                          type="natural"
                          stroke="var(--color-value)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-sm text-muted-foreground text-center">
                        {t('habits.noLogsMessage')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logs DataGrid */}
                <div className="w-full habit-logs-no-scroll">
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                    .habit-logs-no-scroll div[class*="overflow-auto"],
                    .habit-logs-no-scroll div[class*="overflow-hidden"] {
                      overflow: visible !important;
                      height: auto !important;
                      max-height: none !important;
                    }
                    .habit-logs-no-scroll div[class*="min-h-0"] {
                      min-height: auto !important;
                    }
                    .habit-logs-no-scroll div[class*="flex-1"]:has(div[class*="overflow-auto"]),
                    .habit-logs-no-scroll div[class*="flex-1"]:has(div[class*="overflow-hidden"]) {
                      flex: none !important;
                    }
                  `,
                    }}
                  />
                  <DataGrid
                    data={selectedHabitLogs}
                    columns={[
                      {
                        id: 'date',
                        label: 'Date',
                        sortable: true,
                        width: { class: 'w-[200px]', pixel: '200px' },
                        getSortValue: (row) => row.completedAt.getTime(),
                        renderCell: (row) => (
                          <div className="flex items-center w-full">
                            <span className="text-sm text-foreground">
                              {format(row.completedAt, 'd MMM, yy')}
                            </span>
                          </div>
                        ),
                      },
                      {
                        id: 'value',
                        label: 'Log',
                        sortable: true,
                        width: { class: 'w-full', pixel: '100%' },
                        getSortValue: (row) => row.value,
                        renderCell: (row) => {
                          if (editingLogId === row.id) {
                            return (
                              <div className="flex items-center gap-2 w-full" data-no-row-link="true">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLog(row.id);
                                  }}
                                  aria-label="Delete log"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                                <Input
                                  type="number"
                                  value={editingLogValue}
                                  onChange={(e) => setEditingLogValue(e.target.value)}
                                  className="flex-1 h-8"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveLog(row.id);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelEditLog();
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  size="icon"
                                  variant="default"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveLog(row.id);
                                  }}
                                  aria-label="Save log"
                                >
                                  <Check className="size-4" />
                                </Button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center justify-between w-full" data-no-row-link="true">
                              <span className="text-sm text-foreground">
                                {row.value} <span className="text-muted-foreground">{t(`habits.form.units.${selectedHabit.unit as any}`)}</span>
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditLog(row.id);
                                }}
                                aria-label="Edit log"
                              >
                                <Edit className="size-4" />
                              </Button>
                            </div>
                          );
                        },
                      },
                    ]}
                    getRowId={(row) => row.id}
                    gridKey={`habit-logs-${selectedHabitId}`}
                    enableSearch={false}
                    showPagination={false}
                    gridPadding={false}
                    emptyMessage={t('habits.noLogsMessage')}
                    onRowClick={(row, e) => {
                      // Prevent row click when clicking edit button
                      if ((e.target as HTMLElement).closest('[data-no-row-link="true"]')) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t('habits.selectHabitMessage')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <LogHabitSidePanel
        open={isLogHabitOpen}
        onOpenChange={setIsLogHabitOpen}
        habits={habits}
        onSave={handleSaveLogHabit}
      />

      <AddHabitSidePanel
        open={isAddHabitOpen}
        onOpenChange={setIsAddHabitOpen}
        onSave={handleSaveHabit}
        clientName={clientName}
        clientId={clientId}
      />

      {selectedHabit && (
        <EditHabitSidePanel
          open={isEditHabitOpen}
          onOpenChange={setIsEditHabitOpen}
          habit={selectedHabit}
          onSave={handleSaveEditHabit}
          onDelete={handleDeleteHabit}
        />
      )}
    </div>
  );
};

export default ClientHabitsPage;
