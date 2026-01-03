'use client';

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X, ArrowUpDown, TrendingUp, Award, Repeat, MapPin, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/general/utils';
import type { HistoryEntry } from '@/api/client/client-training-service';

interface ExerciseHistoryChartDialogProps {
    open: boolean;
    onClose: () => void;
    exerciseName: string;
    exerciseType: string;
    history: HistoryEntry[];
}

const extractValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val !== null) {
        return Number(val.completed ?? val.prescribed ?? 0);
    }
    return Number(val ?? 0);
};

export const ExerciseHistoryChartDialog = ({
    open,
    onClose,
    exerciseName,
    exerciseType,
    history
}: ExerciseHistoryChartDialogProps) => {
    const [sortAsc, setSortAsc] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState<'primary' | 'secondary'>('primary');

    // Determine metrics config
    const metrics = useMemo(() => {
        if (exerciseType === 'weight_reps') {
            return { primary: 'Weight', secondary: 'Reps', showToggle: true };
        } else if (exerciseType === 'distance_duration') {
            return { primary: 'Distance', secondary: 'Duration', showToggle: true };
        } else if (exerciseType === 'reps') {
            return { primary: 'Reps', secondary: null, showToggle: false };
        }
        return { primary: 'Weight', secondary: 'Reps', showToggle: true };
    }, [exerciseType]);

    // Group history
    const groupedHistory = useMemo(() => {
        const groups: Map<string, any> = new Map();
        history.forEach((entry) => {
            const key = `${entry.date}-${entry.workout_id}`;
            if (!groups.has(key)) {
                groups.set(key, { ...entry, exercises: [] }); // Store basic entry info
            }
            groups.get(key)!.exercises.push(entry);
        });

        // Use the values and map nicely
        const result = Array.from(groups.values()).map(group => ({
            date: group.date,
            workoutName: group.workout_name,
            workoutId: group.workout_id,
            exercises: group.exercises
        }));

        return result.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortAsc ? dateA - dateB : dateB - dateA;
        });
    }, [history, sortAsc]);

    // Chart Data
    const chartData = useMemo(() => {
        const dataPoints: { date: string; value: number; timestamp: number }[] = [];
        history.forEach((entry) => {
            const sets = entry.exercise_data?.sets || [];
            sets.forEach((set) => {
                let value = 0;
                // Logic for selected metric
                if (selectedMetric === 'primary') {
                    if (exerciseType === 'weight_reps') value = extractValue(set.weight);
                    else if (exerciseType === 'distance_duration') value = extractValue(set.distance);
                    else if (exerciseType === 'reps') value = extractValue(set.reps);
                } else {
                    if (exerciseType === 'weight_reps') value = extractValue(set.reps);
                    else if (exerciseType === 'distance_duration') value = extractValue(set.duration);
                }

                if (value > 0) {
                    dataPoints.push({
                        date: format(new Date(entry.date), 'MMM d'),
                        value,
                        timestamp: new Date(entry.date).getTime()
                    });
                }
            });
        });
        return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
    }, [history, selectedMetric, exerciseType]);

    const chartConfig: ChartConfig = {
        value: {
            label: selectedMetric === 'primary' ? metrics.primary : metrics.secondary || 'Value',
            color: 'var(--primary)',
        },
    };

    // Calculate Y Axis
    const { yAxisDomain, yAxisTicks } = useMemo(() => {
        if (chartData.length === 0) return { yAxisDomain: ['auto', 'auto'], yAxisTicks: [] };
        const values = chartData.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        if (range === 0) return { yAxisDomain: [Math.max(0, min - 10), max + 10], yAxisTicks: [min] };

        // Nice ticks calculation
        const roughStep = range / 5;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const normalizedStep = roughStep / magnitude;
        let step = magnitude;
        if (normalizedStep < 1.5) step *= 1;
        else if (normalizedStep < 3) step *= 2;
        else if (normalizedStep < 7) step *= 5;
        else step *= 10;

        const niceMin = Math.floor(min / step) * step;
        const niceMax = Math.ceil(max / step) * step;
        const ticks = [];
        for (let v = niceMin; v <= niceMax; v += step) ticks.push(v);

        return { yAxisDomain: [niceMin, niceMax], yAxisTicks: ticks };
    }, [chartData]);


    const formatSetValue = (set: any): string => {
        const weight = extractValue(set.weight);
        const reps = extractValue(set.reps);
        const distance = extractValue(set.distance);
        const duration = extractValue(set.duration);
        const leftReps = extractValue(set.leftReps);
        const rightReps = extractValue(set.rightReps);

        if (leftReps > 0 || rightReps > 0) {
            const repsStr = `L: ${leftReps} | R: ${rightReps}`;
            if (weight > 0) return `${weight}kg × ${repsStr}`;
            return repsStr;
        }

        if (weight > 0 && reps > 0) return `${weight}kg × ${reps}`;
        if (reps > 0) return `${reps} reps`;
        if (distance > 0 && duration > 0) return `${distance}m × ${duration}s`;
        if (distance > 0) return `${distance}m`;
        if (duration > 0) return `${duration}s`;
        return '-';
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent
                className="max-w-[95vw] w-fit h-[80vh] p-0 gap-3 overflow-visible flex items-stretch justify-center mx-auto bg-transparent border-0 shadow-none outline-none"
                onOpenAutoFocus={(e) => e.preventDefault()}
                showCloseButton={false}
                style={{
                    '--sidebar': 'color-mix(in srgb, var(--primary), var(--sidebar-mix-base) 35%)',
                    '--sidebar-foreground': 'var(--primary-foreground)',
                } as React.CSSProperties}
            >
                <DialogTitle className="sr-only">Exercise Analysis</DialogTitle>

                {/* Left Panel: Chart */}
                <div className="w-[calc(55vw-11rem)] h-full shrink-0 bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                    {/* Header */}
                    <div className="px-6 py-3 shrink-0 bg-sidebar border-b border-sidebar-foreground/10 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-sidebar-foreground">
                            {exerciseName}
                        </h3>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 text-sidebar-foreground transition-all duration-200 flex items-center justify-center group/close"
                                >
                                    <X className="size-4 transition-transform group-hover/close:scale-110" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Close chart view</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Toggle */}
                    {metrics.showToggle && metrics.secondary && (
                        <Tabs
                            value={selectedMetric}
                            onValueChange={(value) => setSelectedMetric(value as 'primary' | 'secondary')}
                            className="px-4 py-3 shrink-0"
                        >
                            <TabsList className="w-full bg-muted">
                                <TabsTrigger
                                    value="primary"
                                    className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                                >
                                    {metrics.primary}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="secondary"
                                    className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                                >
                                    {metrics.secondary}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}

                    {/* Chart Area */}
                    <div className="flex-1 min-h-0 relative p-0 bg-background">
                        {chartData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="w-full h-full p-4 -ml-4">
                                <LineChart
                                    accessibilityLayer
                                    data={chartData}
                                    margin={{ left: 10, right: 10, top: 20, bottom: 20 }}
                                >
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={12}
                                        interval="preserveStartEnd"
                                        tick={{ fill: 'currentColor', fontSize: 11 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={12}
                                        domain={yAxisDomain}
                                        ticks={yAxisTicks}
                                        tickFormatter={(value) => value.toFixed(0)}
                                        tick={{ fill: 'currentColor', fontSize: 11 }}
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
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                No chart data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: History Log */}
                <div className="w-[400px] h-full shrink-0 bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-3 shrink-0 bg-sidebar border-b border-sidebar-foreground/10 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-sidebar-foreground">
                            History Log
                        </h3>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-muted/20 bg-background">
                            <span className="text-[11px] font-bold text-muted-foreground">
                                {groupedHistory.length} record{groupedHistory.length !== 1 ? 's' : ''}
                            </span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setSortAsc(!sortAsc)}
                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <ArrowUpDown className="size-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{sortAsc ? 'Show newest first' : 'Show oldest first'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 pt-2">
                            {groupedHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                    <span className="text-sm">No history found</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {groupedHistory.map((group) => (
                                        <div key={`${group.date}-${group.workoutId}`} className="flex flex-col gap-1">
                                            <div className="p-2 rounded-md bg-card border border-border/60 shadow-sm flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground">
                                                    {format(new Date(group.date), 'MMM d, yyyy')}
                                                </span>
                                                <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                                                    {group.workoutName}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 pl-4 pr-1 mt-1">
                                                {group.exercises.map((entry: any, j: number) => (
                                                    <React.Fragment key={j}>
                                                        {j > 0 && <div className="h-px bg-border/40 my-1.5 mx-2" />}
                                                        <div className="flex flex-col gap-0.5">
                                                            {(entry.exercise_data?.sets || []).map((set: any, si: number) => (
                                                                <div key={si} className="flex items-center gap-2 text-xs py-0.5 px-2 hover:bg-muted/30 rounded-sm">
                                                                    <span className="text-muted-foreground font-normal w-4 shrink-0">{si + 1}.</span>
                                                                    <span className="font-normal text-foreground tabular-nums">
                                                                        {formatSetValue(set)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
