import type { Node, Edge } from 'reactflow';
import {
  CalendarX,
  Activity,
  MessageSquare,
  FileText,
  ClipboardCheck,
  FilePlus,
  Sprout,
  Clock,
  RotateCw,
  Dumbbell,
  UserX,
  CheckCircle2
} from 'lucide-react';

export interface TriggerOption {
  id: string;
  name: string;
  icon: any;
}

export interface ActionOption {
  id: string;
  name: string;
  icon: any;
}

export interface Habit {
  id: string;
  name: string;
}

export const TRIGGER_OPTIONS: TriggerOption[] = [
  { id: 'checkin-complete', name: 'Check-in completed', icon: CheckCircle2 },
  { id: 'missed-workout', name: 'Missed workout', icon: Activity },
  { id: 'missed-check-in', name: 'Missed check in', icon: CalendarX },
  { id: 'missed-habit-log', name: 'Missed habit log', icon: CalendarX },
  { id: 'missed-metric-log', name: 'Missed metric log', icon: CalendarX },
  { id: 'inactive-7-days', name: 'Inactive for 7 days', icon: UserX },
];

export const ACTION_OPTIONS: ActionOption[] = [
  { id: 'send-message', name: 'Send message', icon: MessageSquare },
  { id: 'assign-questionnaire', name: 'Assign questionnaire', icon: FileText },
  { id: 'assign-check-in', name: 'Assign check in', icon: ClipboardCheck },
  { id: 'add-file', name: 'Add file', icon: FilePlus },
  { id: 'add-habit', name: 'Add habit', icon: Sprout },
  { id: 'assign-workout', name: 'Assign workout', icon: Dumbbell },
  { id: 'wait', name: 'Wait', icon: Clock },
  { id: 'repeat', name: 'Until completed', icon: RotateCw },
];

export interface FlowTemplate {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  requiresEditing?: boolean;
  editingNotice?: string;
}

export interface FlowTemplateSection {
  label: string;
  templates: FlowTemplate[];
}

export const defaultFlowTemplates: FlowTemplateSection[] = [
  {
    label: 'Engagement',
    templates: [
      {
        name: 'Missed Workout Follow-up',
        description: 'Automated follow-up when a client misses a workout',
        requiresEditing: false,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'Missed workout',
              icon: Activity,
              option: {
                id: 'missed-workout',
                name: 'Missed workout',
                icon: Activity,
              },
              onClick: () => { },
            },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
              label: 'Wait',
              subtitle: 'Wait 1 day',
              icon: Clock,
              option: {
                id: 'wait',
                name: 'Wait',
                icon: Clock,
              },
              isWait: true,
              waitDuration: 1,
              waitUnit: 'days',
              onClick: () => { },
            },
          },
          {
            id: 'action-2',
            type: 'action',
            position: { x: 400, y: 350 },
            data: {
              label: 'Action 1',
              subtitle: 'Send message',
              icon: MessageSquare,
              option: {
                id: 'send-message',
                name: 'Send message',
                icon: MessageSquare,
              },
              messageText: 'Hey! I noticed you missed your workout yesterday. Everything okay? Let me know if you need to adjust your schedule.',
              onClick: () => { },
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'action-1', target: 'action-2', type: 'smoothstep' },
        ],
      },
      {
        name: 'Check-in Completed Thank You',
        description: 'Send a thank you message when a client completes their check-in',
        requiresEditing: false,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'Check-in completed',
              icon: CheckCircle2,
              option: {
                id: 'checkin-complete',
                name: 'Check-in completed',
                icon: CheckCircle2,
              },
              onClick: () => { },
            },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
              label: 'Action 1',
              subtitle: 'Send message',
              icon: MessageSquare,
              option: {
                id: 'send-message',
                name: 'Send message',
                icon: MessageSquare,
              },
              messageText: 'Thanks for completing your check-in! I\'ll review it and get back to you soon.',
              onClick: () => { },
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
        ],
      },
      {
        name: 'Missed Check-in Reminder',
        description: 'Remind clients about missed check-ins with repeated follow-ups',
        requiresEditing: false,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'Missed check in',
              icon: CalendarX,
              option: {
                id: 'missed-check-in',
                name: 'Missed check in',
                icon: CalendarX,
              },
              onClick: () => { },
            },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
              label: 'Action 1',
              subtitle: 'Send message',
              icon: MessageSquare,
              option: {
                id: 'send-message',
                name: 'Send message',
                icon: MessageSquare,
              },
              messageText: 'Reminder: Don\'t forget to complete your daily check-in!',
              onClick: () => { },
            },
          },
          {
            id: 'action-2',
            type: 'action',
            position: { x: 400, y: 350 },
            data: {
              label: 'Action 2',
              subtitle: 'Until completed',
              icon: RotateCw,
              option: {
                id: 'repeat',
                name: 'Until completed',
                icon: RotateCw,
              },
              isRepeat: true,
              repeatLinkedActionId: 'action-1',
              onClick: () => { },
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'action-1', target: 'action-2', type: 'smoothstep' },
        ],
      },
      {
        name: 'Inactive Client Re-engagement',
        description: 'Reach out to clients who have been inactive for 7 days',
        requiresEditing: false,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'Inactive for 7 days',
              icon: UserX,
              option: {
                id: 'inactive-7-days',
                name: 'Inactive for 7 days',
                icon: UserX,
              },
              onClick: () => { },
            },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
              label: 'Action 1',
              subtitle: 'Send message',
              icon: MessageSquare,
              option: {
                id: 'send-message',
                name: 'Send message',
                icon: MessageSquare,
              },
              messageText: 'Hey! I noticed you\'ve been away for a while. How are things going? Let me know if you need any adjustments to your plan.',
              onClick: () => { },
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
        ],
      },
    ],
  },
  {
    label: 'Multi-step Flows',
    templates: [
      {
        name: 'Persistent Reminder Flow',
        description: 'Repeated reminders until client completes an action',
        requiresEditing: false,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'Missed check in',
              icon: CalendarX,
              option: {
                id: 'missed-check-in',
                name: 'Missed check in',
                icon: CalendarX,
              },
              onClick: () => { },
            },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
              label: 'Wait',
              subtitle: 'Wait 2 hours',
              icon: Clock,
              option: {
                id: 'wait',
                name: 'Wait',
                icon: Clock,
              },
              isWait: true,
              waitDuration: 2,
              waitUnit: 'hours',
              onClick: () => { },
            },
          },
          {
            id: 'action-2',
            type: 'action',
            position: { x: 400, y: 350 },
            data: {
              label: 'Action 1',
              subtitle: 'Send message',
              icon: MessageSquare,
              option: {
                id: 'send-message',
                name: 'Send message',
                icon: MessageSquare,
              },
              messageText: 'Gentle reminder to complete your check-in when you have a moment!',
              onClick: () => { },
            },
          },
          {
            id: 'action-3',
            type: 'action',
            position: { x: 400, y: 500 },
            data: {
              label: 'Action 2',
              subtitle: 'Until completed',
              icon: RotateCw,
              option: {
                id: 'repeat',
                name: 'Until completed',
                icon: RotateCw,
              },
              isRepeat: true,
              repeatLinkedActionId: 'action-1',
              onClick: () => { },
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'action-1', target: 'action-2', type: 'smoothstep' },
          { id: 'e-2-3', source: 'action-2', target: 'action-3', type: 'smoothstep' },
        ],
      },
    ],
  },
];
