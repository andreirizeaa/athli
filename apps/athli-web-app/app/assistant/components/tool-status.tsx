"use client";

import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/general/utils';

export interface ToolCallStatus {
  tool: string;
  status: 'calling' | 'complete' | 'error';
  message?: string;
}

interface ToolStatusProps {
  toolCall: ToolCallStatus;
  className?: string;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_clients: 'Searching clients',
  get_client_profile: 'Loading client profile',
  get_client_workouts: 'Fetching workout history',
  get_client_metrics: 'Loading metrics',
  get_client_checkins: 'Fetching check-ins',
  search_exercises: 'Searching exercises',
  get_coach_workouts: 'Loading your workouts',
  get_coach_programs: 'Loading your programs',
  get_coach_sections: 'Loading your sections',
  create_workout: 'Creating workout',
  create_program: 'Creating program',
  create_section: 'Creating section',
  analyze_client_progress: 'Analyzing progress',
  get_inactive_clients: 'Finding inactive clients',
};

export function ToolStatus({ toolCall, className }: ToolStatusProps) {
  const displayName = TOOL_DISPLAY_NAMES[toolCall.tool] || toolCall.tool;
  const message = toolCall.message || displayName;

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground py-1',
        className
      )}
    >
      {toolCall.status === 'calling' && (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      )}
      {toolCall.status === 'complete' && (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      )}
      {toolCall.status === 'error' && (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className={cn(
        toolCall.status === 'calling' && 'text-foreground',
        toolCall.status === 'error' && 'text-red-500'
      )}>
        {message}...
      </span>
    </div>
  );
}

interface ToolStatusListProps {
  toolCalls: ToolCallStatus[];
  className?: string;
}

export function ToolStatusList({ toolCalls, className }: ToolStatusListProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className={cn('space-y-1 py-2', className)}>
      {toolCalls.map((tc, index) => (
        <ToolStatus key={`${tc.tool}-${index}`} toolCall={tc} />
      ))}
    </div>
  );
}
