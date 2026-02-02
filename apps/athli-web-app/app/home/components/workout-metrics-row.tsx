'use client';

import React from 'react';
import { CircleCheck, Clock, Gauge, Star, Moon, Sun, Zap, Brain, Dumbbell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Rating colors matching the mobile app (1-5 scale)
const RATING_COLORS = [
    '#EF4444', // 1 - red
    '#F97316', // 2 - orange
    '#FBBF24', // 3 - amber/yellow
    '#84CC16', // 4 - lime
    '#22C55E', // 5 - green
];

const getRatingColor = (value: number) => RATING_COLORS[value - 1] || RATING_COLORS[2];
const getRatingColorInverted = (value: number) => RATING_COLORS[5 - value] || RATING_COLORS[2];

interface ReadinessMetrics {
    sleep?: number | null;
    mood?: number | null;
    energy?: number | null;
    stress?: number | null;
    soreness?: number | null;
}

interface WorkoutMetricsRowProps {
    exercisesCompleted: number;
    exercisesTotal: number;
    minutes: number;
    intensity: number; // 1-5
    rating: number; // 1-5
    readiness: ReadinessMetrics;
}

// Readiness icon component matching the dialog style
const ReadinessIcon = ({
    value,
    icon: Icon,
    label,
    inverted = false,
}: {
    value: number | null | undefined;
    icon: React.ElementType;
    label: string;
    inverted?: boolean;
}) => {
    const hasValue = value !== null && value !== undefined;
    const color = hasValue
        ? (inverted ? getRatingColorInverted(value) : getRatingColor(value))
        : undefined;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                    <div
                        className={`p-2.5 rounded-xl ${!hasValue ? 'bg-muted/50' : ''}`}
                        style={hasValue ? { backgroundColor: `${color}15` } : undefined}
                    >
                        <Icon
                            className={`size-6 ${!hasValue ? 'text-muted-foreground/30' : ''}`}
                            style={hasValue ? { color } : undefined}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold tabular-nums ${!hasValue ? 'text-muted-foreground/30' : ''}`}>
                            {hasValue ? `${value}/5` : '-'}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
                <span className="font-medium">{label}:</span> {hasValue ? `${value}/5` : 'No data'}
            </TooltipContent>
        </Tooltip>
    );
};

export const WorkoutMetricsRow = ({
    exercisesCompleted,
    exercisesTotal,
    minutes,
    intensity,
    rating,
    readiness,
}: WorkoutMetricsRowProps) => {
    const t = useTranslations();

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Readiness Section */}
            <div className="flex flex-col gap-2">
                <span className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.15em] font-bold text-center">
                    Readiness
                </span>
                <div className="flex items-center justify-center gap-5">
                    <ReadinessIcon value={readiness.sleep} icon={Moon} label="Sleep" />
                    <ReadinessIcon value={readiness.mood} icon={Sun} label="Mood" />
                    <ReadinessIcon value={readiness.energy} icon={Zap} label="Energy" />
                    <ReadinessIcon value={readiness.stress} icon={Brain} label="Stress" inverted />
                    <ReadinessIcon value={readiness.soreness} icon={Dumbbell} label="Soreness" inverted />
                </div>
            </div>

            {/* Summary Section */}
            <div className="flex flex-col gap-2">
                <span className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.15em] font-bold text-center">
                    Summary
                </span>
                <div className="flex items-center justify-center gap-5">
                    {/* Intensity */}
                    <div className="flex items-center gap-2">
                        <div
                            className="p-2.5 rounded-xl"
                            style={{ backgroundColor: intensity > 0 ? `${getRatingColor(intensity)}15` : 'var(--muted)' }}
                        >
                            <Gauge
                                className="size-6"
                                style={{ color: intensity > 0 ? getRatingColor(intensity) : 'var(--muted-foreground)' }}
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tabular-nums">{intensity > 0 ? `${intensity}/5` : '-'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Intensity</span>
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                        <div
                            className="p-2.5 rounded-xl"
                            style={{ backgroundColor: rating > 0 ? `${getRatingColor(rating)}15` : 'var(--muted)' }}
                        >
                            <div className="relative size-6">
                                <Star
                                    className="size-6"
                                    style={{ color: rating > 0 ? getRatingColor(rating) : 'var(--muted-foreground)' }}
                                    strokeWidth={2}
                                />
                                {rating > 0 && (
                                    <div
                                        className="absolute inset-0 overflow-hidden"
                                        style={{ width: `${(rating / 5) * 100}%` }}
                                    >
                                        <Star
                                            className="size-6"
                                            style={{ color: getRatingColor(rating), fill: getRatingColor(rating) }}
                                            strokeWidth={2}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tabular-nums">{rating > 0 ? `${rating}/5` : '-'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rating</span>
                        </div>
                    </div>

                    {/* Exercises */}
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                            <CircleCheck className="size-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tabular-nums">{exercisesCompleted}/{exercisesTotal}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Exercises</span>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                            <Clock className="size-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tabular-nums">{minutes} min</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
