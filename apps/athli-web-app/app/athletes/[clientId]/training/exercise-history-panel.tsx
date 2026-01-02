'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { X, TrendingUp, Award, ArrowUpDown, Loader2 } from 'lucide-react';
import { getExerciseHistory, type HistoryEntry } from '@/api/client/client-training-service';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

export const ExerciseHistoryPanel = ({ exerciseId, exerciseName, clientId, coachId, onClose }: ExerciseHistoryPanelProps) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortAsc, setSortAsc] = useState(false); // false = newest first
    const hasFetched = React.useRef(false); // Ref to prevent double fetch in Strict Mode

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

    // Group history by date and workout
    const groupedHistory: GroupedHistory[] = React.useMemo(() => {
        const groups: Map<string, GroupedHistory> = new Map();

        history.forEach((entry) => {
            const key = `${entry.date}-${entry.workout_id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    date: entry.date,
                    workoutName: entry.workout_name,
                    workoutId: entry.workout_id,
                    exercises: [],
                });
            }
            groups.get(key)!.exercises.push(entry);
        });

        const sorted = Array.from(groups.values()).sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortAsc ? dateA - dateB : dateB - dateA;
        });

        return sorted;
    }, [history, sortAsc]);

    // Helper to safely extract numeric value from potentially complex object
    const extractValue = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null) {
            return Number(val.completed ?? val.prescribed ?? 0);
        }
        return Number(val ?? 0);
    };

    // Calculate stats
    const stats = React.useMemo(() => {
        let totalWeight = 0;
        let weightCount = 0;
        let bestWeight = 0;
        let bestWeightReps = 0; // Reps performed at best weight
        let bestReps = 0; // Absolute max reps
        let bestRepsWeight = 0; // Weight used for max reps

        history.forEach((entry) => {
            const sets = entry.exercise_data?.sets || [];
            sets.forEach((set: any) => {
                const weight = extractValue(set.weight);
                const reps = extractValue(set.reps);

                if (weight > 0) {
                    totalWeight += weight;
                    weightCount++;

                    // Logic for Best Weight (PR)
                    if (weight > bestWeight) {
                        bestWeight = weight;
                        bestWeightReps = reps;
                    } else if (weight === bestWeight && reps > bestWeightReps) {
                        bestWeightReps = reps;
                    }
                }

                // Logic for Best Reps
                if (reps > bestReps) {
                    bestReps = reps;
                    bestRepsWeight = weight;
                } else if (reps === bestReps && weight > bestRepsWeight) {
                    bestRepsWeight = weight;
                }
            });
        });

        return {
            average: weightCount > 0 ? (totalWeight / weightCount).toFixed(1) : '0',
            bestWeight,
            bestWeightReps,
            bestReps,
            bestRepsWeight
        };
    }, [history]);

    const formatSetValue = (set: any): string => {
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

        return '-';
    };

    return (
        <motion.div
            layout
            layoutId="history-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }} // Widened panel to 400px
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="shrink-0 overflow-hidden"
        >
            <div className="w-[400px] h-full bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border-l border-border/50">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="size-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="h-[180px] px-5 border-b border-sidebar-foreground/10 flex flex-col justify-center gap-1 shrink-0 bg-sidebar">
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
                                        <p>Close history panel</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-xs text-sidebar-foreground/70 font-medium">History</span>
                            {/* Stats Summary - Now 3 columns */}
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                <div className="p-2.5 rounded-xl bg-sidebar-foreground/10 border border-sidebar-foreground/20 flex flex-col gap-1 items-center justify-center text-center">
                                    <TrendingUp className="size-3.5 text-sidebar-foreground/60 mb-0.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">Avg Weight</span>
                                    <span className="text-xs font-bold text-sidebar-foreground">{stats.average} kg</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-sidebar-foreground/10 border border-sidebar-foreground/20 flex flex-col gap-1 items-center justify-center text-center">
                                    <Award className="size-3.5 text-sidebar-foreground/60 mb-0.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">Best (PR)</span>
                                    <span className="text-xs font-bold text-sidebar-foreground text-amber-500">
                                        {stats.bestWeight > 0 ? `${stats.bestWeight}kg × ${stats.bestWeightReps}` : '-'}
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-sidebar-foreground/10 border border-sidebar-foreground/20 flex flex-col gap-1 items-center justify-center text-center">
                                    <Award className="size-3.5 text-sidebar-foreground/60 mb-0.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">Best Reps</span>
                                    <span className="text-xs font-bold text-sidebar-foreground text-emerald-500">
                                        {stats.bestReps > 0 ? `${stats.bestReps} × ${stats.bestRepsWeight}kg` : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                            {/* Records count and sort toggle */}
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
        </motion.div>
    );
};
