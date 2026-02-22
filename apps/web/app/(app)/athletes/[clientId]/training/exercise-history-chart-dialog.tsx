'use client';
import { useTranslations } from 'next-intl';

import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, ArrowUpDown, TrendingUp, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { HistoryEntry } from '@/api/client/client-training-service';

interface ExerciseHistoryChartDialogProps {
    open: boolean;
    onClose: () => void;
    exerciseName: string;
    exerciseType: string;
    history: HistoryEntry[];
}

/**
 * Parse a value that may be a range like "8-10" or "7-10-12" and return the average (rounded up),
 * or a Heart Rate Zone like "Zone 1" and return the zone number unchanged.
 * Handles any number of hyphen-separated values (e.g., "7-10", "7-10-12", etc.)
 */
const parseNumericValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val == null) return 0;
    const str = String(val).trim();
    // Check for Heart Rate Zone format like "Zone 1", "Zone 2", etc.
    // Return the zone number unchanged (no rounding needed for zones)
    const zoneMatch = str.match(/^Zone\s*(\d+)$/i);
    if (zoneMatch) {
        return parseInt(zoneMatch[1], 10);
    }
    // Check for range format like "8-10" or "7-10-12"
    // Calculate average of all parts and round up
    if (str.includes('-')) {
        const parts = str.split('-').map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
        if (parts.length >= 2) {
            const avg = parts.reduce((sum, n) => sum + n, 0) / parts.length;
            return Math.ceil(avg);
        }
    }
    return Number(str) || 0;
};

const extractValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val !== null) {
        return parseNumericValue(val.completed ?? val.prescribed ?? 0);
    }
    return parseNumericValue(val ?? 0);
};

// Format label for display (value -> nice label)
const LABEL_MAP: Record<string, string> = {
    'Optional': '(Optional)',
    'Reps': 'Reps',
    'kg': 'Kg',
    'lbs': 'Lbs',
    'km': 'Km',
    'm': 'Metres',
    'yards': 'Yards',
    'miles': 'Miles',
    'feet': 'Feet',
    'minutes': 'Minutes',
    'seconds': 'Seconds',
    'sec': 'Seconds',
    'None': 'None',
    'Tempo': 'Tempo',
    'RIR': 'RIR',
    'RPE': 'RPE',
    'Heart Rate Zone': 'HR Zone',
    'Calories': 'Calories',
    'Watts': 'Watts',
    'Pace': 'Pace',
    'Speed': 'Speed',
    'Incline': 'Incline',
    'Height': 'Height',
    'RPM': 'RPM',
};

const formatLabel = (value: string): string => {
    return LABEL_MAP[value] || value;
};

const formatCombinationLabel = (combo: string): string => {
    return combo.split(' + ').map(formatLabel).join(' & ');
};

