'use client';

import React, { useState, useMemo } from 'react';
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
import { EditMetricSidePanel } from '@/components/metrics/edit-metric-side-panel';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { mockAthletes } from '@/components/app/app-shell';

type Metric = {
  id: string;
  name: string;
  unit: string;
  description?: string;
};

type MetricLog = {
  id: string;
  metricId: string;
  value: number;
  loggedAt: Date;
};

// Mock metrics data
const mockMetrics: Metric[] = [
  {
    id: 'metric-1',
    name: 'Body Fat',
    unit: '%',
    description: 'Percentage of body weight that is fat tissue',
  },
  {
    id: 'metric-2',
    name: 'Bicep',
    unit: 'cm',
    description: 'Circumference measurement of the bicep muscle',
  },
  {
    id: 'metric-3',
    name: 'Body Mass',
    unit: 'kg',
    description: 'Total body mass',
  },
  {
    id: 'metric-4',
    name: 'Muscle Mass',
    unit: 'kg',
    description: 'Total muscle mass',
  },
];

const ClientMetricsPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const athlete = mockAthletes.find((item) => item.id === clientId);
  const clientName = athlete?.name || 'this client';
  const [isAddMetricOpen, setIsAddMetricOpen] = useState<boolean>(false);
  const [isLogMetricOpen, setIsLogMetricOpen] = useState<boolean>(false);
  const [isEditMetricOpen, setIsEditMetricOpen] = useState<boolean>(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogValue, setEditingLogValue] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('all-time');

  // Mock log data
  const [metricLogs, setMetricLogs] = useState<MetricLog[]>([
    { id: 'log-1', metricId: 'metric-1', value: 15.5, loggedAt: new Date(2024, 11, 20) },
    { id: 'log-2', metricId: 'metric-1', value: 16.2, loggedAt: new Date(2024, 11, 25) },
    { id: 'log-3', metricId: 'metric-1', value: 15.8, loggedAt: new Date(2024, 11, 30) },
    { id: 'log-4', metricId: 'metric-1', value: 16.5, loggedAt: new Date(2025, 0, 5) },
    { id: 'log-5', metricId: 'metric-1', value: 16.0, loggedAt: new Date(2025, 0, 10) },
    { id: 'log-6', metricId: 'metric-1', value: 15.3, loggedAt: new Date(2025, 0, 15) },
    { id: 'log-7', metricId: 'metric-1', value: 15.9, loggedAt: new Date(2025, 0, 20) },
  ]);

  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) {
      return mockMetrics;
    }
    const query = searchQuery.toLowerCase();
    return mockMetrics.filter(
      (metric) =>
        metric.name.toLowerCase().includes(query) ||
        metric.unit.toLowerCase().includes(query) ||
        metric.description?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const selectedMetric = selectedMetricId
    ? mockMetrics.find((metric) => metric.id === selectedMetricId)
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
    if (!selectedMetricId) return [];
    
    const allLogs = metricLogs
      .filter((log) => log.metricId === selectedMetricId)
      .sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());

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

    return allLogs.filter((log) => log.loggedAt >= cutoffDate);
  }, [selectedMetricId, metricLogs, timeFilter]);

  // Get logs for selected metric (filtered by time)
  const selectedMetricLogs = getFilteredLogsByTime;

  // Calculate average
  const averageValue = useMemo(() => {
    if (selectedMetricLogs.length === 0) return null;
    const sum = selectedMetricLogs.reduce((acc, log) => acc + log.value, 0);
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
    return selectedMetricLogs.map((log) => ({
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
    const values = selectedMetricLogs.map((log) => log.value);
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
    const log = selectedMetricLogs.find((l) => l.id === logId);
    if (log) {
      setEditingLogId(logId);
      setEditingLogValue(log.value.toString());
    }
  };

  const handleSaveLog = async (logId: string) => {
    const value = parseFloat(editingLogValue);
    if (!isNaN(value) && value > 0) {
      setMetricLogs((prev) =>
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
    setMetricLogs((prev) => prev.filter((log) => log.id !== logId));
    if (editingLogId === logId) {
      setEditingLogId(null);
      setEditingLogValue('');
    }
  };

  const handleOpenAddMetric = () => {
    setIsAddMetricOpen(true);
  };

  const handleCloseAddMetric = () => {
    setIsAddMetricOpen(false);
  };

  const handleOpenLogMetric = () => {
    setIsLogMetricOpen(true);
  };

  const handleCloseLogMetric = () => {
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

  const handleSaveMetric = async (name: string, unit: string, description?: string) => {
    // TODO: Implement save metric for client
    console.log('Saving metric for client:', { clientId, name, unit, description });
    handleCloseAddMetric();
  };

  const handleSaveLogMetric = async (metricId: string, value: number) => {
    // TODO: Implement save log metric for client
    console.log('Saving log metric for client:', { clientId, metricId, value });
  };

  const handleSaveEditMetric = async (name: string, unit: string, description?: string) => {
    // TODO: Implement update metric for client
    console.log('Updating metric for client:', { clientId, metricId: selectedMetricId, name, unit, description });
    handleCloseEditMetric();
  };

  const handleDeleteMetric = async (metricId: string) => {
    // TODO: Implement delete metric for client
    console.log('Deleting metric for client:', { clientId, metricId });
    if (selectedMetricId === metricId) {
      setSelectedMetricId(null);
    }
  };

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="flex h-full w-full flex-1 min-h-0">
        {/* Left sidebar navigation */}
        <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
          <div className="w-full relative flex-shrink-0">
            <div className="px-4 flex items-center mb-2 mt-2">
              <div className="relative w-full">
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
              {filteredMetrics.map((metric, index) => {
                const isSelected = selectedMetricId === metric.id;
                const isLast = index === filteredMetrics.length - 1;

                return (
                  <React.Fragment key={metric.id}>
                    <button
                      onClick={() => setSelectedMetricId(metric.id)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-sm transition-colors text-left',
                        isSelected
                          ? 'bg-accent text-accent-foreground'
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
            <div className="px-4 flex items-center justify-end mb-2 mt-2">
              <ButtonGroup>
                <Button
                  variant="outline"
                  onClick={handleOpenLogMetric}
                  className="gap-2 rounded-r-none border-r-0"
                >
                  <FileText className="size-4" />
                  <span>{t('metrics.logMetric')}</span>
                </Button>
                <Button onClick={handleOpenAddMetric} className="gap-2 rounded-l-none">
                  <Plus className="size-4" />
                  <span>{t('metrics.addMetric')}</span>
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0 z-[10]" />
          </div>
          {/* Content area */}
          <div className="flex-1 overflow-auto p-4 relative flex flex-col gap-6">
            {selectedMetric ? (
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
                        <SelectItem value="last-week">{t('metrics.timeFilter.lastWeek')}</SelectItem>
                        <SelectItem value="last-2-weeks">{t('metrics.timeFilter.last2Weeks')}</SelectItem>
                        <SelectItem value="last-month">{t('metrics.timeFilter.lastMonth')}</SelectItem>
                        <SelectItem value="last-3-months">{t('metrics.timeFilter.last3Months')}</SelectItem>
                        <SelectItem value="last-6-months">{t('metrics.timeFilter.last6Months')}</SelectItem>
                        <SelectItem value="last-year">{t('metrics.timeFilter.lastYear')}</SelectItem>
                        <SelectItem value="all-time">{t('metrics.timeFilter.allTime')}</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Button onClick={handleOpenEditMetric} className="gap-2" variant="outline">
                    <Edit className="size-4" />
                    <span>{t('metrics.editMetricTitle')}</span>
                  </Button>
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
                        {t('metrics.noLogsMessage')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logs DataGrid */}
                <div className="w-full metric-logs-no-scroll">
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                    .metric-logs-no-scroll div[class*="overflow-auto"],
                    .metric-logs-no-scroll div[class*="overflow-hidden"] {
                      overflow: visible !important;
                      height: auto !important;
                      max-height: none !important;
                    }
                    .metric-logs-no-scroll div[class*="min-h-0"] {
                      min-height: auto !important;
                    }
                    .metric-logs-no-scroll div[class*="flex-1"]:has(div[class*="overflow-auto"]),
                    .metric-logs-no-scroll div[class*="flex-1"]:has(div[class*="overflow-hidden"]) {
                      flex: none !important;
                    }
                  `,
                    }}
                  />
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
                                  {row.value} <span className="text-muted-foreground">{selectedMetric.unit}</span>
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
                      emptyMessage={t('metrics.noLogsMessage')}
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
                <p>Select a metric to view</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <LogMetricSidePanel
        open={isLogMetricOpen}
        onOpenChange={setIsLogMetricOpen}
        metrics={mockMetrics}
        onSave={handleSaveLogMetric}
      />

      <AddMetricSidePanel
        open={isAddMetricOpen}
        onOpenChange={setIsAddMetricOpen}
        onSave={handleSaveMetric}
        clientName={clientName}
        clientId={clientId}
      />

      {selectedMetric && (
        <EditMetricSidePanel
          open={isEditMetricOpen}
          onOpenChange={setIsEditMetricOpen}
          metric={selectedMetric}
          onSave={handleSaveEditMetric}
          onDelete={handleDeleteMetric}
        />
      )}
    </div>
  );
};

export default ClientMetricsPage;
