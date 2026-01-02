'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkoutMetricsRow } from './workout-metrics-row';
import { useRouter } from 'next/navigation';
import { EnrichedWorkout } from '@/hooks/use-coach-home-data';
import { cn } from '@/lib/general/utils';
import { MessageCircle } from 'lucide-react';

interface WorkoutCardProps {
    workout: EnrichedWorkout;
    workoutType?: 'completed' | 'in_progress' | 'missed';
    onHover?: () => void;
    onClick?: () => void;
    onAvatarClick?: (e: React.MouseEvent) => void;
    className?: string;
}

export const WorkoutCard = ({
    workout,
    workoutType = 'completed',
    onHover,
    onClick,
    onAvatarClick,
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
                            <div className="flex flex-col gap-1 overflow-hidden">
                                <span className="text-sm font-medium truncate">{workout.clientName}</span>
                                <p className="text-xs text-muted-foreground truncate">{workout.workoutName}</p>
                            </div>
                        </div>
                        {isMissed && (
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

                    {!isMissed && (
                        <WorkoutMetricsRow
                            exercisesCompleted={workout.exercisesCompleted}
                            exercisesTotal={workout.exercisesTotal}
                            minutes={workout.minutes}
                            volume={workout.volume}
                            intensity={workout.intensity}
                            readiness={workout.readiness}
                            rating={workout.rating}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
