'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Link2, Play, History, CircleCheck, CircleX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/general/utils';
import { useExerciseLookup } from '@/hooks/use-all-exercises';
import { VideoModal } from '@/components/training/builder/video-modal';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface WorkoutPreviewContentProps {
    workoutData: any;
    onHistoryClick?: (exercise: any) => void;
}

// Helper function to render set values (weight/reps) showing differences between prescribed and completed
const renderValue = (value: any) => {
    if (value === null || value === undefined) return '-';

    const extract = (v: any) => {
        if (typeof v === 'object' && v !== null) {
            const prescribed = v.prescribed;
            const completed = v.completed;

            if (completed !== undefined && completed !== null && completed !== prescribed) {
                return (
                    <span className="flex items-center justify-center gap-1">
                        <span className="line-through text-muted-foreground/50">{prescribed}</span>
                        <span className="text-primary font-bold">{completed}</span>
                    </span>
                );
            }
            return completed ?? prescribed ?? '-';
        }
        return v;
    };

    if (Array.isArray(value)) {
        // Dropset: array of values. We'll join them, but strikethrough is hard in a join.
        // For now, if any element is an object with a difference, we'll just extract the effective value to keep the join clean.
        return value.map(v => {
            if (typeof v === 'object' && v !== null) return v.completed ?? v.prescribed ?? '-';
            return v;
        }).join('-');
    }

    if (typeof value === 'object') {
        const prescribed = value.prescribed;
        const completed = value.completed;

        if (completed !== undefined && completed !== null && completed !== prescribed) {
            return (
                <span className="flex items-center justify-center gap-1.5">
                    <span className="line-through text-muted-foreground/50">{prescribed}</span>
                    <span className="text-primary font-bold">{completed}</span>
                </span>
            );
        }

        // Handle { prescribed, completed } object structure even without difference
        const v = completed ?? prescribed;
        if (Array.isArray(v)) {
            return v.map(item => {
                if (typeof item === 'object' && item !== null) return item.completed ?? item.prescribed ?? '-';
                return item;
            }).join('-');
        }
        return v ?? '-';
    }
    return value;
};

