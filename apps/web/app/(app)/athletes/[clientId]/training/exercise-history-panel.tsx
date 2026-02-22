'use client';
import { useTranslations } from 'next-intl';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { X, TrendingUp, ArrowUpDown, Loader2, BarChart3 } from 'lucide-react';
import { getExerciseHistory, type HistoryEntry } from '@/api/client/client-training-service';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExerciseHistoryChartDialog } from './exercise-history-chart-dialog';

interface ExerciseHistoryPanelProps {
    exerciseId: string;
    exerciseName: string;
    clientId: string;
    coachId: string;
    onClose: () => void;
}

interface GroupedHistory {
    date: string;
    workoutName: string;
    workoutId: string;
    exercises: HistoryEntry[];
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

// Helper to safely extract numeric value from potentially complex object
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

export const ExerciseHistoryPanel = ({ exerciseId, exerciseName, clientId, coachId, onClose }: ExerciseHistoryPanelProps) => {
    const t = useTranslations();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortAsc, setSortAsc] = useState(false); // false = newest first
    const hasFetched = React.useRef(false); // Ref to prevent double fetch in Strict Mode
    const [isChartViewOpen, setIsChartViewOpen] = useState(false);
    const [selectedCombination, setSelectedCombination] = useState<string>('');

    // Extract unique label combinations from history
    const combinationNames = React.useMemo(() => {
        const combos = new Set<string>();
        history.forEach((entry) => {
            const sets = entry.exercise_data?.sets || [];
            sets.forEach((set) => {
                const label1 = set.trackableField1?.label || '';
                const label2 = set.trackableField2?.label || '';
                const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
                const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';
                const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';
                combos.add(displayCombo);
            });
        });
        // Fallback to legacy fields
        if (combos.size === 0 || (combos.size === 1 && combos.has('Unknown'))) {
            let hasWeight = false, hasReps = false, hasDistance = false, hasDuration = false;
            history.forEach((entry) => {
                const sets = entry.exercise_data?.sets || [];
                sets.forEach((set) => {
                    if (extractValue(set.weight) > 0) hasWeight = true;
                    if (extractValue(set.reps) > 0) hasReps = true;
                    if (extractValue(set.distance) > 0) hasDistance = true;
                    if (extractValue(set.duration) > 0) hasDuration = true;
                });
            });
            combos.clear();
            if (hasWeight && hasReps) combos.add('kg + Reps');
            else if (hasDistance && hasDuration) combos.add('m + sec');
            else if (hasReps) combos.add('Reps');
            else if (hasWeight) combos.add('kg');
            else if (hasDistance) combos.add('m');
            else if (hasDuration) combos.add('sec');
        }
        return Array.from(combos);
    }, [history]);

    // Set default combination
    React.useEffect(() => {
        if (combinationNames.length > 0 && !combinationNames.includes(selectedCombination)) {
            setSelectedCombination(combinationNames[0]);
        }
    }, [combinationNames, selectedCombination]);

    // Helper to check if a set matches the selected combination
    const setMatchesCombination = React.useCallback((set: any): boolean => {
        const label1 = set.trackableField1?.label || '';
        const label2 = set.trackableField2?.label || '';
        const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
        const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';
        const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';

        if (displayCombo === selectedCombination) return true;

        // Legacy field fallback
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
    }, [selectedCombination]);

