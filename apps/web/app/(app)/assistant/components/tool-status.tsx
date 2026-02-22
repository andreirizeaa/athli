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
  compact?: boolean;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Client tools
  list_all_clients: 'Loading your clients',
  search_clients: 'Searching clients',
  get_client_profile: 'Loading client profile',
  get_client_workouts: 'Fetching workout history',
  get_client_metrics: 'Loading client metrics',
  get_client_checkins: 'Fetching check-ins',
  get_client_exercise_history: 'Loading exercise history',
  get_client_habits: 'Loading habits & streaks',
  get_inactive_clients: 'Finding inactive clients',
  // Exercise tools
  search_exercises: 'Searching exercises',
  get_exercise_catalog: 'Loading exercise catalog',
  // Coach library tools
  get_coach_workouts: 'Loading your workouts',
  get_coach_programs: 'Loading your programs',
  get_coach_sections: 'Loading your sections',
  list_all_checkin_templates: 'Loading check-in templates',
  list_all_metrics: 'Loading tracked metrics',
  // Creation tools
  create_workout: 'Creating workout',
  create_program: 'Creating program',
  create_section: 'Creating section',
  create_checkin_template: 'Creating check-in form',
  create_metric: 'Creating metric',
  // Assignment tools
  assign_workout: 'Preparing workout assignment',
  assign_metric_to_client: 'Assigning metric to client',
  // Client modification tools
  add_client_goal: 'Adding client goal',
  add_client_injury: 'Recording injury',
  draft_message_for_client: 'Writing message',
  update_client_profile: 'Updating profile',
  // Analytics tools
  analyze_client_progress: 'Analyzing progress',
  // Chart visualization
  generate_chart: 'Generating chart',
};

export function ToolStatus({ toolCall, className, compact }: ToolStatusProps) {
  const displayName = TOOL_DISPLAY_NAMES[toolCall.tool] || toolCall.tool;
  const message = toolCall.message || displayName;
  const iconCls = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full',
        compact ? 'gap-1.5 text-xs py-1 px-2.5' : 'gap-2 text-sm py-1.5 px-3',
        toolCall.status === 'calling' && 'bg-muted/50 text-foreground',
        toolCall.status === 'complete' && 'bg-green-500/10 text-green-600',
        toolCall.status === 'error' && 'bg-red-500/10 text-red-500',
        className
      )}
    >
      {toolCall.status === 'calling' && (
        <Loader2 className={cn(iconCls, 'animate-spin text-purple-500')} />
      )}
      {toolCall.status === 'complete' && (
        <CheckCircle2 className={cn(iconCls, 'text-green-500')} />
      )}
      {toolCall.status === 'error' && (
        <XCircle className={cn(iconCls, 'text-red-500')} />
      )}
      <span>
        {message}{toolCall.status === 'calling' ? '...' : ''}
      </span>
    </div>
  );
}

interface ToolStatusListProps {
  toolCalls: ToolCallStatus[];
  className?: string;
  compact?: boolean;
}

export function ToolStatusList({ toolCalls, className, compact }: ToolStatusListProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  // Deduplicate by tool name, keeping the latest status for each tool
  const deduped = Array.from(
    toolCalls.reduce((map, tc) => {
      map.set(tc.tool, tc);
      return map;
    }, new Map<string, ToolCallStatus>()).values()
  );

  return (
    <div className={cn(compact ? 'space-y-0.5 py-1' : 'space-y-1 py-2', className)}>
      {deduped.map((tc) => (
        <ToolStatus key={tc.tool} toolCall={tc} compact={compact} />
      ))}
    </div>
  );
}
