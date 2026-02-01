'use client';

import React from 'react';
import { Loader2, MessageSquare, Moon, Sun, Zap, Brain, Dumbbell, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/general/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { format } from 'date-fns';
import { WorkoutPreviewContent } from './workout-preview-content';
import { ExerciseHistoryPanel } from './exercise-history-panel';
import { searchExercises } from '@/api/exercise/exercise-search';
import { useUserProfile } from '@/hooks/use-user-profile';

// Rating colors matching the mobile app (1-5 scale)
const RATING_COLORS = [
    '#EF4444', // 1 - red
    '#F97316', // 2 - orange
    '#FBBF24', // 3 - amber/yellow
    '#84CC16', // 4 - lime
    '#22C55E', // 5 - green
];

const getRatingColor = (value: number) => RATING_COLORS[value - 1] || RATING_COLORS[2];

// Inverted color scale for metrics where lower is better (stress, soreness)
const getRatingColorInverted = (value: number) => RATING_COLORS[5 - value] || RATING_COLORS[2];

interface ClientTrainingDaySummaryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutName: string;
    clientId?: string; // Client ID - if not provided, will try to get from URL params
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
        intensity: number; // 1-5
        volume: number;
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

export const ClientTrainingDaySummary = ({
    open,
    onOpenChange,
    workoutName,
    clientId: clientIdProp,
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
        rating: 0,
    },
}: ClientTrainingDaySummaryProps) => {
    const t = useTranslations();
    const params = useParams();
    const router = useRouter();
    // Use prop if provided, otherwise fallback to URL params
    const clientId = clientIdProp || (params.clientId as string);

    const [historyExercise, setHistoryExercise] = React.useState<any | null>(null);
    const { user } = useUserProfile();
    const coachId = user?.id;

    // Determine if workout is in progress (started but not completed)
    const completedAt = completedSummary?.completed_at || completedSummary?.completedAt;
    const startedAt = completedSummary?.started_at || completedSummary?.startedAt;
    const isInProgress = !completedAt && (!!startedAt || completedSummary?.status === 'started' || completedSummary?.status === 'in_progress');

    // Extract pre-workout readiness scores (mood, sleep, energy, stress, soreness)
    const pre = workoutData?.workout_data?.pre || workoutData?.pre || {};
    const post = workoutData?.workout_data?.post || workoutData?.post || {};

    // Process exercises for stats calculation
    const items = workoutData?.workout_data?.items || workoutData?.items || [];
    const exercises: any[] = [];

    const processExerciseForStats = (exercise: any) => {
        let sets = exercise.sets || [];
        if ((!exercise.sets || exercise.sets.length === 0) &&
            (exercise.reps || exercise.weight || exercise.distance || exercise.durationSec || exercise.completed !== undefined)) {
            sets = [exercise];
        }
        exercises.push({ sets });
    };

    for (const item of items) {
        if (item.itemType === 'section' && item.data?.exercises) {
            for (const groupOrExercise of item.data.exercises) {
                if (groupOrExercise.exercises && Array.isArray(groupOrExercise.exercises)) {
                    for (const exercise of groupOrExercise.exercises) {
                        processExerciseForStats(exercise);
                    }
                } else {
                    processExerciseForStats(groupOrExercise);
                }
            }
        } else if (item.itemType === 'exercise') {
            const exerciseData = item.data || item.exercise;
            if (exerciseData) processExerciseForStats(exerciseData);
        }
    }

    // Calculate internal stats for the sidebar
    const exercisesTotalSpan = exercises.length;
    const exercisesCompletedSpan = exercises.filter((ex: any) => ex.sets && ex.sets.length > 0 && ex.sets.every((s: any) => s.completed === true)).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "bg-transparent border-0 shadow-none p-0 outline-none overflow-visible flex gap-3 h-[88vh]",
                    historyExercise ? "!max-w-[80vw] w-[80vw]" : "!max-w-[55vw] w-[55vw]"
                )}
                onOpenAutoFocus={(e) => e.preventDefault()}
                showCloseButton={false}
                style={{
                    '--sidebar': 'color-mix(in srgb, var(--primary), var(--sidebar-mix-base) 35%)',
                    '--sidebar-foreground': 'var(--primary-foreground)',
                    '--sidebar-primary': 'var(--primary-foreground)',
                    '--sidebar-primary-foreground': 'var(--primary)',
                    '--sidebar-accent': 'color-mix(in srgb, var(--primary-foreground) 30%, transparent)',
                    '--sidebar-accent-foreground': 'var(--primary-foreground)',
                    '--sidebar-border': 'color-mix(in srgb, var(--primary-foreground) 10%, transparent)',
                    '--sidebar-ring': 'var(--primary-foreground)',
                } as React.CSSProperties}
            >
                <DialogTitle className="sr-only">Training Day Summary</DialogTitle>

                <LayoutGroup>
                    {/* Readiness Sidebar - Left Side */}
                    <motion.div
                        layout
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-36 shrink-0 bg-background rounded-2xl shadow-2xl flex flex-col relative group border border-border/50 overflow-y-auto overflow-x-hidden custom-scrollbar no-scrollbar"
                    >

                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center relative z-10 min-h-full">
                                <Loader2 className="size-10 text-foreground animate-spin" />
                            </div>
                        ) : (
                            <motion.div
                                key="metrics"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="flex flex-col justify-evenly relative z-10 h-full py-4"
                            >
                                {/* Pre-workout Section Header */}
                                <div className="text-center">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold">Readiness</span>
                                </div>

                                {/* Sleep */}
                                {pre.sleep !== undefined && pre.sleep !== null && (
                                    <motion.div
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, x: 2 }}
                                        className="flex flex-col items-center gap-1 text-center h-fit"
                                    >
                                        <div
                                            className="p-2.5 rounded-xl"
                                            style={{ backgroundColor: `${getRatingColor(pre.sleep)}15` }}
                                        >
                                            <Moon
                                                className="size-8 shrink-0"
                                                style={{ color: getRatingColor(pre.sleep) }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-sm font-bold leading-tight tabular-nums text-foreground">{pre.sleep}/5</span>
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-bold">Sleep</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Mood */}
                                {pre.mood !== undefined && pre.mood !== null && (
                                    <motion.div
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, x: 2 }}
                                        className="flex flex-col items-center gap-1 text-center h-fit"
                                    >
                                        <div
                                            className="p-2.5 rounded-xl"
                                            style={{ backgroundColor: `${getRatingColor(pre.mood)}15` }}
                                        >
                                            <Sun
                                                className="size-8 shrink-0"
                                                style={{ color: getRatingColor(pre.mood) }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-sm font-bold leading-tight tabular-nums text-foreground">{pre.mood}/5</span>
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-bold">Mood</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Energy */}
                                {pre.energy !== undefined && pre.energy !== null && (
                                    <motion.div
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, x: 2 }}
                                        className="flex flex-col items-center gap-1 text-center h-fit"
                                    >
                                        <div
                                            className="p-2.5 rounded-xl"
                                            style={{ backgroundColor: `${getRatingColor(pre.energy)}15` }}
                                        >
                                            <Zap
                                                className="size-8 shrink-0"
                                                style={{ color: getRatingColor(pre.energy) }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-sm font-bold leading-tight tabular-nums text-foreground">{pre.energy}/5</span>
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-bold">Energy</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stress - inverted scale (lower is better) */}
                                {pre.stress !== undefined && pre.stress !== null && (
                                    <motion.div
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, x: 2 }}
                                        className="flex flex-col items-center gap-1 text-center h-fit"
                                    >
                                        <div
                                            className="p-2.5 rounded-xl"
                                            style={{ backgroundColor: `${getRatingColorInverted(pre.stress)}15` }}
                                        >
                                            <Brain
                                                className="size-8 shrink-0"
                                                style={{ color: getRatingColorInverted(pre.stress) }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-sm font-bold leading-tight tabular-nums text-foreground">{pre.stress}/5</span>
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-bold">Stress</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Soreness - inverted scale (lower is better) */}
                                {pre.soreness !== undefined && pre.soreness !== null && (
                                    <motion.div
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, x: 2 }}
                                        className="flex flex-col items-center gap-1 text-center h-fit"
                                    >
                                        <div
                                            className="p-2.5 rounded-xl"
                                            style={{ backgroundColor: `${getRatingColorInverted(pre.soreness)}15` }}
                                        >
                                            <Dumbbell
                                                className="size-8 shrink-0"
                                                style={{ color: getRatingColorInverted(pre.soreness) }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-sm font-bold leading-tight tabular-nums text-foreground">{pre.soreness}/5</span>
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-bold">Soreness</span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Main Content */}
                    <motion.div
                        layout="position"
                        layoutId="main-summary"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-[calc(55vw-12rem)] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden relative shrink-0"
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
                                    className="flex flex-col h-full overflow-hidden gap-[0.5px]"
                                >
                                    <div className="flex flex-col justify-center gap-1 items-start shrink-0 bg-sidebar h-[180px] px-5 border-b border-sidebar-foreground/10">
                                        <div className="flex items-center justify-between w-full">
                                            <h2 className="text-2xl font-bold tracking-tight text-sidebar-foreground">
                                                {workoutName}
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                {isInProgress && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-sidebar-foreground/50 text-sidebar-foreground bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest h-9"
                                                    >
                                                        In Progress
                                                    </Badge>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => router.push(`/inbox/${clientId}`)}
                                                            className="p-2 rounded-xl bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 text-sidebar-foreground transition-all duration-200 group/msg h-9 w-9 flex items-center justify-center"
                                                        >
                                                            <MessageSquare className="size-5 transition-transform group-hover/msg:scale-110" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Message Client</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => onOpenChange(false)}
                                                            className="p-2 rounded-xl bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 text-sidebar-foreground transition-all duration-200 group/close h-9 w-9 flex items-center justify-center"
                                                        >
                                                            <X className="size-5 transition-transform group-hover/close:scale-110" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Close</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        {(completedSummary?.started_at || completedSummary?.startedAt) && (completedSummary?.completed_at || completedSummary?.completedAt) ? (
                                            <p className="text-xs text-sidebar-foreground/70 font-medium">
                                                {format(new Date((completedSummary.started_at || completedSummary.startedAt)!), 'PPPp')} - {format(new Date((completedSummary.completed_at || completedSummary.completedAt)!), 'p')}
                                            </p>
                                        ) : isInProgress ? (
                                            <p className="text-xs text-sidebar-foreground/70 font-medium">
                                                {format(new Date(), 'MMMM do, yyyy')}
                                            </p>
                                        ) : null}
                                        <div className="flex flex-col gap-2 w-full mt-2 p-3 rounded-xl bg-sidebar-foreground/10 border border-sidebar-foreground/20">
                                            <div className="flex items-center gap-2">
                                                {athlete && (
                                                    <Avatar className="size-5 border border-sidebar-foreground/30">
                                                        <AvatarImage src={athlete.avatarUrl} alt={athlete.name} />
                                                        <AvatarFallback className="text-[10px] bg-sidebar-foreground/20 text-sidebar-foreground">{athlete.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/80">Workout Comment</span>
                                            </div>
                                            <p className={cn(
                                                "text-sm leading-relaxed font-medium",
                                                (workoutData?.workout_data?.post?.sessionComments || workoutData?.post?.sessionComments)
                                                    ? "text-sidebar-foreground"
                                                    : "text-sidebar-foreground/40 italic"
                                            )}>
                                                {workoutData?.workout_data?.post?.sessionComments || workoutData?.post?.sessionComments || "No comment provided"}
                                            </p>
                                        </div>
                                    </div>
                                    <WorkoutPreviewContent
                                        workoutData={workoutData}
                                        onHistoryClick={(ex) => setHistoryExercise(ex)}
                                        postStats={{
                                            intensity: post.intensity,
                                            rating: post.rating,
                                            exercisesCompleted: exercisesCompletedSpan,
                                            exercisesTotal: exercisesTotalSpan,
                                            duration: stats.duration,
                                            volume: stats.volume,
                                        }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </motion.div>

                    <AnimatePresence mode="sync">
                        {historyExercise && (
                            <ExerciseHistoryPanel
                                exerciseId={historyExercise?.id || historyExercise?.exerciseId}
                                exerciseName={historyExercise?.name || 'Exercise'}
                                clientId={clientId}
                                coachId={coachId || ''}
                                onClose={() => setHistoryExercise(null)}
                            />
                        )}
                    </AnimatePresence>

                </LayoutGroup>
            </DialogContent>

        </Dialog>
    );
};;
