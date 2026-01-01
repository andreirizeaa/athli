'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Dumbbell, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/general/utils';
import type { Workout } from '@/components/app/app-shell';

interface ClientInProgressTrainingDaySummaryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workout: (Workout & { id: string }) | null;
    dateKey: string;
}

export function ClientInProgressTrainingDaySummary({
    open,
    onOpenChange,
    workout,
    dateKey,
}: ClientInProgressTrainingDaySummaryProps) {
    const t = useTranslations();

    if (!workout) return null;

    // Format the date for display
    const formatDateDisplay = (dateKey: string) => {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                            <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">{workout.name || 'Workout'}</DialogTitle>
                            <p className="text-sm text-muted-foreground">{formatDateDisplay(dateKey)}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/10">
                            <Clock className="h-3 w-3 mr-1" />
                            In Progress
                        </Badge>
                    </div>

                    {/* Workout Info */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Exercises</span>
                            </div>
                            <span className="font-medium">{workout.totalExercises || 0}</span>
                        </div>

                        {workout.type && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Timer className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Type</span>
                                </div>
                                <span className="font-medium capitalize">{workout.type}</span>
                            </div>
                        )}
                    </div>

                    {/* Progress placeholder */}
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                        <p className="text-sm text-center text-muted-foreground">
                            This workout is currently in progress. The client has started but not yet completed all exercises.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
