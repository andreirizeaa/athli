'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
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
}

export const ClientCompletedTrainingDaySummary = ({
    open,
    onOpenChange,
    workoutName,
}: ClientCompletedTrainingDaySummaryProps) => {
    const t = useTranslations();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!max-w-[60vw] w-[60vw] bg-background rounded-xl border shadow-lg p-0 outline-none overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogTitle className="sr-only">Training Day Summary</DialogTitle>

                {/* Workout Details - Now the only content */}
                <div className="flex flex-col h-[80vh] overflow-hidden p-6">
                    <h2 className="text-2xl font-bold tracking-tight mb-6 shrink-0">{workoutName}</h2>
                    <div className="flex-1 overflow-y-auto">
                        {/* Content will go here */}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
