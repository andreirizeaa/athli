'use client';

import React, { useState } from 'react';
import { Send, CircleCheck, Clock, Gauge, Weight, Activity, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/general/utils';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientCompletedTrainingDaySummaryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutName: string;
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

export const ClientCompletedTrainingDaySummary = ({
    open,
    onOpenChange,
    workoutName,
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!max-w-[45vw] w-[45vw] bg-background rounded-xl border shadow-lg p-0 outline-none overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogTitle className="sr-only">Training Day Summary</DialogTitle>

                {/* Workout Details - Now the only content */}
                <div className="flex flex-col h-[80vh] overflow-hidden p-6 gap-6">
                    <div className="flex flex-col gap-6">
                        <h2 className="text-2xl font-bold tracking-tight text-center shrink-0">{workoutName}</h2>

                        {/* Stats Row */}
                        <div className="grid grid-cols-6 gap-4">
                            {/* Exercises */}
                            <div className="flex flex-col items-center gap-3">
                                <CircleCheck className="size-10 text-green-600 dark:text-green-500" />
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-lg font-bold">{stats.exercisesCompleted}/{stats.exercisesTotal}</span>
                                    <span className="text-xs text-muted-foreground">{t('home.exercises')}</span>
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="flex flex-col items-center gap-3">
                                <Clock className="size-10 text-foreground" />
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-lg font-bold">{stats.duration}</span>
                                    <span className="text-xs text-muted-foreground">{t('home.minutes')}</span>
                                </div>
                            </div>

                            {/* Readiness */}
                            <div className="flex flex-col items-center gap-3">
                                <Activity className="size-10 text-blue-600 dark:text-blue-500" />
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-lg font-bold">{(stats.readiness * 10).toFixed(0)}%</span>
                                    <span className="text-xs text-muted-foreground">Readiness</span>
                                </div>
                            </div>

                            {/* Intensity */}
                            <div className="flex flex-col items-center gap-3">
                                <Gauge
                                    className={cn(
                                        'size-10',
                                        (stats.intensity * 10) <= 25
                                            ? 'text-green-600 dark:text-green-500'
                                            : (stats.intensity * 10) <= 60
                                                ? 'text-amber-600 dark:text-amber-500'
                                                : 'text-red-600 dark:text-red-500'
                                    )}
                                />
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-lg font-bold">{(stats.intensity * 10).toFixed(0)}%</span>
                                    <span className="text-xs text-muted-foreground">{t('home.intensity')}</span>
                                </div>
                            </div>

                            {/* Volume */}
                            <div className="flex flex-col items-center gap-3">
                                <Weight className="size-10 text-foreground" />
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-lg font-bold">{stats.volume}kg</span>
                                    <span className="text-xs text-muted-foreground">{t('home.weight')}</span>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex gap-0.5 items-center justify-center h-10">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                "size-3.5",
                                                star <= stats.rating
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "fill-muted text-muted-foreground/20"
                                            )}
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-lg font-bold">{stats.rating}/5</span>
                                    <span className="text-xs text-muted-foreground">Rating</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {/* Content will go here */}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
