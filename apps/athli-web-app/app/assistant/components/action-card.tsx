"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Check,
  Loader2,
  Dumbbell,
  Calendar,
  LayoutList,
  Target,
  AlertTriangle,
  MessageSquare,
  User,
  ClipboardList,
  BarChart3,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { ActionType, getActionDisplayName } from '@/stores/ai-action-store';
import { AIWorkoutPayload, getWorkoutSummary } from '@/lib/ai-payload-transformer';
import { toast } from 'sonner';

interface ActionCardProps {
  actionType: ActionType;
  payload: any;
  onConfirm: () => Promise<void>;
  className?: string;
}

export function ActionCard({ actionType, payload, onConfirm, className }: ActionCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

  const handleCopyMessage = async () => {
    if (actionType !== 'draft_message') return;

    const messageText = payload.subject
      ? `Subject: ${payload.subject}\n\n${payload.message}`
      : payload.message;

    await navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    toast.success('Message copied to clipboard!');

    // Reset after 3 seconds
    setTimeout(() => setIsCopied(false), 3000);
  };

  const buttonLabel = getActionDisplayName(actionType);
  const Icon = getActionIcon(actionType);
  const isDraftMessage = actionType === 'draft_message';

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
        {isDraftMessage ? (
          <Button
            onClick={handleCopyMessage}
            variant={isCopied ? 'secondary' : 'default'}
            className={cn(
              'w-full',
              isCopied && 'bg-green-600 hover:bg-green-600 text-white'
            )}
          >
            {isCopied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Message
              </>
            )}
          </Button>
        ) : (
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
                Done
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        )}
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
    case 'assign_workout':
      return Calendar;
    case 'assign_metric_to_client':
      return BarChart3;
    case 'add_client_goal':
      return Target;
    case 'add_client_injury':
      return AlertTriangle;
    case 'draft_message':
      return MessageSquare;
    case 'update_client_profile':
      return User;
    case 'create_checkin_template':
      return ClipboardList;
    case 'create_metric':
      return BarChart3;
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

  if (actionType === 'assign_workout') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Assign "{payload.workoutName}" to {payload.clientName}
        </h4>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {new Date(payload.date).toLocaleDateString()}
          </span>
          {payload.time && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              {payload.time}
            </span>
          )}
          {payload.isRecurring && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              Recurring
            </span>
          )}
        </div>
      </div>
    );
  }

  if (actionType === 'assign_metric_to_client') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Assign "{payload.metricName}" to {payload.clientName}
        </h4>
        <p className="text-sm text-muted-foreground">
          Client will be able to track this metric in their app
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
            {payload.metricType}
          </span>
          {payload.metricUnit && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              Unit: {payload.metricUnit}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (actionType === 'add_client_goal') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Add goal for {payload.clientName}
        </h4>
        <p className="text-sm text-muted-foreground">
          {payload.goalType}{payload.targetValue ? `: ${payload.targetValue}` : ''}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {payload.targetDate && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Target: {new Date(payload.targetDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (actionType === 'add_client_injury') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Record injury for {payload.clientName}
        </h4>
        <p className="text-sm text-muted-foreground">
          {payload.injuryType} - {payload.bodyPart}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs capitalize",
            payload.severity === 'severe' ? 'bg-red-100 text-red-700' :
            payload.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          )}>
            {payload.severity || 'moderate'}
          </span>
        </div>
        {payload.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {payload.notes}
          </p>
        )}
      </div>
    );
  }

  if (actionType === 'draft_message') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Message for {payload.clientName}
        </h4>
        {payload.subject && (
          <p className="text-sm font-medium text-muted-foreground">
            Subject: {payload.subject}
          </p>
        )}
        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
          {payload.message}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
            {payload.messageType || 'general'}
          </span>
        </div>
      </div>
    );
  }

  if (actionType === 'update_client_profile') {
    const updates = payload.updates || {};
    const updateEntries = Object.entries(updates).filter(([_, v]) => v !== undefined && v !== null);

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Update {payload.clientName}'s profile
        </h4>
        <div className="flex flex-wrap gap-2 pt-1">
          {updateEntries.map(([key, value]) => (
            <span key={key} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
              {key}: {String(value)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (actionType === 'create_checkin_template') {
    const questionCount = payload.questions?.length || 0;

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{payload.name}</h4>
        {payload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {payload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {questionCount} question{questionCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  }

  if (actionType === 'create_metric') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{payload.name}</h4>
        {payload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {payload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
            {payload.metricType}
          </span>
          {payload.unit && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              Unit: {payload.unit}
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
