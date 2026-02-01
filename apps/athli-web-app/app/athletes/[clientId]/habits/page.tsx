'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Search, X, Edit, ArrowUp, ArrowDown, Check, Trash2, Flame, Trash, Loader2 } from 'lucide-react';
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
import { getAllHabits, type Habit } from '@/api/coach/coach-habit-service';
import {
  assignHabit,
  addHabit as addClientHabit,
  deleteClientHabits,
  logHabit,
  updateHabit,
  deleteHabitLog,
  updateHabitLog,
  getHabitStreaks,
  type HabitStreaks
} from '@/api/client/client-habit-service';
import { getClientHabits } from '@/api/coach/coach-client-service';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { useClientHabits } from '@/hooks/use-client-habits';
import { useClientProfileContext } from '../client-profile-context';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { toast } from 'sonner';

// Mock habits removed

type HabitLog = {
  id: string;
  habitId: string;
  value: number;
  completedAt: Date;
};

const ClientHabitsPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; contactId: string }>();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;
  const isInbox = !!params.contactId;

  const { user } = useUserProfile();
  const { habits: habitsFromContext, isLoading: isLoadingContext, refreshData } = useClientProfileContext();
  const { habits: habitsFromHook, isLoading: isLoadingHook, refetch } = useClientHabits(clientId);

  const rawData = habitsFromContext.length > 0 ? habitsFromContext : habitsFromHook;
  const isLoading = isLoadingContext || isLoadingHook;
  const clientName = '';

  const [isAddHabitOpen, setIsAddHabitOpen] = useState<boolean>(false);
  const [isLogHabitOpen, setIsLogHabitOpen] = useState<boolean>(false);
  const [isEditHabitOpen, setIsEditHabitOpen] = useState<boolean>(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedHabitIdForLog, setSelectedHabitIdForLog] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogValue, setEditingLogValue] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('all-time');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [streaks, setStreaks] = useState<HabitStreaks | null>(null);
  const [isLoadingStreaks, setIsLoadingStreaks] = useState<boolean>(false);

  const habits = useMemo(() => {
    return rawData.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      amount: item.amount,
      unit: item.unit,
      period: item.period,
      createdAt: new Date(item.created_at || Date.now()).getTime(),
      assignmentId: item.assignment_id || item.id,
      customSchedule: item.custom_schedule,
      logs: (item.logs || []).map((l: any) => ({
        id: l.id,
        habitId: item.id,
        value: typeof l.value === 'number' ? l.value : (l.status === 'completed' ? (item.amount || 1) : 0),
        status: l.status,
        completedAt: new Date(l.date)
      }))
    }));
  }, [rawData]);

  const filteredHabits = useMemo(() => {
    if (!searchQuery.trim()) {
      return habits;
    }
    const query = searchQuery.toLowerCase();
    return habits.filter(
      (habit: any) =>
        habit.name.toLowerCase().includes(query) ||
        (habit.description && habit.description.toLowerCase().includes(query)) ||
        (habit.unit && habit.unit.toLowerCase().includes(query))
    );
  }, [searchQuery, habits]);

  const selectedHabit = selectedHabitId
    ? habits.find((habit: any) => habit.id === selectedHabitId)
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
    if (!selectedHabit) return [];

    const allLogs = (selectedHabit.logs || [])
      .sort((a: any, b: any) => a.completedAt.getTime() - b.completedAt.getTime());

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

    return allLogs.filter((log: any) => log.completedAt >= cutoffDate);
  }, [selectedHabit, timeFilter]);

  // Get logs for selected habit (filtered by time)
  const selectedHabitLogs = getFilteredLogsByTime;

  // Calculate average
  const averageValue = useMemo(() => {
    if (selectedHabitLogs.length === 0) return null;
    const sum = selectedHabitLogs.reduce((acc: any, log: any) => acc + log.value, 0);
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

  // Fetch streaks from API when habit is selected
  useEffect(() => {
    const fetchStreaks = async () => {
      if (!selectedHabitId || !user?.id || !clientId) {
        setStreaks(null);
        return;
      }

      setIsLoadingStreaks(true);
      try {
        const result = await getHabitStreaks(selectedHabitId, clientId, user.id);
        setStreaks(result);
      } catch (error) {
        console.error('Error fetching streaks:', error);
        setStreaks({ longest_streak: 0, current_streak: 0 });
      } finally {
        setIsLoadingStreaks(false);
      }
    };

    fetchStreaks();
  }, [selectedHabitId, user?.id, clientId]);

  // Map API streaks to UI format
  const streak = useMemo(() => {
    if (!streaks) {
      return { current: 0, best: 0 };
    }
    return {
      current: streaks.current_streak,
      best: streaks.longest_streak
    };
  }, [streaks]);

  // Format chart data
  const chartData = useMemo(() => {
    return selectedHabitLogs.map((log: any) => ({
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
    const values = selectedHabitLogs.map((log: any) => log.value);
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
    const log = selectedHabitLogs.find((l: any) => l.id === logId);
    if (log) {
      setEditingLogId(logId);
      setEditingLogValue(log.value.toString());
    }
  };

  const handleSaveLog = async (logId: string) => {
    if (!clientId || !user?.id) return;
    const value = parseFloat(editingLogValue);
    if (!isNaN(value)) {
      try {
        await updateHabitLog({
          logId,
          status: 'completed', // Maintain completed if editing value
          value,
          clientId,
          coachId: user.id
        });
        toast.success('Log updated successfully');
        refetch();
        refreshData?.();
        setEditingLogId(null);
        setEditingLogValue('');
        // Refetch streaks after updating log
        if (selectedHabitId) {
          const result = await getHabitStreaks(selectedHabitId, clientId, user.id);
          setStreaks(result);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to update log');
      }
    }
  };

  const handleCancelEditLog = () => {
    setEditingLogId(null);
    setEditingLogValue('');
  };

  const handleDeleteLog = async (logId: string) => {
    if (!clientId || !user?.id) return;
    try {
      await deleteHabitLog(logId, clientId, user.id);
      toast.success('Log deleted successfully');
      refetch();
      refreshData?.();
      if (editingLogId === logId) {
        setEditingLogId(null);
        setEditingLogValue('');
      }
      // Refetch streaks after deleting log
      if (selectedHabitId) {
        const result = await getHabitStreaks(selectedHabitId, clientId, user.id);
        setStreaks(result);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete log');
    }
  };

  const handleOpenAddHabit = () => {
    setIsAddHabitOpen(true);
  };

  const handleCloseAddHabit = () => {
    setIsAddHabitOpen(false);
  };

  const handleOpenLogHabit = () => {
    setSelectedHabitIdForLog(null);
    setIsLogHabitOpen(true);
  };

  const handleCloseLogHabit = () => {
    setSelectedHabitIdForLog(null);
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

  const handleSaveHabit = async (values: HabitFormValues, existingHabitId?: string) => {
    if (!clientId || !user?.id) return;

    try {
      let habitId = existingHabitId;

      if (!habitId) {
        // Create new private habit
        await addClientHabit({
          ...values,
          clientId,
          coachId: user.id
        });
      } else {
        // Assign existing habit
        await assignHabit({
          habitIds: [habitId],
          clientId,
          coachId: user.id
        });
      }

      toast.success('Habit saved successfully');
      refetch();
      refreshData?.();
      handleCloseAddHabit();
    } catch (error) {
      console.error('Failed to add habit:', error);
      toast.error('Failed to save habit');
    }
  };

  const handleSaveLogHabit = async (assignmentId: string, value: number, date: Date) => {
    if (!user?.id) return;
    try {
      await logHabit({
        assignmentId,
        status: 'completed',
        value,
        date,
        clientId,
        coachId: user.id
      });
      toast.success('Habit logged successfully');
      refetch();
      refreshData?.();
      handleCloseLogHabit(); // Close modal
      // Refetch streaks after logging habit
      if (selectedHabitId) {
        const result = await getHabitStreaks(selectedHabitId, clientId, user.id);
        setStreaks(result);
      }
    } catch (error) {
      console.error('Failed to log habit:', error);
      toast.error('Failed to log habit');
    }
  };

  const handleSaveEditHabit = async (values: HabitFormValues) => {
    if (!clientId || !user?.id || !selectedHabitId) return;
    try {
      await updateHabit({
        assignmentId: selectedHabitId,
        name: values.name,
        description: values.description,
        period: values.period,
        custom_schedule: (values as any).customSchedule,
        clientId,
        coachId: user.id
      });
      toast.success('Habit updated successfully');
      refetch();
      refreshData?.();
      handleCloseEditHabit();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update habit');
    }
  };

  const handleDeleteHabit = async () => {
    if (!clientId || !selectedHabitId || !user?.id) return;

    try {
      await deleteClientHabits({
        habitIds: [selectedHabitId],
        clientId: clientId,
        coachId: user.id
      });

      toast.success('Habit deleted successfully');
      refetch();
      refreshData?.();
      setSelectedHabitId(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete habit:', error);
      toast.error('Failed to delete habit');
    }
  };

  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const getAimText = (habit: Habit): string => {
    const unitKey = habit.unit || 'times'; // Default to 'times' if unit is undefined
    const unitLabel = t(`habits.form.units.${unitKey}` as any);
    const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
    return `${habit.amount || 0} ${unitLabel} / ${periodText}`;
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <EmptyGridState
          title="No habits assigned"
          subtitle="This client hasn't been assigned any habits yet."
          action={
            <Button onClick={handleOpenAddHabit} className="gap-2">
              <Plus className="size-4" />
              <span>Assign Habit</span>
            </Button>
          }
        />
        <AddHabitSidePanel
          open={isAddHabitOpen}
          onOpenChange={setIsAddHabitOpen}
          onSave={handleSaveHabit}
          clientId={clientId}
          clientName={clientName}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="flex h-full w-full flex-1 min-h-0">
        {/* Left sidebar navigation */}
        <div className={cn(isInbox ? "w-60" : "w-80", "border-r bg-background flex-shrink-0 flex flex-col")}>
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
              {filteredHabits.length === 0 ? (
                <div className="flex items-center justify-center py-8 px-4">
                  <span className="text-sm text-muted-foreground">No habits found</span>
                </div>
              ) : (
                filteredHabits.map((habit: any, index: number) => {
                  const isSelected = selectedHabitId === habit.id;
                  const isLast = index === filteredHabits.length - 1;
                  const isOnlyItem = filteredHabits.length === 1;

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
                      <Separator className="w-full" />
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="w-full relative flex-shrink-0 bg-background border-t">
            <div className="px-3 py-[11.5px] flex items-center justify-end">
              <ButtonGroup>
                <Button
                  variant="outline"
                  onClick={handleOpenLogHabit}
                  className="gap-2 rounded-r-none border-r-0"
                >
                  <FileText className="size-4" />
                  <span>Log a Habit</span>
                </Button>
                <Button onClick={handleOpenAddHabit} className="gap-2 rounded-l-none">
                  <Plus className="size-4" />
                  <span>Assign Habit</span>
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0 z-[10]" />
          </div>
          {/* Content area */}
          <div className="flex-1 overflow-auto p-4 relative flex flex-col gap-6">
            {selectedHabit ? (
              <>
                {/* Top row with filter and action buttons */}
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
                  </div>
                  <ButtonGroup>
                    <Button onClick={() => {
                      setSelectedHabitIdForLog(selectedHabitId);
                      setIsLogHabitOpen(true);
                    }} className="gap-2" variant="outline">
                      <FileText className="size-4" />
                      <span>Enter a Log</span>
                    </Button>
                    <Button onClick={handleOpenEditHabit} className="gap-2" variant="outline">
                      <Edit className="size-4" />
                      <span>{t('habits.editHabitTitle')}</span>
                    </Button>
                    <Button onClick={handleOpenDeleteDialog} className="gap-2" variant="outline">
                      <Trash className="size-4" />
                    </Button>
                  </ButtonGroup>
                </div>

                {/* Second row with stats: average, movement, completion rate, and streaks */}
                <div className="flex items-center gap-4">
                  {averageValue !== null && (
                    <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                      Average: {averageValue.toFixed(1)} {t(`habits.form.units.${selectedHabit.unit || 'times'}` as any)}
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
                  {completionRate !== null && (
                    <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                      Completion: {completionRate.toFixed(1)}%
                    </div>
                  )}
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                    <Flame className="size-4 text-primary" />
                    <span>
                      {t('habits.streak.current')}: {isLoadingStreaks ? <Loader2 className="size-3 animate-spin inline-block ml-1" /> : `${streak.current} ${streak.current === 1 ? 'day' : 'days'}`}
                    </span>
                  </div>
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                    <Flame className="size-4 text-primary" />
                    <span>
                      {t('habits.streak.longest')}: {isLoadingStreaks ? <Loader2 className="size-3 animate-spin inline-block ml-1" /> : `${streak.best} ${streak.best === 1 ? 'day' : 'days'}`}
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
                          type="monotoneX"
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
                <div className="w-full">
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
                                {row.value}
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
                    emptyState={
                      <div className="flex items-center justify-center min-h-[150px] text-sm text-muted-foreground">
                        {t('habits.noLogsMessage')}
                      </div>
                    }
                    onRowClick={(row, e) => {
                      // Prevent row click when clicking edit button
                      if ((e.target as HTMLElement).closest('[data-no-row-link="true"]')) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    alwaysShowHeaders={true}
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
        onOpenChange={(open) => {
          if (!open) handleCloseLogHabit();
          setIsLogHabitOpen(open);
        }}
        habits={habits}
        onSave={handleSaveLogHabit}
        preselectedHabitId={selectedHabitIdForLog || undefined}
        clientId={clientId}
        coachId={user?.id || ''}
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
          onDelete={async () => {
            setIsEditHabitOpen(false);
            setIsDeleteDialogOpen(true);
          }}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteHabit}
        itemName={selectedHabit?.name}
        itemType="habit"
        variant="default"
      />
    </div>
  );
};

export default ClientHabitsPage;