    useEffect(() => {
        const fetchHistory = async () => {
            // Prevent duplicate calls if props haven't changed meaningfully
            if (hasFetched.current) return;

            console.log('ExerciseHistoryPanel fetchHistory called', { clientId, exerciseId, exerciseName });

            if (!exerciseId || !clientId || !coachId) {
                console.warn('Missing required props', { clientId, coachId, exerciseId });
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const historyData = await getExerciseHistory({
                    clientId,
                    coachId,
                    exerciseId,
                    exerciseName
                });
                setHistory(historyData);
                hasFetched.current = true;
            } catch (err) {
                console.error('Error fetching exercise history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();

        // Reset ref when props change to allow re-fetch
        return () => { hasFetched.current = false; };
    }, [clientId, coachId, exerciseId, exerciseName]);

    // Group history by date and workout - filtered by selected combination
    const groupedHistory: GroupedHistory[] = React.useMemo(() => {
        const groups: Map<string, GroupedHistory> = new Map();

        history.forEach((entry) => {
            // Filter sets that match the selected combination
            const matchingSets = (entry.exercise_data?.sets || []).filter(setMatchesCombination);
            if (matchingSets.length === 0) return;

            const key = `${entry.date}-${entry.workout_id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    date: entry.date,
                    workoutName: entry.workout_name,
                    workoutId: entry.workout_id,
                    exercises: [],
                });
            }
            groups.get(key)!.exercises.push({
                ...entry,
                exercise_data: {
                    ...entry.exercise_data,
                    sets: matchingSets
                }
            });
        });

        const sorted = Array.from(groups.values()).sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortAsc ? dateA - dateB : dateB - dateA;
        });

        return sorted;
    }, [history, sortAsc, setMatchesCombination]);

    // Calculate stats dynamically based on selected combination
    const statsCards = React.useMemo(() => {
        // Collect stats per unique label
        const labelCounts: Record<string, { sum: number; count: number; max: number }> = {};

        history.forEach((entry) => {
            const sets = entry.exercise_data?.sets || [];
            sets.forEach((set) => {
                // Only process sets that match the selected combination
                if (!setMatchesCombination(set)) return;

                // Track if we processed any trackable fields with labels
                let processedTrackableField = false;

                // Process trackable fields
                [set.trackableField1, set.trackableField2].forEach((field) => {
                    if (!field?.label) return;
                    // Parse as number since values may be stored as strings or ranges
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

                // Fallback to legacy fields if no trackable fields with labels were processed
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

        // Generate cards for top 2-3 labels by count
        return Object.entries(labelCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([label, stats]) => {
                const avg = stats.sum / stats.count;
                // Round to nearest integer for Reps/sec, keep 1 decimal for kg/m
                const shouldRound = label === 'Reps' || label === 'sec' || label === 'seconds';
                return {
                    label: `Avg ${formatLabel(label)}`,
                    value: stats.count > 0 ? (shouldRound ? `${Math.round(avg)}` : `${avg.toFixed(1)}`) : '-',
                    best: stats.max,
                    icon: TrendingUp,
                    color: 'text-sidebar-foreground'
                };
            });
    }, [history, setMatchesCombination]);

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

            if (weight > 0 && reps > 0) {
                return `${weight}kg × ${reps}`;
            } else if (reps > 0) {
                return `${reps} reps`;
            } else if (distance > 0 && duration > 0) {
                return `${distance}m × ${duration}s`;
            } else if (distance > 0) {
                return `${distance}m`;
            } else if (duration > 0) {
                return `${duration}s`;
            }
        }

        return parts.join(', ') || '-';
    };

    return (
        <motion.div
            layout
            layoutId="history-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="shrink-0 overflow-hidden"
        >
            <div className="w-[400px] h-full bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="size-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="h-[180px] px-5 border-b border-sidebar-foreground/10 flex flex-col justify-center gap-1 shrink-0 bg-sidebar rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-sidebar-foreground tracking-tight truncate max-w-[280px]">
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
                                        <p>{t('common.closeHistoryPanel')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex items-center justify-between w-full">
                                <span className="text-xs text-sidebar-foreground/70 font-medium">History</span>
                                <button
                                    onClick={() => setIsChartViewOpen(true)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-[10px] font-bold uppercase tracking-wider group/chart hover:bg-sidebar-foreground/10 text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer"
                                >
                                    <BarChart3 className="size-3.5" />
                                    <span>{t('common.chartView')}</span>
                                </button>
                            </div>
                            {/* Stats Summary - Dynamic Grid */}
                            <div className={`grid gap-2 mt-0.5 ${statsCards.length === 1 ? 'grid-cols-1' : statsCards.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {statsCards.map((card, idx) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-sidebar-foreground/10 border border-sidebar-foreground/20 flex flex-col gap-1 items-center justify-center text-center">
                                        <card.icon className="size-3.5 text-sidebar-foreground/60 mb-0.5" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">{card.label}</span>
                                        <span className={`text-xs font-bold ${card.color}`}>
                                            {card.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                            {/* Exercise Variants Toggle */}
                            {combinationNames.length > 1 && (
                                <div className="px-4 pt-4 shrink-0 flex flex-col gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exercise Variant</span>
                                    <Tabs
                                        value={selectedCombination}
                                        onValueChange={setSelectedCombination}
                                    >
                                        <TabsList className="w-full bg-muted/30 border border-border/50">
                                            {combinationNames.map((combo) => (
                                                <TabsTrigger
                                                    key={combo}
                                                    value={combo}
                                                    className="flex-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                                >
                                                    {formatCombinationLabel(combo)}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </Tabs>
                                </div>
                            )}

                            {/* Records count and sort toggle */}
                            <div className="flex items-center justify-between px-5 py-2">
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

                            {/* History List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 pt-2">
                                {groupedHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <span className="text-sm text-muted-foreground">No history found</span>
                                        <span className="text-xs text-muted-foreground/70 mt-1">Complete workouts to build history</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {groupedHistory.map((group) => (
                                            <div key={`${group.date}-${group.workoutId}`} className="flex flex-col gap-1">
                                                {/* Header Card: Date & Workout Name */}
                                                <div className="p-2 rounded-md bg-card border border-border/60 shadow-sm flex items-center justify-between relative overflow-hidden">
                                                    <span className="text-xs font-bold text-foreground">
                                                        {format(new Date(group.date), 'MMM d, yyyy')}
                                                    </span>
                                                    <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                                                        {group.workoutName}
                                                    </span>
                                                </div>

                                                {/* Sets List - Simplified & Inset */}
                                                <div className="flex flex-col gap-1 pl-4 pr-1 mt-1">
                                                    {group.exercises.map((entry, j) => (
                                                        <React.Fragment key={j}>
                                                            {j > 0 && <div className="h-px bg-border/40 my-1.5 mx-2" />}
                                                            <div className="flex flex-col gap-0.5">
                                                                {(entry.exercise_data?.sets || []).map((set, si) => (
                                                                    <div
                                                                        key={si}
                                                                        className="flex items-center gap-2 text-xs py-0.5 px-2 hover:bg-muted/30 rounded-sm transition-colors"
                                                                    >
                                                                        <span className="text-muted-foreground font-normal w-4 shrink-0">
                                                                            {si + 1}.
                                                                        </span>
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
                    </>
                )}
            </div>

            <ExerciseHistoryChartDialog
                open={isChartViewOpen}
                onClose={() => setIsChartViewOpen(false)}
                exerciseName={exerciseName}
                exerciseType={history.find(h => h.exercise_data?.exerciseType)?.exercise_data?.exerciseType || 'weight_reps'}
                history={history}
            />
        </motion.div>
    );
};
