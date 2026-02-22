'use client';
import { useTranslations } from 'next-intl';

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkoutPreviewContent } from './workout-preview-content';

interface WorkoutPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutData: any;
}

export const WorkoutPreviewDialog = ({ open, onOpenChange, workoutData }: WorkoutPreviewDialogProps) => {
    const t = useTranslations();
    if (!workoutData) return null;

    const name = workoutData?.name || 'Untitled Workout';
    const type = workoutData?.type || workoutData?.workout_data?.type;
    const difficulty = workoutData?.difficulty || workoutData?.workout_data?.difficulty;
    const description = workoutData?.description || workoutData?.workout_data?.description;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
                <VisuallyHidden>
                    <DialogTitle>{t('common.workoutPreview')}</DialogTitle>
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
                <WorkoutPreviewContent workoutData={workoutData} />

                {/* Footer with Close Button */}
                <div className="px-6 pt-2 pb-3 flex justify-end shrink-0">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="font-bold px-8"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
