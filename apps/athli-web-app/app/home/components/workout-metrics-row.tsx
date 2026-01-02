'use client';

import React from 'react';
import { CircleCheck, Clock, Gauge, Weight, Activity, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/general/utils';

interface WorkoutMetricsRowProps {
    exercisesCompleted: number;
    exercisesTotal: number;
    minutes: number;
    volume: number;
    intensity: number; // 0-10
    readiness: number; // 0-10
    rating: number; // 1-5
}

export const WorkoutMetricsRow = ({
    exercisesCompleted,
    exercisesTotal,
    minutes,
    volume,
    intensity,
    readiness,
    rating,
}: WorkoutMetricsRowProps) => {
    const t = useTranslations();

    return (
        <div className="flex items-center justify-between w-full px-2 gap-4">
            {/* Exercises */}
            <div className="flex flex-col items-center gap-1 text-center">
                <div className="p-2 rounded-xl bg-green-500/10 dark:bg-green-500/20">
                    <CircleCheck className="size-5 text-green-600 dark:text-green-500 shrink-0" />
                </div>
                <div className="flex flex-col items-center gap-0">
                    <span className="text-sm font-bold leading-tight tabular-nums">
                        {exercisesCompleted}/{exercisesTotal}
                    </span>
                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.05em] font-bold">
                        {t('home.exercises')}
                    </span>
                </div>
            </div>

            {/* Duration */}
            <div className="flex flex-col items-center gap-1 text-center">
                <div className="p-2 rounded-xl bg-foreground/5 dark:bg-foreground/10">
                    <Clock className="size-5 text-foreground shrink-0" />
                </div>
                <div className="flex flex-col items-center gap-0">
                    <span className="text-sm font-bold leading-tight tabular-nums">{minutes}</span>
                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.05em] font-bold">
                        {t('home.minutes')}
                    </span>
                </div>
            </div>

            {/* Readiness */}
            <div className="flex flex-col items-center gap-1 text-center">
                <div className={cn(
                    "p-2 rounded-xl",
                    readiness <= 3 ? "bg-red-500/10 dark:bg-red-500/20" :
                        readiness <= 7 ? "bg-amber-500/10 dark:bg-amber-500/20" :
                            "bg-green-500/10 dark:bg-green-500/20"
                )}>
                    <Activity
                        className={cn(
                            'size-5 shrink-0',
                            readiness <= 3 ? 'text-red-600 dark:text-red-500' :
                                readiness <= 7 ? 'text-amber-600 dark:text-amber-500' :
                                    'text-green-600 dark:text-green-500'
                        )}
                    />
                </div>
                <div className="flex flex-col items-center gap-0">
                    <span className="text-sm font-bold leading-tight tabular-nums">{readiness}</span>
                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.05em] font-bold">
                        Readiness
                    </span>
                </div>
            </div>

            {/* Intensity */}
            <div className="flex flex-col items-center gap-1 text-center">
                <div className={cn(
                    "p-2 rounded-xl",
                    intensity <= 3 ? "bg-red-500/10 dark:bg-red-500/20" :
                        intensity <= 7 ? "bg-amber-500/10 dark:bg-amber-500/20" :
                            "bg-green-500/10 dark:bg-green-500/20"
                )}>
                    <Gauge
                        className={cn(
                            'size-5 shrink-0',
                            intensity <= 3 ? 'text-red-600 dark:text-red-500' :
                                intensity <= 7 ? 'text-amber-600 dark:text-amber-500' :
                                    'text-green-600 dark:text-green-500'
                        )}
                    />
                </div>
                <div className="flex flex-col items-center gap-0">
                    <span className="text-sm font-bold leading-tight tabular-nums">{intensity}</span>
                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.05em] font-bold">
                        {t('home.intensity')}
                    </span>
                </div>
            </div>

            {/* Volume */}
            <div className="flex flex-col items-center gap-1 text-center">
                <div className="p-2 rounded-xl bg-foreground/5 dark:bg-foreground/10">
                    <Weight className="size-5 text-foreground shrink-0" />
                </div>
                <div className="flex flex-col items-center gap-0">
                    <span className="text-sm font-bold leading-tight tabular-nums">{volume}kg</span>
                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.05em] font-bold">
                        {t('home.weight')}
                    </span>
                </div>
            </div>

            {/* Rating */}
            <div className="flex flex-col items-center gap-1 text-center">
                <div className="relative p-2 rounded-xl bg-primary/10">
                    <div className="relative size-5 shrink-0">
                        <Star className="size-5 text-primary" strokeWidth={2} />
                        <div
                            className="absolute inset-y-0 left-0 overflow-hidden"
                            style={{ width: `${(rating / 5) * 100}%` }}
                        >
                            <Star className="size-5 text-primary fill-primary" strokeWidth={2} />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-0">
                    <span className="text-sm font-bold leading-tight tabular-nums">{rating}</span>
                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.05em] font-bold">
                        Rating
                    </span>
                </div>
            </div>
        </div>
    );
};
