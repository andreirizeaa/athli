'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, FileText, Search, X, Edit, ArrowUp, ArrowDown, Check, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/general/utils';
import { AddMetricSidePanel } from '@/components/metrics/add-metric-side-panel';
import { LogMetricSidePanel } from '@/components/metrics/log-metric-side-panel';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useClientProfileContext } from '../client-profile-context';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { getAllMetrics } from '@/api/coach/coach-metric-service';
import {
  assignMetric,
  addMetric as addClientMetric,
  removeMetric,
  logMetric,
  updateMetric,
  deleteMetricLog,
  updateMetricLog
} from '@/api/client/client-metric-service';
import { useClientMetrics } from '@/hooks/use-client-metrics';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { toast } from 'sonner';

type Metric = {
  id: string;
  name: string;
  unit: string;
  description?: string;
  metricId?: string;
  assignmentId?: string;
};

type MetricLog = {
  id: string;
  metricId: string;
  value: number;
  loggedAt: Date;
};

const ClientMetricsPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; contactId: string }>();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;
  const isInbox = !!params.contactId;

  const { user } = useUserProfile();
  const { metrics: rawMetrics, isLoading: isLoadingContext, refreshData } = useClientProfileContext();
  const { metrics: metricsFromHook, isLoading: isLoadingHook, refetch } = useClientMetrics(clientId);

  const rawData = rawMetrics.length > 0 ? rawMetrics : metricsFromHook;
  const isLoading = isLoadingContext || isLoadingHook;

  const [isAddMetricOpen, setIsAddMetricOpen] = useState<boolean>(false);
  const [isLogMetricOpen, setIsLogMetricOpen] = useState<boolean>(false);
  const [isEditMetricOpen, setIsEditMetricOpen] = useState<boolean>(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [selectedMetricIdForLog, setSelectedMetricIdForLog] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogValue, setEditingLogValue] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('all-time');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const metrics = useMemo(() => {
    return rawData.map((item: any) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      description: item.description,
      metricId: item.id,
      assignmentId: item.assignment_id || item.id,
      logs: (item.logs || []).map((log: any) => ({
        id: log.id,
        metricId: item.id,
        value: log.value,
        loggedAt: new Date(log.date)
      }))
    }));
  }, [rawData]);

  const clientName = '';

  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) {
      return metrics;
    }
    const query = searchQuery.toLowerCase();
    return metrics.filter(
      (metric: any) =>
        metric.name.toLowerCase().includes(query) ||
        metric.unit.toLowerCase().includes(query) ||
        (metric.description && metric.description.toLowerCase().includes(query))
    );
  }, [searchQuery, metrics]);

  const selectedMetric = selectedMetricId
    ? metrics.find((metric: any) => metric.id === selectedMetricId)
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
    return t(`metrics.timeFilter.${filterMap[filterValue] || 'allTime'}`);
  };

  // Filter logs by time period
  const getFilteredLogsByTime = useMemo(() => {
    if (!selectedMetric) return [];

    const allLogs = (selectedMetric.logs || [])
      .sort((a: any, b: any) => a.loggedAt.getTime() - b.loggedAt.getTime());

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

    return allLogs.filter((log: any) => log.loggedAt >= cutoffDate);
  }, [selectedMetric, timeFilter]);

  // Get logs for selected metric (filtered by time)
  const selectedMetricLogs = getFilteredLogsByTime;

  // Calculate average
  const averageValue = useMemo(() => {
    if (selectedMetricLogs.length === 0) return null;
    const sum = selectedMetricLogs.reduce((acc: any, log: any) => acc + log.value, 0);
    return sum / selectedMetricLogs.length;
  }, [selectedMetricLogs]);

  // Calculate movement (current vs first)
  const movement = useMemo(() => {
    if (selectedMetricLogs.length < 2) return null;
    const firstValue = selectedMetricLogs[0].value;
    const currentValue = selectedMetricLogs[selectedMetricLogs.length - 1].value;
    const diff = currentValue - firstValue;
    const percentage = firstValue !== 0 ? ((diff / firstValue) * 100) : 0;
    return {
      value: diff,
      percentage: Math.abs(percentage),
      isUp: diff > 0,
    };
  }, [selectedMetricLogs]);

  // Format chart data
  const chartData = useMemo(() => {
    return selectedMetricLogs.map((log: any) => ({
      date: format(log.loggedAt, 'MMM d'),
      value: log.value,
    }));
  }, [selectedMetricLogs]);

  // Chart config
  const chartConfig: ChartConfig = useMemo(() => {
    return {
      value: {
        label: selectedMetric?.name || 'Value',
        color: 'var(--primary)',
      },
    };
  }, [selectedMetric]);

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
    if (selectedMetricLogs.length === 0) {
      return { yAxisDomain: ['auto', 'auto'], yAxisTicks: [] };
    }
    const values = selectedMetricLogs.map((log: any) => log.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const { min: niceMin, max: niceMax, step } = calculateNiceInterval(min, max);

    // Generate tick values
    const ticks: number[] = [];
    for (let value = niceMin; value <= niceMax; value += step) {
      ticks.push(value);
    }

    return { yAxisDomain: [niceMin, niceMax], yAxisTicks: ticks };
  }, [selectedMetricLogs]);

  const handleEditLog = (logId: string) => {
    const log = selectedMetricLogs.find((l: any) => l.id === logId);
    if (log) {
      setEditingLogId(logId);
      setEditingLogValue(log.value.toString());
    }
  };

  const handleSaveLog = async (logId: string) => {
    if (!clientId || !user?.id) return;
    const value = parseFloat(editingLogValue);
    if (!isNaN(value)) { // removed value > 0 restriction in case 0 is valid
      try {
        await updateMetricLog({
          logId,
          value,
          clientId,
          coachId: user.id
        });
        toast.success('Log updated successfully');
        refetch();
        refreshData?.();
        setEditingLogId(null);
        setEditingLogValue('');
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
      await deleteMetricLog(logId, clientId, user.id);
      toast.success('Log deleted successfully');
      refetch();
      refreshData?.();
      if (editingLogId === logId) {
        setEditingLogId(null);
        setEditingLogValue('');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete log');
    }
  };

  const handleOpenAddMetric = () => {
    setIsAddMetricOpen(true);
  };

  const handleCloseAddMetric = () => {
    setIsAddMetricOpen(false);
  };

  const handleOpenLogMetric = () => {
    setSelectedMetricIdForLog(null);
    setIsLogMetricOpen(true);
  };

  const handleCloseLogMetric = () => {
    setSelectedMetricIdForLog(null);
    setIsLogMetricOpen(false);
  };

  const handleOpenEditMetric = () => {
    if (selectedMetric) {
      setIsEditMetricOpen(true);
    }
  };

  const handleCloseEditMetric = () => {
    setIsEditMetricOpen(false);
  };

  const handleSaveMetric = async (
    name: string,
    unit: string,
    description?: string,
    existingMetricId?: string,
    scheduleConfig?: any,
    cronExpression?: string
  ) => {
    if (!clientId || !user?.id) return;

    try {
      let metricId = existingMetricId;

      if (!metricId) {
        // Create new private metric
        await addClientMetric({
          name,
          unit,
          description,
          schedule_config: scheduleConfig,
          cron_expression: cronExpression,
          clientId,
          coachId: user.id
        });
      } else {
        // Assign existing
        await assignMetric({
          metricIds: [metricId],
          schedule_config: scheduleConfig,
          cron_expression: cronExpression,
          clientId,
          coachId: user.id
        });
      }

      toast.success('Metric saved successfully');
      // Refetch
      refetch();
      refreshData?.();
      handleCloseAddMetric();
    } catch (error) {
      console.error('Failed to save metric:', error);
      toast.error('Failed to save metric');
    }
  };

  const handleSaveLogMetric = async (metricId: string, value: number, date: Date) => {
    if (!clientId || !user?.id) return;
    try {
      await logMetric({
        assignmentId: metricId,
        value,
        date,
        clientId,
        coachId: user.id
      });
      toast.success('Metric logged successfully');
      refetch();
      refreshData?.();
      handleCloseLogMetric();
    } catch (error) {
      console.error(error);
      toast.error('Failed to log metric');
    }
  };

  const handleSaveEditMetric = async (name: string, unit: string, description?: string) => {
    if (!clientId || !user?.id || !selectedMetricId) return;
    try {
      await updateMetric({
        assignmentId: selectedMetricId,
        name,
        unit,
        description,
        clientId,
        coachId: user.id
      });
      toast.success('Metric updated successfully');
      refetch();
      refreshData?.();
      handleCloseEditMetric();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update metric');
    }
  };

  const handleDeleteMetric = async () => {
    if (!clientId || !user?.id || !selectedMetricId) return;

    try {
      await removeMetric({
        metricIds: [selectedMetricId],
        clientId,
        coachId: user.id
      });

      toast.success('Metric deleted successfully');
      refetch();
      refreshData?.();
      setSelectedMetricId(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete metric:', error);
      toast.error('Failed to delete metric');
    }
  };

  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <EmptyGridState
          title="No metrics assigned"
          subtitle="This client hasn't been assigned any metrics yet."
          action={
            <Button onClick={handleOpenAddMetric} className="gap-2">
              <Plus className="size-4" />
              <span>Assign Metric</span>
            </Button>
          }
        />
        <AddMetricSidePanel
          open={isAddMetricOpen}
          onOpenChange={setIsAddMetricOpen}
          onSave={handleSaveMetric}
          clientName={clientName}
          clientId={clientId}
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
                  placeholder={t('metrics.searchPlaceholder')}
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
            {/* Metrics list */}
            <div className="space-y-0 flex-1 overflow-y-auto">
              {filteredMetrics.length === 0 ? (
                <div className="flex items-center justify-center py-8 px-4">
                  <span className="text-sm text-muted-foreground">No metrics found</span>
                </div>
              ) : (
                filteredMetrics.map((metric: any, index: number) => {
                  const isSelected = selectedMetricId === metric.id;
                  const isLast = index === filteredMetrics.length - 1;
                  const isOnlyItem = filteredMetrics.length === 1;

                  return (
                    <React.Fragment key={metric.id}>
                      <button
                        onClick={() => setSelectedMetricId(metric.id)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-sm transition-colors text-left',
                          isSelected
                            ? 'bg-accent/50 border-l-2 border-l-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="text-sm font-medium">{metric.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {metric.unit} {metric.description && `• ${metric.description}`}
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
                  onClick={handleOpenLogMetric}
                  className="gap-2 rounded-r-none border-r-0"
                >
                  <FileText className="size-4" />
                  <span>Log a Metric</span>
                </Button>
                <Button onClick={handleOpenAddMetric} className="gap-2 rounded-l-none">
                  <Plus className="size-4" />
                  <span>Assign Metric</span>
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0 z-[10]" />
          </div>
          {/* Content area */}
          <div className="flex-1 overflow-auto p-4 relative flex flex-col gap-6">
            {selectedMetric ? (
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
                        <SelectItem value="last-week">{t('metrics.timeFilter.lastWeek')}</SelectItem>
                        <SelectItem value="last-2-weeks">{t('metrics.timeFilter.last2Weeks')}</SelectItem>
                        <SelectItem value="last-month">{t('metrics.timeFilter.lastMonth')}</SelectItem>
                        <SelectItem value="last-3-months">{t('metrics.timeFilter.last3Months')}</SelectItem>
                        <SelectItem value="last-6-months">{t('metrics.timeFilter.last6Months')}</SelectItem>
                        <SelectItem value="last-year">{t('metrics.timeFilter.lastYear')}</SelectItem>
                        <SelectItem value="all-time">{t('metrics.timeFilter.allTime')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ButtonGroup>
                    <Button onClick={() => {
                      setSelectedMetricIdForLog(selectedMetricId);
                      setIsLogMetricOpen(true);
                    }} className="gap-2" variant="outline">
                      <FileText className="size-4" />
                      <span>Enter a Log</span>
                    </Button>
                    <Button onClick={handleOpenEditMetric} className="gap-2" variant="outline">
                      <Edit className="size-4" />
                      <span>{t('metrics.editMetricTitle')}</span>
                    </Button>
                  </ButtonGroup>
                </div>

                {/* Second row with stats: average, movement */}
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-9 px-4 py-2 border bg-background shadow-xs dark:bg-input/30 dark:border-input cursor-default">
                    Average: {averageValue !== null ? `${averageValue.toFixed(1)} ${selectedMetric.unit}` : `0 ${selectedMetric.unit}`}
                  </div>
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
                        {t('metrics.noLogsMessage')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logs DataGrid */}
                <div className="w-full">
                  <DataGrid
                    data={selectedMetricLogs}
                    columns={[
                      {
                        id: 'date',
                        label: 'Date',
                        sortable: true,
                        width: { class: 'w-[200px]', pixel: '200px' },
                        getSortValue: (row) => row.loggedAt.getTime(),
                        renderCell: (row) => (
                          <div className="flex items-center w-full">
                            <span className="text-sm text-foreground">
                              {format(row.loggedAt, 'd MMM, yy')}
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
                    gridKey={`metric-logs-${selectedMetricId}`}
                    enableSearch={false}
                    showPagination={false}
                    gridPadding={false}
                    emptyState={
                      <div className="flex items-center justify-center min-h-[150px] text-sm text-muted-foreground">
                        {t('metrics.noLogsMessage')}
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
                <p>Select a metric to view</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <LogMetricSidePanel
        open={isLogMetricOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseLogMetric();
          setIsLogMetricOpen(open);
        }}
        metrics={metrics}
        onSave={handleSaveLogMetric}
        preselectedMetricId={selectedMetricIdForLog || undefined}
        clientId={clientId}
        coachId={user?.id || ''}
      />

      <AddMetricSidePanel
        open={isAddMetricOpen}
        onOpenChange={setIsAddMetricOpen}
        onSave={handleSaveMetric}
        clientName={clientName}
        clientId={clientId}
      />

      {selectedMetric && (
        <AddMetricSidePanel
          open={isEditMetricOpen}
          onOpenChange={setIsEditMetricOpen}
          metric={selectedMetric}
          onSave={handleSaveEditMetric}
          onDelete={async (_metricId) => {
            setIsEditMetricOpen(false);
            setIsDeleteDialogOpen(true);
          }}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteMetric}
        itemName={selectedMetric?.name}
        itemType="metric"
        variant="default"
      />
    </div>
  );
};

export default ClientMetricsPage;
