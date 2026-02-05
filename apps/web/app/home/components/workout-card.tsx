'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkoutMetricsRow } from './workout-metrics-row';
import { useRouter } from 'next/navigation';
import { EnrichedWorkout } from '@/hooks/use-coach-home-data';
import { cn } from '@/lib/general/utils';
import { MessageCircle, Loader2 } from 'lucide-react';

interface WorkoutCardProps {
    workout: EnrichedWorkout;
    workoutType?: 'completed' | 'in_progress' | 'missed';
    onHover?: () => void;
    onClick?: () => void;
    onAvatarClick?: (e: React.MouseEvent) => void;
    isLoading?: boolean;
    className?: string;
}

export const WorkoutCard = ({
    workout,
    workoutType = 'completed',
    onHover,
    onClick,
    onAvatarClick,
    isLoading = false,
    className
}: WorkoutCardProps) => {
    const router = useRouter();

    const handleAvatarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAvatarClick) {
            onAvatarClick(e);
            return;
        }
        // Default navigation
        router.push(`/athletes/${workout.client_id}/overview`);
    };

    const handleMessageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/inbox/${workout.client_id}`);
    };

    const isMissed = workoutType === 'missed';

    // Parse metrics from workout_data (matching client-training-day-summary pattern)
    const metrics = useMemo(() => {
        const wd = workout.workout_data?.workout_data || workout.workout_data || {};
        const items = wd.items || [];
        const pre = workout.workout_data?.workout_data?.pre || workout.workout_data?.pre || {};
        const post = workout.workout_data?.workout_data?.post || workout.workout_data?.post || {};
        const completedSummary = wd.completedSummary || {};

        // Count exercises
        let totalExercises = 0;
        let completedExercises = 0;

        const processItems = (itemsList: any[]) => {
            for (const item of itemsList) {
                if (item.itemType === 'exercise') {
                    totalExercises++;
                    const sets = item.data?.sets || [];
                    if (sets.length > 0 && sets.every((s: any) => s.completed)) {
                        completedExercises++;
                    }
                } else if (item.itemType === 'section') {
                    const sectionExercises = item.data?.exercises || [];
                    sectionExercises.forEach((group: any) => {
                        if (group.exercises) {
                            // Superset with nested exercises
                            group.exercises.forEach((ex: any) => {
                                totalExercises++;
                                const sets = ex.sets || [];
                                if (sets.length > 0 && sets.every((s: any) => s.completed)) {
                                    completedExercises++;
                                }
                            });
                        } else if (group.prescribedExerciseId || group.performedExerciseId) {
                            // AMRAP-style section with direct exercise objects
                            totalExercises++;
                            if (group.completed) {
                                completedExercises++;
                            }
                        }
                    });
                }
            }
        };
        processItems(items);

        return {
            exercisesCompleted: completedExercises,
            exercisesTotal: totalExercises || workout.workout_data?.total_exercises || 0,
            minutes: completedSummary.totalDurationMin || 0,
            intensity: post.intensity || 0,
            rating: post.rating || 0,
            readiness: {
                sleep: pre.sleep,
                mood: pre.mood,
                energy: pre.energy,
                stress: pre.stress,
                soreness: pre.soreness,
            },
        };
    }, [workout.workout_data]);

    // Get workout name from data
    const workoutName = workout.workout_data?.name || 'Workout assigned';

    return (
        <Card
            className={cn("bg-background border cursor-default transition-colors hover:bg-muted/30 group relative", className)}
            onMouseEnter={onHover}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="cursor-pointer flex-shrink-0"
                                        onClick={handleAvatarClick}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                handleAvatarClick(e as any);
                                            }
                                        }}
                                    >
                                        <Avatar className="h-10 w-10 transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2">
                                            <AvatarImage src={workout.clientAvatar || undefined} alt={workout.clientName} />
                                            <AvatarFallback>{workout.clientName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>View profile</p>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                <span className="text-sm font-medium truncate">{workout.clientName}</span>
                                <p className="text-xs text-muted-foreground truncate">{workoutName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isLoading && (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                            {isMissed && !isLoading && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-2 text-primary border-primary hover:bg-primary/5"
                                            onClick={handleMessageClick}
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            <span>Message</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Send a message to {workout.clientName}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    {/* Show metrics row for completed and in_progress */}
                    {!isMissed && workout.workout_data && (
                        <WorkoutMetricsRow
                            exercisesCompleted={metrics.exercisesCompleted}
                            exercisesTotal={metrics.exercisesTotal}
                            minutes={metrics.minutes}
                            intensity={metrics.intensity}
                            rating={metrics.rating}
                            readiness={metrics.readiness}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