export const ExerciseHistoryChartDialog = ({
    open,
    onClose,
    exerciseName,
    exerciseType,
    history
}: ExerciseHistoryChartDialogProps) => {
    const t = useTranslations();
    const [sortAsc, setSortAsc] = useState(false);
    const [selectedCombination, setSelectedCombination] = useState<string>('');
    const [selectedMetric, setSelectedMetric] = useState<'field1' | 'field2'>('field1');
    const [aggregationMode, setAggregationMode] = useState<'avg' | 'min' | 'max'>('avg');

    // Extract unique label combinations from history (filtering out "Optional")
    const labelCombinations = useMemo(() => {
        const combos = new Map<string, { field1: string; field2: string }>();
        history.forEach((entry) => {
            const sets = entry.exercise_data?.sets || [];
            sets.forEach((set) => {
                const label1 = set.trackableField1?.label || '';
                const label2 = set.trackableField2?.label || '';

                // Filter out "Optional" labels
                const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
                const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';

                // Create display combo (without Optional)
                const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';

                if (!combos.has(displayCombo)) {
                    combos.set(displayCombo, { field1: validLabel1, field2: validLabel2 });
                }
            });
        });
        // If no trackable fields found, check legacy fields
        if (combos.size === 0 || (combos.size === 1 && combos.has('Unknown'))) {
            // Determine from legacy fields
            let hasWeight = false, hasReps = false, hasDistance = false, hasDuration = false;
            history.forEach((entry) => {
                const sets = entry.exercise_data?.sets || [];
                sets.forEach((set) => {
                    const weight = extractValue(set.weight);
                    const reps = extractValue(set.reps);
                    const distance = extractValue(set.distance);
                    const duration = extractValue(set.duration);
                    if (weight > 0) hasWeight = true;
                    if (reps > 0) hasReps = true;
                    if (distance > 0) hasDistance = true;
                    if (duration > 0) hasDuration = true;
                });
            });
            combos.clear();
            if (hasWeight && hasReps) combos.set('kg + Reps', { field1: 'kg', field2: 'Reps' });
            else if (hasDistance && hasDuration) combos.set('m + sec', { field1: 'm', field2: 'sec' });
            else if (hasReps) combos.set('Reps', { field1: 'Reps', field2: '' });
            else if (hasWeight) combos.set('kg', { field1: 'kg', field2: '' });
            else if (hasDistance) combos.set('m', { field1: 'm', field2: '' });
            else if (hasDuration) combos.set('sec', { field1: 'sec', field2: '' });
        }
        return combos;
    }, [history]);

    // Get array of combination names for tabs
    const combinationNames = useMemo(() => Array.from(labelCombinations.keys()), [labelCombinations]);

    // Set default combination when combinations change
    useEffect(() => {
        if (combinationNames.length > 0 && !combinationNames.includes(selectedCombination)) {
            setSelectedCombination(combinationNames[0]);
        }
    }, [combinationNames, selectedCombination]);

    // Get the field labels for the selected combination
    const selectedFields = useMemo(() => {
        return labelCombinations.get(selectedCombination) || { field1: '', field2: '' };
    }, [labelCombinations, selectedCombination]);

    // Check if this is a dual-field combination
    const isDualField = selectedFields.field1 && selectedFields.field2;

    // Reset to field1 when switching to a single-field combination
    useEffect(() => {
        if (!isDualField) {
            setSelectedMetric('field1');
        }
    }, [isDualField]);

    // Get the label for Y-axis based on selected metric (formatted for display)
    const yAxisLabel = useMemo(() => {
        if (isDualField) {
            const value = selectedMetric === 'field1' ? selectedFields.field1 : selectedFields.field2;
            return formatLabel(value);
        }
        return formatLabel(selectedFields.field1) || 'Value';
    }, [isDualField, selectedMetric, selectedFields]);

    // Helper to check if a set matches the selected combination
    const setMatchesCombination = (set: any): boolean => {
        const label1 = set.trackableField1?.label || '';
        const label2 = set.trackableField2?.label || '';
        const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
        const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';
        const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';

        if (displayCombo === selectedCombination) return true;

        // Handle legacy field fallback
        if (!set.trackableField1 && !set.trackableField2) {
            const weight = extractValue(set.weight);
            const reps = extractValue(set.reps);
            const distance = extractValue(set.distance);
            const duration = extractValue(set.duration);

            if (selectedCombination === 'kg + Reps' && weight > 0 && reps > 0) return true;
            if (selectedCombination === 'm + sec' && distance > 0 && duration > 0) return true;
            if (selectedCombination === 'Reps' && reps > 0 && weight <= 0) return true;
            if (selectedCombination === 'kg' && weight > 0 && reps <= 0) return true;
            if (selectedCombination === 'm' && distance > 0 && duration <= 0) return true;
            if (selectedCombination === 'sec' && duration > 0 && distance <= 0) return true;
        }

        return false;
    };

    // Group history - filtered by selected combination
    const groupedHistory = useMemo(() => {
        const groups: Map<string, any> = new Map();
        history.forEach((entry) => {
            // Filter sets that match the selected combination
            const matchingSets = (entry.exercise_data?.sets || []).filter(setMatchesCombination);

            if (matchingSets.length === 0) return; // Skip entries with no matching sets

            const key = `${entry.date}-${entry.workout_id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    ...entry,
                    exercises: [],
                });
            }
            // Store entry with filtered sets
            groups.get(key)!.exercises.push({
                ...entry,
                exercise_data: {
                    ...entry.exercise_data,
                    sets: matchingSets
                }
            });
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
    }, [history, sortAsc, selectedCombination]);

    // Calculate stats dynamically based on selected combination
    const statsCards = useMemo(() => {
        const labelCounts: Record<string, { sum: number; count: number; max: number }> = {};

        history.forEach((entry) => {
            const sets = entry.exercise_data?.sets || [];
            sets.forEach((set) => {
                // Only process sets that match the selected combination
                if (!setMatchesCombination(set)) return;

                let processedTrackableField = false;

                [set.trackableField1, set.trackableField2].forEach((field) => {
                    if (!field?.label || field.label === 'Optional') return;
                    const val = parseNumericValue(field.completed ?? field.prescribed ?? 0);
                    if (isNaN(val) || val <= 0) return;

                    processedTrackableField = true;
                    if (!labelCounts[field.label]) {
                        labelCounts[field.label] = { sum: 0, count: 0, max: 0 };
                    }
                    labelCounts[field.label].sum += val;
                    labelCounts[field.label].count++;
                    labelCounts[field.label].max = Math.max(labelCounts[field.label].max, val);
                });

                if (!processedTrackableField) {
                    const weight = extractValue(set.weight);
                    const reps = extractValue(set.reps);
                    const distance = extractValue(set.distance);
                    const duration = extractValue(set.duration);

                    if (weight > 0) {
                        if (!labelCounts['kg']) labelCounts['kg'] = { sum: 0, count: 0, max: 0 };
                        labelCounts['kg'].sum += weight;
                        labelCounts['kg'].count++;
                        labelCounts['kg'].max = Math.max(labelCounts['kg'].max, weight);
                    }
                    if (reps > 0) {
                        if (!labelCounts['Reps']) labelCounts['Reps'] = { sum: 0, count: 0, max: 0 };
                        labelCounts['Reps'].sum += reps;
                        labelCounts['Reps'].count++;
                        labelCounts['Reps'].max = Math.max(labelCounts['Reps'].max, reps);
                    }
                    if (distance > 0) {
                        if (!labelCounts['m']) labelCounts['m'] = { sum: 0, count: 0, max: 0 };
                        labelCounts['m'].sum += distance;
                        labelCounts['m'].count++;
                        labelCounts['m'].max = Math.max(labelCounts['m'].max, distance);
                    }
                    if (duration > 0) {
                        if (!labelCounts['sec']) labelCounts['sec'] = { sum: 0, count: 0, max: 0 };
                        labelCounts['sec'].sum += duration;
                        labelCounts['sec'].count++;
                        labelCounts['sec'].max = Math.max(labelCounts['sec'].max, duration);
                    }
                }
            });
        });

        return Object.entries(labelCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([label, stats]) => {
                const avg = stats.sum / stats.count;
                const shouldRound = label === 'Reps' || label === 'sec' || label === 'seconds';
                return {
                    label: `Avg ${formatLabel(label)}`,
                    value: stats.count > 0 ? (shouldRound ? `${Math.round(avg)}` : `${avg.toFixed(1)}`) : '-',
                };
            });
    }, [history, selectedCombination]);

    // Chart Data - filtered by selected combination and metric, aggregated per date
    const chartData = useMemo(() => {
        // Group values by date for aggregation (avg/min/max)
        const dateGroups: Map<string, { sum: number; count: number; min: number; max: number; timestamp: number; dateLabel: string }> = new Map();

        const addToDateGroup = (dateStr: string, value: number) => {
            const timestamp = new Date(dateStr).getTime();
            const dateLabel = format(new Date(dateStr), 'MMM d');
            const existing = dateGroups.get(dateStr);
            if (existing) {
                existing.sum += value;
                existing.count++;
                existing.min = Math.min(existing.min, value);
                existing.max = Math.max(existing.max, value);
            } else {
                dateGroups.set(dateStr, { sum: value, count: 1, min: value, max: value, timestamp, dateLabel });
            }
        };

        history.forEach((entry) => {
            const sets = entry.exercise_data?.sets || [];
            sets.forEach((set) => {
                const label1 = set.trackableField1?.label || '';
                const label2 = set.trackableField2?.label || '';

                // Filter out "Optional" for matching
                const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
                const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';
                const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';

                // Check if this set matches the selected combination
                let matchesCombo = displayCombo === selectedCombination;

                // Handle legacy field fallback
                if (!set.trackableField1 && !set.trackableField2) {
                    const weight = extractValue(set.weight);
                    const reps = extractValue(set.reps);
                    const distance = extractValue(set.distance);
                    const duration = extractValue(set.duration);

                    if (selectedCombination === 'kg + Reps' && weight > 0 && reps > 0) {
                        const value = selectedMetric === 'field1' ? weight : reps;
                        addToDateGroup(entry.date, value);
                        return;
                    } else if (selectedCombination === 'm + sec' && distance > 0 && duration > 0) {
                        const value = selectedMetric === 'field1' ? distance : duration;
                        addToDateGroup(entry.date, value);
                        return;
                    } else if (selectedCombination === 'Reps' && reps > 0) {
                        addToDateGroup(entry.date, reps);
                        return;
                    } else if (selectedCombination === 'kg' && weight > 0) {
                        addToDateGroup(entry.date, weight);
                        return;
                    } else if (selectedCombination === 'm' && distance > 0) {
                        addToDateGroup(entry.date, distance);
                        return;
                    } else if (selectedCombination === 'sec' && duration > 0) {
                        addToDateGroup(entry.date, duration);
                        return;
                    }
                }

                if (!matchesCombo) return;

                // Get values from both fields (parse as number since values may be strings or ranges)
                const field1Val = parseNumericValue(set.trackableField1?.completed ?? set.trackableField1?.prescribed);
                const field2Val = parseNumericValue(set.trackableField2?.completed ?? set.trackableField2?.prescribed);

                // Use selected metric for Y-axis value
                let value: number;
                if (isDualField) {
                    value = selectedMetric === 'field1' ? field1Val : field2Val;
                } else {
                    // Single field - use whichever has a valid value
                    value = !isNaN(field1Val) && field1Val > 0 ? field1Val : field2Val;
                }

                if (!isNaN(value) && value > 0) {
                    addToDateGroup(entry.date, value);
                }
            });
        });

        // Convert to data points based on aggregation mode
        const dataPoints = Array.from(dateGroups.values()).map(group => {
            let value: number;
            switch (aggregationMode) {
                case 'min':
                    value = group.min;
                    break;
                case 'max':
                    value = group.max;
                    break;
                case 'avg':
                default:
                    value = Math.round((group.sum / group.count) * 10) / 10; // Round to 1 decimal
                    break;
            }
            return {
                date: group.dateLabel,
                value,
                timestamp: group.timestamp
            };
        });

        return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
    }, [history, selectedCombination, selectedMetric, isDualField, aggregationMode]);

    const chartConfig: ChartConfig = {
        value: {
            label: yAxisLabel,
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
        const parts: string[] = [];

        // Use trackable fields if available (parse as number since values may be strings or ranges)
        if (set.trackableField1) {
            const val = parseNumericValue(set.trackableField1.completed ?? set.trackableField1.prescribed);
            if (!isNaN(val) && val > 0) {
                parts.push(`${val} ${set.trackableField1.label || ''}`);
            }
        }

        if (set.trackableField2) {
            const val = parseNumericValue(set.trackableField2.completed ?? set.trackableField2.prescribed);
            if (!isNaN(val) && val > 0) {
                parts.push(`${val} ${set.trackableField2.label || ''}`);
            }
        }

        // Fallback to legacy fields if no trackable fields
        if (parts.length === 0) {
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
        }

        return parts.join(', ') || '-';
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
                    {/* Header - Fixed height to match History Log */}
                    <div className="h-[140px] px-5 py-4 shrink-0 bg-sidebar border-b border-sidebar-foreground/10 flex flex-col justify-center gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-sidebar-foreground">
                                {exerciseName}
                            </h3>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-xl bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 text-sidebar-foreground transition-all duration-200 h-9 w-9 flex items-center justify-center group/close"
                                    >
                                        <X className="size-5 transition-transform group-hover/close:scale-110" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('common.closeChartView')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Exercise Variants Section */}
                        {combinationNames.length > 1 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">
                                    Exercise Variants
                                </span>
                                <Tabs
                                    value={selectedCombination}
                                    onValueChange={setSelectedCombination}
                                >
                                    <TabsList className="bg-black/20 border border-sidebar-foreground/30">
                                        {combinationNames.map((combo) => (
                                            <TabsTrigger
                                                key={combo}
                                                value={combo}
                                                className="text-xs !text-sidebar-foreground font-medium data-[state=active]:bg-sidebar-foreground/30 data-[state=active]:font-semibold data-[state=active]:shadow-sm"
                                            >
                                                {formatCombinationLabel(combo)}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                        )}
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 min-h-0 relative p-0 bg-background flex flex-col">
                        {/* Chart Controls Row */}
                        <div className="px-4 py-3 flex items-center justify-between border-b border-border/50 shrink-0">
                            {/* Y-Axis Metric Selector for Dual-Field Combinations */}
                            {isDualField ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                        Y-Axis
                                    </span>
                                    <Tabs
                                        value={selectedMetric}
                                        onValueChange={(v) => setSelectedMetric(v as 'field1' | 'field2')}
                                    >
                                        <TabsList className="h-7 bg-muted">
                                            <TabsTrigger
                                                value="field1"
                                                className="text-xs h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                            >
                                                {formatLabel(selectedFields.field1)}
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="field2"
                                                className="text-xs h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                            >
                                                {formatLabel(selectedFields.field2)}
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            ) : (
                                <div />
                            )}

                            {/* Aggregation Mode Selector */}
                            <div className="flex items-center gap-2">
                                <Tabs
                                    value={aggregationMode}
                                    onValueChange={(v) => setAggregationMode(v as 'avg' | 'min' | 'max')}
                                >
                                    <TabsList className="h-7 bg-muted">
                                        <TabsTrigger
                                            value="avg"
                                            className="text-xs h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                        >
                                            Avg
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="min"
                                            className="text-xs h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                        >
                                            Min
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="max"
                                            className="text-xs h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                        >
                                            Max
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                            <HelpCircle className="size-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[200px]">
                                        <div className="text-xs space-y-1">
                                            <p><span className="font-semibold">Avg:</span> Average of all sets per session</p>
                                            <p><span className="font-semibold">Min:</span> Lowest value per session</p>
                                            <p><span className="font-semibold">Max:</span> Highest value per session</p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Chart Container */}
                        <div className="flex-1 min-h-0">
                        {chartData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="w-full h-full p-4 -ml-4">
                                <LineChart
                                    accessibilityLayer
                                    data={chartData}
                                    margin={{ left: 20, right: 10, top: 20, bottom: 20 }}
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
                                        label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 11 } }}
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
                </div>

                {/* Right Panel: History Log */}
                <div className="w-[400px] h-full shrink-0 bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header with Stats - Fixed height to match Chart header */}
                    <div className="h-[140px] px-5 py-4 shrink-0 bg-sidebar border-b border-sidebar-foreground/10 flex flex-col justify-center gap-3">
                        <h3 className="text-2xl font-bold text-sidebar-foreground">
                            History Log
                        </h3>
                        {/* Stats Cards */}
                        {statsCards.length > 0 && (
                            <div className={`grid gap-2 ${statsCards.length === 1 ? 'grid-cols-1' : statsCards.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {statsCards.map((card, idx) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-sidebar-foreground/10 border border-sidebar-foreground/20 flex flex-col gap-1 items-center justify-center text-center">
                                        <TrendingUp className="size-3.5 text-sidebar-foreground/60 mb-0.5" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">{card.label}</span>
                                        <span className="text-xs font-bold text-sidebar-foreground">
                                            {card.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-muted/20">
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
