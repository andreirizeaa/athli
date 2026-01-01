'use client';

import React from 'react';
import { CircleCheck, Clock, Gauge, Weight, Activity, Star, Loader2, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/general/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { WorkoutPreviewDialog } from './workout-preview-dialog';
import { searchExercises } from '@/api/exercise/exercise-search';

interface ClientCompletedTrainingDaySummaryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutName: string;
    isLoading?: boolean;
    workoutData?: any; // Full workout data from training_clients
    athlete?: {
        name: string;
        avatarUrl?: string;
    } | null;
    completedSummary?: {
        started_at?: string;
        startedAt?: string;
        completed_at?: string;
        completedAt?: string;
        totalDurationMin: number;
        totalWeightLifted: number;
        status: string;
    };
    stats?: {
        exercisesCompleted: number;
        exercisesTotal: number;
        duration: number;
        intensity: number; // 0-10
        volume: number;
        readiness: number; // 0-10
        rating: number; // 1-5
    };
}

const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
};

const containerVariants = {
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export const ClientCompletedTrainingDaySummary = ({
    open,
    onOpenChange,
    workoutName,
    isLoading = false,
    workoutData,
    athlete,
    completedSummary,
    stats = {
        exercisesCompleted: 0,
        exercisesTotal: 0,
        duration: 0,
        intensity: 0,
        volume: 0,
        readiness: 0,
        rating: 0,
    },
}: ClientCompletedTrainingDaySummaryProps) => {
    const t = useTranslations();
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = React.useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!max-w-[55vw] w-[55vw] bg-transparent border-0 shadow-none p-0 outline-none overflow-visible flex gap-3 h-[80vh]"
                onOpenAutoFocus={(e) => e.preventDefault()}
                showCloseButton={false}
            >
                <DialogTitle className="sr-only">Training Day Summary</DialogTitle>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 bg-background rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
                >
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="size-10 text-primary animate-spin" />
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col h-full overflow-hidden py-8 gap-6"
                            >
                                <div className="flex flex-col gap-1 items-center shrink-0 px-5">
                                    <h2 className="text-2xl font-bold tracking-tight text-center bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                                        {workoutName}
                                    </h2>
                                    {(completedSummary?.started_at || completedSummary?.startedAt) && (completedSummary?.completed_at || completedSummary?.completedAt) && (
                                        <p className="text-xs text-muted-foreground/60 font-medium">
                                            {format(new Date((completedSummary.started_at || completedSummary.startedAt)!), 'PPPp')} - {format(new Date((completedSummary.completed_at || completedSummary.completedAt)!), 'p')}
                                        </p>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 px-5">
                                    {(workoutData?.workout_data?.post?.sessionComments || workoutData?.post?.sessionComments) && (
                                        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-2">
                                                {athlete && (
                                                    <Avatar className="size-5 border border-border/50">
                                                        <AvatarImage src={athlete.avatarUrl} alt={athlete.name} />
                                                        <AvatarFallback className="text-[10px]">{athlete.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{athlete?.name}</span>
                                            </div>
                                            <p className="text-sm leading-relaxed text-foreground/80 font-medium">
                                                {workoutData?.workout_data?.post?.sessionComments || workoutData?.post?.sessionComments}
                                            </p>
                                        </div>
                                    )}

                                    {/* Workout Details Section */}
                                    <div className="flex items-center justify-between pt-2">
                                        <h3 className="text-base font-semibold text-foreground">Workout Details</h3>
                                        <button
                                            onClick={() => setIsPreviewDialogOpen(true)}
                                            className="text-xs font-medium text-primary hover:underline focus:outline-none focus:underline"
                                        >
                                            View Full Workout
                                        </button>
                                    </div>

                                    {/* Exercise Cards */}
                                    {(() => {
                                        const items = workoutData?.workout_data?.items || workoutData?.items || [];
                                        const exercises: any[] = [];

                                        // Helper to look up exercise by ID
                                        const getExerciseById = (exerciseId: string) => {
                                            const allExercises = searchExercises('');
                                            return allExercises.find(ex => ex.exerciseId === exerciseId);
                                        };

                                        const processExercise = (exercise: any) => {
                                            const exerciseId = exercise.prescribedExerciseId || exercise.exerciseId || exercise.performedExerciseId;

                                            // Enhanced name resolution
                                            let exerciseName = exercise.performedExerciseName || exercise.prescribedExerciseName || exercise.name || exercise.exerciseName;
                                            if (!exerciseName && exerciseId) {
                                                const details = getExerciseById(exerciseId);
                                                if (details) exerciseName = details.name;
                                            }
                                            exerciseName = exerciseName || 'Unknown Exercise';

                                            const exerciseType = exercise.exerciseType || 'weight_reps';
                                            let sets = exercise.sets || [];

                                            // Handle single-set exercises (AMRAP/Circuit)
                                            if ((!exercise.sets || exercise.sets.length === 0) &&
                                                (exercise.reps || exercise.weight || exercise.distance || exercise.durationSec || exercise.completed !== undefined)) {
                                                sets = [{
                                                    ...exercise,
                                                    setNumber: 1,
                                                    type: exercise.type || 'normal'
                                                }];
                                            }

                                            // Handle Dropsets: Transform stages into arrays for weight/reps
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

                                            if (exerciseId || exerciseName !== 'Unknown Exercise') {
                                                exercises.push({ exerciseId, name: exerciseName, exerciseType, sets });
                                            }
                                        };

                                        for (const item of items) {
                                            if (item.itemType === 'section' && item.data?.exercises) {
                                                for (const groupOrExercise of item.data.exercises) {
                                                    if (groupOrExercise.exercises && Array.isArray(groupOrExercise.exercises)) {
                                                        for (const exercise of groupOrExercise.exercises) {
                                                            processExercise(exercise);
                                                        }
                                                    } else {
                                                        processExercise(groupOrExercise);
                                                    }
                                                }
                                            } else if (item.itemType === 'exercise') {
                                                const exerciseData = item.data || item.exercise;
                                                if (exerciseData) processExercise(exerciseData);
                                            }
                                        }

                                        const formatSetValue = (set: any, exerciseType: string, isCompleted: boolean) => {
                                            const getValue = (key: string) => {
                                                const val = set[key];
                                                if (val === null || val === undefined) return null;

                                                const extract = (v: any) => {
                                                    if (typeof v === 'object' && v !== null) {
                                                        return isCompleted ? (v.completed ?? v.prescribed) : v.prescribed;
                                                    }
                                                    return v;
                                                };

                                                if (Array.isArray(val)) {
                                                    // Dropset: array of values joined with '-'
                                                    return val.map(extract).join('-');
                                                }

                                                if (typeof val === 'object') {
                                                    const extracted = extract(val);
                                                    if (Array.isArray(extracted)) return extracted.join('-');
                                                    return extracted;
                                                }
                                                return val;
                                            };

                                            const weight = getValue('weight');
                                            const reps = getValue('reps');
                                            const distance = getValue('distance');
                                            const durationSec = getValue('durationSec');

                                            switch (exerciseType) {
                                                case 'distance_duration':
                                                    return `${distance ?? '-'}m / ${durationSec ?? '-'}s`;
                                                case 'weight_reps':
                                                default:
                                                    if (weight && reps) return `${weight} kg x ${reps}`;
                                                    if (reps) return `${reps} reps`;
                                                    if (weight) return `${weight} kg`;
                                                    if (distance) return `${distance}m`;
                                                    if (durationSec) return `${durationSec}s`;
                                                    return '-';
                                            }
                                        };

                                        return (
                                            <div className="flex flex-col gap-3">
                                                {exercises.map((exercise, exIndex) => (
                                                    <motion.div
                                                        key={exIndex}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: exIndex * 0.1 + 0.2, duration: 0.3 }}
                                                        className="rounded-xl border border-border/50 bg-card overflow-hidden"
                                                    >
                                                        {/* Exercise Header */}
                                                        <div className="flex items-center justify-between px-4 py-3">
                                                            <span className="text-sm font-bold text-primary">{exercise.name}</span>
                                                            <button className="text-xs font-medium text-primary hover:underline">
                                                                History
                                                            </button>
                                                        </div>
                                                        {/* Set Rows */}
                                                        <div className="flex flex-col">
                                                            {exercise.sets.map((set: any, setIndex: number) => {
                                                                const isCompleted = set.completed === true;
                                                                const displayValue = formatSetValue(set, exercise.exerciseType, isCompleted);
                                                                return (
                                                                    <div
                                                                        key={setIndex}
                                                                        className={cn(
                                                                            "flex items-center justify-between px-4 py-2",
                                                                            setIndex < exercise.sets.length - 1 && "border-b border-border/20"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-muted-foreground font-medium w-6">
                                                                                {String(setIndex + 1).padStart(2, '0')}.
                                                                            </span>
                                                                            {isCompleted ? (
                                                                                <span
                                                                                    className="text-sm font-semibold text-foreground cursor-default"
                                                                                    title="Client tracked values"
                                                                                >
                                                                                    {displayValue}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-sm font-semibold text-red-500">
                                                                                    {displayValue}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {isCompleted ? (
                                                                            <CircleCheck className="size-5 text-green-500" />
                                                                        ) : (
                                                                            <span className="text-xs font-bold text-red-500">
                                                                                Missed
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="w-32 bg-sidebar/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-center py-4 gap-4 overflow-hidden relative group"
                >
                    {/* Decorative Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />

                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center relative z-10">
                            <Loader2 className="size-10 text-primary animate-spin" />
                        </div>
                    ) : (
                        <motion.div
                            key="metrics"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-col gap-4 relative z-10"
                        >
                            {/* Exercises */}
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, x: -2 }}
                                className="flex flex-col items-center gap-1 text-center h-fit"
                            >
                                <div className="p-2 rounded-xl bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                                    <CircleCheck className="size-7 text-green-500 shrink-0" />
                                </div>
                                <div className="flex flex-col items-center gap-0">
                                    <span className="text-base font-bold leading-tight tabular-nums">{stats.exercisesCompleted}/{stats.exercisesTotal}</span>
                                    <span className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-bold">{t('home.exercises')}</span>
                                </div>
                            </motion.div>

                            {/* Duration */}
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, x: -2 }}
                                className="flex flex-col items-center gap-1 text-center h-fit relative z-10"
                            >
                                <div className="p-2 rounded-xl bg-foreground/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                                    <Clock className="size-7 text-foreground shrink-0" />
                                </div>
                                <div className="flex flex-col items-center gap-0">
                                    <span className="text-base font-bold leading-tight tabular-nums">{stats.duration}</span>
                                    <span className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-bold">{t('home.minutes')}</span>
                                </div>
                            </motion.div>

                            {/* Readiness */}
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, x: -2 }}
                                className="flex flex-col items-center gap-1 text-center h-fit relative z-10"
                            >
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    stats.readiness <= 3 ? "bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]" :
                                        stats.readiness <= 7 ? "bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]" :
                                            "bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                                )}>
                                    <Activity
                                        className={cn(
                                            'size-7 shrink-0',
                                            stats.readiness <= 3 ? 'text-red-500' :
                                                stats.readiness <= 7 ? 'text-amber-500' :
                                                    'text-green-500'
                                        )}
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-0">
                                    <span className="text-base font-bold leading-tight tabular-nums">{stats.readiness}</span>
                                    <span className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-bold">Readiness</span>
                                </div>
                            </motion.div>

                            {/* Intensity */}
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, x: -2 }}
                                className="flex flex-col items-center gap-1 text-center h-fit relative z-10"
                            >
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    stats.intensity <= 3 ? "bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]" :
                                        stats.intensity <= 7 ? "bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]" :
                                            "bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                                )}>
                                    <Gauge
                                        className={cn(
                                            'size-7 shrink-0',
                                            stats.intensity <= 3 ? 'text-red-500' :
                                                stats.intensity <= 7 ? 'text-amber-500' :
                                                    'text-green-500'
                                        )}
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-0">
                                    <span className="text-base font-bold leading-tight tabular-nums">{stats.intensity}</span>
                                    <span className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-bold">{t('home.intensity')}</span>
                                </div>
                            </motion.div>

                            {/* Volume */}
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, x: -2 }}
                                className="flex flex-col items-center gap-1 text-center h-fit relative z-10"
                            >
                                <div className="p-2 rounded-xl bg-foreground/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                                    <Weight className="size-7 text-foreground shrink-0" />
                                </div>
                                <div className="flex flex-col items-center gap-0">
                                    <span className="text-base font-bold leading-tight tabular-nums">{stats.volume}kg</span>
                                    <span className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-bold">{t('home.weight')}</span>
                                </div>
                            </motion.div>

                            {/* Rating */}
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, x: -2 }}
                                className="flex flex-col items-center gap-1 text-center h-fit relative z-10"
                            >
                                <div className="relative p-2 rounded-xl bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.15)]">
                                    <div className="relative size-7 shrink-0">
                                        {/* Background Star (Stroke) */}
                                        <Star className="size-7 text-primary" strokeWidth={2} />
                                        {/* Foreground Star (Filled) */}
                                        <div
                                            className="absolute inset-y-0 left-0 overflow-hidden"
                                            style={{ width: `${(stats.rating / 5) * 100}%` }}
                                        >
                                            <Star className="size-7 text-primary fill-primary" strokeWidth={2} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-0">
                                    <span className="text-base font-bold leading-tight tabular-nums">{stats.rating}</span>
                                    <span className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-bold">Rating</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </motion.div>
            </DialogContent>

            <WorkoutPreviewDialog
                open={isPreviewDialogOpen}
                onOpenChange={setIsPreviewDialogOpen}
                workoutData={workoutData}
            />
        </Dialog>
    );
};;
