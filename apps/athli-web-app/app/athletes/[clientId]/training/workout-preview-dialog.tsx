'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link2, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/general/utils';
import { searchExercises } from '@/api/exercise/exercise-search';
import { VideoModal } from '@/components/training/builder/video-modal';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface WorkoutPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutData: any;
}

// Helper function to get exercise by ID from mock data
const getExerciseById = (exerciseId: string) => {
    const allExercises = searchExercises('');
    return allExercises.find(ex => ex.exerciseId === exerciseId);
};

// Helper function to format set values (weight/reps) which can be numbers or objects
// Helper function to format set values (weight/reps) which can be numbers or objects
const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-';

    const extract = (v: any) => {
        if (typeof v === 'object' && v !== null) {
            return v.completed ?? v.prescribed ?? '-';
        }
        return v;
    };

    if (Array.isArray(value)) {
        // Dropset: array of values joined with '-'
        return value.map(extract).join('-');
    }

    if (typeof value === 'object') {
        // Handle { prescribed, completed } object structure
        const v = value.completed ?? value.prescribed;
        if (Array.isArray(v)) return v.map(extract).join('-');
        return v ?? '-';
    }
    return value;
};

export const WorkoutPreviewDialog = ({ open, onOpenChange, workoutData }: WorkoutPreviewDialogProps) => {
    const [enrichedExercises, setEnrichedExercises] = useState<any[]>([]);
    const [isLoadingExercises, setIsLoadingExercises] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    useEffect(() => {
        if (!open || !workoutData) {
            setEnrichedExercises([]);
            return;
        }

        const loadExerciseData = () => {
            setIsLoadingExercises(true);
            const items = workoutData?.workout_data?.items || workoutData?.items || [];
            const renderItems: any[] = [];

            const processExercise = (exercise: any, isSuperset: boolean = false) => {
                const exerciseId = exercise.prescribedExerciseId || exercise.exerciseId || exercise.performedExerciseId;
                if (exerciseId) {
                    const exerciseDetails = getExerciseById(exerciseId);
                    if (exerciseDetails) {
                        let sets = exercise.sets || [];

                        // Handle case where the exercise itself describes a single set (common in AMRAP/Circuit sections)
                        // Checks if sets is empty/missing AND if standard set properties exist or completed flag is true
                        if ((!exercise.sets || exercise.sets.length === 0) &&
                            (exercise.reps || exercise.weight || exercise.distance || exercise.durationSec || exercise.completed)) {
                            sets = [{
                                ...exercise, // Include all properties as this object *is* the set
                                setNumber: 1, // Force set number 1 for these single-set exercises
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
                            exerciseType: exercise.exerciseType || exerciseDetails.exerciseType || 'weight_reps',
                            thumbnailUrl: exerciseDetails.imageUrl,
                            sets: sets,
                            isSuperset: isSuperset
                        });
                    }
                }
            };

            for (const item of items) {
                // Handle section-based exercises
                if (item.itemType === 'section' && item.data?.exercises) {
                    const sectionName = item.data.sectionName || item.data.name || 'Section';

                    // Push section header
                    renderItems.push({
                        itemType: 'section-header',
                        sectionName: sectionName
                    });

                    for (const groupOrExercise of item.data.exercises) {
                        // Handle nested groups (e.g. Regular sections with supersets)
                        if (groupOrExercise.exercises && Array.isArray(groupOrExercise.exercises)) {
                            for (const exercise of groupOrExercise.exercises) {
                                processExercise(exercise, groupOrExercise.isSuperset || false);
                            }
                        }
                        // Handle flat exercises (e.g. AMRAP sections)
                        else {
                            processExercise(groupOrExercise, false);
                        }
                    }

                    // Push section footer
                    renderItems.push({
                        itemType: 'section-footer',
                        sectionName: sectionName
                    });
                }
                // Handle top-level exercises
                else if (item.itemType === 'exercise') {
                    // Check item.data first (standard), then fallback to item.exercise (legacy/alternative)
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
    }, [open, workoutData]);

    if (!workoutData) return null;

    const name = workoutData?.name || 'Untitled Workout';
    const type = workoutData?.type || workoutData?.workout_data?.type;
    const difficulty = workoutData?.difficulty || workoutData?.workout_data?.difficulty;
    const description = workoutData?.description || workoutData?.workout_data?.description;

    const handleThumbnailClick = (exercise: any) => {
        const fullExercise = getExerciseById(exercise.exerciseId);
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
                <VisuallyHidden>
                    <DialogTitle>Workout Preview</DialogTitle>
                </VisuallyHidden>

                {/* Header */}
                <div className="px-6 py-5 shrink-0">
                    <div className="flex flex-col gap-3">
                        <h2 className="text-2xl font-bold tracking-tight">{name}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            {type && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 py-0.5 px-2">
                                    {type}
                                </Badge>
                            )}
                            {difficulty && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 py-0.5 px-2">
                                    {difficulty}
                                </Badge>
                            )}
                        </div>
                        {description && (
                            <p className="text-sm text-foreground/70 leading-relaxed">{description}</p>
                        )}
                    </div>
                </div>

                {/* Exercise List */}
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
                                // Section Header
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

                                // Section Footer
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

                                // Exercise Card (default)
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
                                            {/* Exercise Header */}
                                            <div className="flex items-center gap-3 p-3">
                                                <div
                                                    className="group relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted cursor-pointer"
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
                                                        <Play className="size-4 text-white fill-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm truncate">
                                                        {exercise.name || 'Untitled Exercise'}
                                                    </h3>
                                                </div>
                                            </div>

                                            {/* Sets Table using UI components to ensure row-per-set behavior */}
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
                                                                            {formatValue(set[config.keys[0] as string])}
                                                                        </TableCell>
                                                                        {config.keys[1] && (
                                                                            <TableCell className="text-center py-1 px-2 text-xs font-medium text-foreground/80">
                                                                                {formatValue(set[config.keys[1] as string])}
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell className="text-center py-1 px-2 text-xs font-medium text-foreground/80 italic">
                                                                            {set.restSec ? `${set.restSec}` : set.rest ? set.rest : '-'}
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
                </div>

                {/* Footer with Close Button */}
                <div className="px-6 pt-2 pb-3 flex justify-end shrink-0">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="font-bold px-8"
                    >
                        Close
                    </Button>
                </div>

                <VideoModal
                    open={isVideoModalOpen}
                    onOpenChange={setIsVideoModalOpen}
                    exercise={selectedExercise}
                />
            </DialogContent>
        </Dialog>
    );
};
