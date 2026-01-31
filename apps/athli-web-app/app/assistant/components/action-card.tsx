"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Check, Loader2, Dumbbell, Calendar, LayoutList } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { ActionType, getActionDisplayName } from '@/stores/ai-action-store';
import { AIWorkoutPayload, getWorkoutSummary } from '@/lib/ai-payload-transformer';

interface ActionCardProps {
  actionType: ActionType;
  payload: any;
  onConfirm: () => Promise<void>;
  className?: string;
}

export function ActionCard({ actionType, payload, onConfirm, className }: ActionCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = async () => {
    if (isConfirming || isConfirmed) return;

    setIsConfirming(true);
    try {
      await onConfirm();
      setIsConfirmed(true);
    } catch (error) {
      console.error('Failed to confirm action:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const buttonLabel = getActionDisplayName(actionType);
  const Icon = getActionIcon(actionType);

  return (
    <Card className={cn('mt-3 border-primary/20 bg-primary/5', className)}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <ActionSummary actionType={actionType} payload={payload} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <Button
          onClick={handleConfirm}
          disabled={isConfirming || isConfirmed}
          className={cn(
            'w-full',
            isConfirmed && 'bg-green-600 hover:bg-green-600'
          )}
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isConfirmed ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved to Library
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function getActionIcon(actionType: ActionType) {
  switch (actionType) {
    case 'create_workout':
      return Dumbbell;
    case 'create_program':
      return Calendar;
    case 'create_section':
      return LayoutList;
    default:
      return Dumbbell;
  }
}

interface ActionSummaryProps {
  actionType: ActionType;
  payload: any;
}

function ActionSummary({ actionType, payload }: ActionSummaryProps) {
  if (actionType === 'create_workout') {
    const workoutPayload = payload as AIWorkoutPayload;
    const summary = getWorkoutSummary(workoutPayload);

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{workoutPayload.name}</h4>
        {workoutPayload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {workoutPayload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {summary.exerciseCount} exercises
          </span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {summary.sectionCount} sections
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
            {summary.difficulty}
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
            {summary.type}
          </span>
        </div>
      </div>
    );
  }

  if (actionType === 'create_section') {
    const sectionPayload = payload as any;
    const exerciseCount = sectionPayload.exercises?.length || 0;

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{sectionPayload.name}</h4>
        {sectionPayload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {sectionPayload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {exerciseCount} exercises
          </span>
          {sectionPayload.type && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
              {sectionPayload.type}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default for other action types
  return (
    <div className="space-y-1">
      <h4 className="font-medium text-foreground">{payload.name || 'Unnamed'}</h4>
      {payload.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {payload.description}
        </p>
      )}
    </div>
  );
}