export const WorkoutPreviewContent = ({ workoutData, onHistoryClick }: WorkoutPreviewContentProps) => {
    const [enrichedExercises, setEnrichedExercises] = useState<any[]>([]);
    const [isLoadingExercises, setIsLoadingExercises] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    
    // Get exercise lookup from cached exercises
    const { findExerciseById } = useExerciseLookup();

    useEffect(() => {
        if (!workoutData) {
            setEnrichedExercises([]);
            return;
        }

        const loadExerciseData = () => {
            setIsLoadingExercises(true);
            const items = workoutData?.workout_data?.items || workoutData?.items || [];
            const renderItems: any[] = [];

            const processExercise = (exercise: any, isSuperset: boolean = false) => {
                // Priority: Performed (actual/subbed) -> Prescribed (planned) -> explicit ID
                const targetExerciseId = exercise.performedExerciseId || exercise.prescribedExerciseId || exercise.exerciseId;
                const isSubstituted = exercise.performedExerciseId && exercise.prescribedExerciseId && exercise.performedExerciseId !== exercise.prescribedExerciseId;

                if (targetExerciseId) {
                    let exerciseDetails = findExerciseById(targetExerciseId);

                    // Fallback to prescribed ID if performed ID lookup fails (common if performed ID is an instance ID not in library)
                    if (!exerciseDetails && exercise.prescribedExerciseId && exercise.prescribedExerciseId !== targetExerciseId) {
                        exerciseDetails = findExerciseById(exercise.prescribedExerciseId);
                    }

                    // If substituted, get prescribed details for the name
                    let prescribedName = null;
                    if (isSubstituted) {
                        const prescribedDetails = findExerciseById(exercise.prescribedExerciseId);
                        if (prescribedDetails) {
                            prescribedName = prescribedDetails.name;
                        }
                    }

                    if (exerciseDetails) {
                        let sets = exercise.sets || [];

                        // Handle case where the exercise itself describes a single set (common in AMRAP/Circuit sections)
                        if ((!exercise.sets || exercise.sets.length === 0) &&
                            (exercise.reps || exercise.weight || exercise.distance || exercise.durationSec || exercise.completed)) {
                            sets = [{
                                ...exercise,
                                setNumber: 1,
                                type: exercise.type || 'normal'
                            }];
                        }

                        // Sort sets by setNumber to ensure logical order
                        if (Array.isArray(sets)) {
                            sets.sort((a: any, b: any) => (a.setNumber || 0) - (b.setNumber || 0));

                            // Transform dropsets
                            sets = sets.map((set: any) => {
                                if ((set.type === 'dropset' || set.dropset) && set.dropset?.stages) {
                                    return {
                                        ...set,
                                        weight: set.dropset.stages.map((s: any) => s.weight),
                                        reps: set.dropset.stages.map((s: any) => s.reps)
                                    };
                                }
                                return set;
                            });
                        }

                        renderItems.push({
                            itemType: 'exercise',
                            ...exerciseDetails,
                            id: exerciseDetails.exerciseId, // Map to 'id' for components expecting it (like ExerciseHistoryPanel)
                            prescribedName, // Add prescribed name if substituted
                            exerciseType: exercise.exerciseType || exerciseDetails.exerciseType || 'weight_reps',
                            thumbnailUrl: exerciseDetails.imageUrl,
                            sets: sets,
                            isSuperset: isSuperset,
                            tempo: exercise.tempo,
                            rpe: exercise.rpe,
                            heartRateZone: exercise.heartRateZone,
                            eachSide: exercise.eachSide
                        });
                    }
                }
            };

            for (const item of items) {
                if (item.itemType === 'section' && item.data?.exercises) {
                    const sectionName = item.data.sectionName || item.data.name || 'Section';
                    renderItems.push({
                        itemType: 'section-header',
                        sectionName: sectionName
                    });

                    for (const groupOrExercise of item.data.exercises) {
                        if (groupOrExercise.exercises && Array.isArray(groupOrExercise.exercises)) {
                            for (const exercise of groupOrExercise.exercises) {
                                processExercise(exercise, groupOrExercise.isSuperset || false);
                            }
                        }
                        else {
                            processExercise(groupOrExercise, false);
                        }
                    }

                    renderItems.push({
                        itemType: 'section-footer',
                        sectionName: sectionName
                    });
                }
                else if (item.itemType === 'exercise') {
                    const exerciseData = item.data || item.exercise;
                    if (exerciseData) {
                        processExercise(exerciseData, false);
                    }
                }
            }

            setEnrichedExercises(renderItems);
            setIsLoadingExercises(false);
        };

        loadExerciseData();
    }, [workoutData]);

    const handleThumbnailClick = (exercise: any) => {
        const fullExercise = findExerciseById(exercise.exerciseId);
        if (fullExercise) {
            setSelectedExercise(fullExercise);
            setIsVideoModalOpen(true);
        }
    };

    const getMetricsConfig = (type: string) => {
        switch (type) {
            case 'distance_duration':
                return {
                    labels: ['Distance (m)', 'Duration (s)'],
                    keys: ['distance', 'durationSec']
                };
            case 'weight_distance':
                return {
                    labels: ['Weight', 'Distance'],
                    keys: ['weight', 'distance']
                };
            case 'reps_distance':
                return {
                    labels: ['Reps', 'Distance'],
                    keys: ['reps', 'distance']
                };
            case 'duration':
                return {
                    labels: ['Duration (s)', ''],
                    keys: ['durationSec', null]
                };
            case 'weight_duration':
                return {
                    labels: ['Weight', 'Duration'],
                    keys: ['weight', 'durationSec']
                };
            case 'reps_duration':
                return {
                    labels: ['Reps', 'Duration'],
                    keys: ['reps', 'durationSec']
                };
            default: // weight_reps
                return {
                    labels: ['Weight', 'Reps'],
                    keys: ['weight', 'reps']
                };
        }
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-muted/5">
                {isLoadingExercises ? (
                    <div className="flex items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">Loading exercises...</p>
                    </div>
                ) : enrichedExercises.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">No exercises found</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {enrichedExercises.map((item: any, index: number) => {
                            if (item.itemType === 'section-header') {
                                return (
                                    <div key={`header-${index}`} className="flex items-center gap-2 pt-2">
                                        <div className="h-px flex-1 bg-border/50" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">
                                            {item.sectionName}
                                        </span>
                                        <div className="h-px flex-1 bg-border/50" />
                                    </div>
                                );
                            }

                            if (item.itemType === 'section-footer') {
                                return (
                                    <div key={`footer-${index}`} className="flex items-center gap-2 pb-2">
                                        <div className="h-px flex-1 bg-border/50" />
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2">
                                            End of {item.sectionName}
                                        </span>
                                        <div className="h-px flex-1 bg-border/50" />
                                    </div>
                                );
                            }

                            const exercise = item;
                            return (
                                <div key={index} className="flex flex-col gap-3">
                                    {exercise.isSuperset && index > 0 && enrichedExercises[index - 1]?.isSuperset && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Link2 className="size-3" />
                                            <span className="font-medium uppercase tracking-wider text-[10px]">Superset</span>
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            'rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm',
                                            exercise.isSuperset && index > 0 && enrichedExercises[index - 1]?.isSuperset && 'ml-6'
                                        )}
                                    >
                                        <div className="flex items-center justify-between p-2.5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    className="group relative size-9 rounded-lg overflow-hidden shrink-0 bg-muted cursor-pointer"
                                                    onClick={() => handleThumbnailClick(exercise)}
                                                >
                                                    {exercise.thumbnailUrl && (
                                                        <Image
                                                            src={exercise.thumbnailUrl}
                                                            alt={exercise.name || 'Exercise'}
                                                            fill
                                                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Play className="size-3 text-white fill-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm truncate flex items-center gap-2">
                                                        {exercise.prescribedName && (
                                                            <span className="line-through text-muted-foreground font-normal">
                                                                {exercise.prescribedName}
                                                            </span>
                                                        )}
                                                        <span>{exercise.name || 'Untitled Exercise'}</span>
                                                    </h3>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onHistoryClick?.(exercise)}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary group/history shrink-0"
                                            >
                                                <History className="size-3.5" />
                                                <span>History</span>
                                            </button>
                                        </div>

                                        {(exercise.tempo || exercise.rpe || exercise.heartRateZone || exercise.eachSide) && (
                                            <div className="px-2.5 pb-2.5 flex flex-wrap gap-2 text-[10px]">
                                                {exercise.tempo && (
                                                    <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                        <span className="font-bold">Tempo:</span> {exercise.tempo}
                                                    </div>
                                                )}
                                                {exercise.rpe && (
                                                    <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                        <span className="font-bold">RPE:</span> {exercise.rpe}
                                                    </div>
                                                )}
                                                {exercise.heartRateZone && (
                                                    <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                        <span className="font-bold">Zone:</span> {exercise.heartRateZone}
                                                    </div>
                                                )}
                                                {exercise.eachSide && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                        Each Side
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {exercise.sets && exercise.sets.length > 0 && (
                                            <div className="border-t border-border/50">
                                                <Table>
                                                    <TableHeader className="bg-muted/20">
                                                        <TableRow className="hover:bg-transparent border-b border-border/50">
                                                            <TableHead className="w-16 text-center font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-8 py-1 px-2">
                                                                Set
                                                            </TableHead>
                                                            <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-8 py-1 px-2">
                                                                Type
                                                            </TableHead>
                                                            {(() => {
                                                                const config = getMetricsConfig(exercise.exerciseType);
                                                                return (
                                                                    <>
                                                                        <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-8 py-1 px-2">
                                                                            {config.labels[0]}
                                                                        </TableHead>
                                                                        {config.labels[1] && (
                                                                            <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-8 py-1 px-2">
                                                                                {config.labels[1]}
                                                                            </TableHead>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-8 py-1 px-2">
                                                                Rest (s)
                                                            </TableHead>
                                                            <TableHead className="w-16 text-center font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-8 py-1 px-2">
                                                                Status
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {exercise.sets.map((set: any, setIndex: number) => {
                                                            const config = getMetricsConfig(exercise.exerciseType);
                                                            return (
                                                                <TableRow key={setIndex} className="h-10 border-b border-border/50 last:border-0 bg-background hover:bg-muted/10 transition-colors">
                                                                    <TableCell className="text-center py-1 px-2 font-bold text-xs text-foreground/80">
                                                                        {setIndex + 1}
                                                                    </TableCell>
                                                                    <TableCell className="text-center py-1 px-2">
                                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                            {set.type || 'normal'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-center py-1 px-2 text-xs font-medium text-foreground/80">
                                                                        {exercise.eachSide && config.keys[0] === 'reps' ? (
                                                                            <span className="flex items-center justify-center gap-1">
                                                                                <span>L: {renderValue(set.leftReps || set.reps)}</span>
                                                                                <span className="text-muted-foreground/50">|</span>
                                                                                <span>R: {renderValue(set.rightReps || set.reps)}</span>
                                                                            </span>
                                                                        ) : (
                                                                            renderValue(set[config.keys[0] as string])
                                                                        )}
                                                                    </TableCell>
                                                                    {config.keys[1] && (
                                                                        <TableCell className="text-center py-1 px-2 text-xs font-medium text-foreground/80">
                                                                            {renderValue(set[config.keys[1] as string])}
                                                                        </TableCell>
                                                                    )}
                                                                    <TableCell className="text-center py-1 px-2 text-xs font-medium text-foreground/80 italic">
                                                                        {set.restSec ? `${set.restSec}` : set.rest ? set.rest : '-'}
                                                                    </TableCell>
                                                                    <TableCell className="text-center py-1 px-2">
                                                                        {set.completed === true ? (
                                                                            <CircleCheck className="size-4 text-green-500 mx-auto" />
                                                                        ) : set.completed === false || set.skipped === true ? (
                                                                            <CircleX className="size-4 text-red-500 mx-auto" />
                                                                        ) : (
                                                                            <div className="size-3 rounded-full border-2 border-muted-foreground/20 mx-auto" />
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div >

            <VideoModal
                open={isVideoModalOpen}
                onOpenChange={setIsVideoModalOpen}
                exercise={selectedExercise}
            />
        </>
    );
};
