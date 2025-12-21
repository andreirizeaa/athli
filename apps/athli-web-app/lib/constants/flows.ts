import type { Node, Edge } from 'reactflow';
import { UserPlus, CalendarX, Activity, CheckCircle, MessageSquare, FileText, ClipboardCheck, FilePlus, Sprout, Clock, RotateCw } from 'lucide-react';

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
    label: 'Onboarding',
    templates: [
      {
        name: 'New Client Welcome',
        description: 'Automated welcome flow for new clients',
        requiresEditing: true,
        editingNotice: 'This template includes placeholder forms and files. Please edit the action nodes to select your specific content.',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'New client sign up',
              icon: UserPlus,
              option: {
                id: 'new-client-signup',
                name: 'New client sign up',
                icon: UserPlus,
              },
              onClick: () => {},
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
              messageText: 'Welcome to the team! I\'m excited to start working with you.',
              onClick: () => {},
            },
          },
          {
            id: 'action-2',
            type: 'action',
            position: { x: 400, y: 350 },
            data: {
              label: 'Action 2',
              subtitle: 'Assign 0 questionnaire',
              icon: FileText,
              option: {
                id: 'assign-questionnaire',
                name: 'Assign questionnaire',
                icon: FileText,
              },
              selectedQuestionnaires: new Set(),
              onClick: () => {},
            },
          },
          {
            id: 'action-3',
            type: 'action',
            position: { x: 400, y: 500 },
            data: {
              label: 'Action 3',
              subtitle: 'Add 0 file',
              icon: FilePlus,
              option: {
                id: 'add-file',
                name: 'Add file',
                icon: FilePlus,
              },
              selectedFiles: new Set(),
              onClick: () => {},
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
              onClick: () => {},
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
              onClick: () => {},
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
              onClick: () => {},
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'action-1', target: 'action-2', type: 'smoothstep' },
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
              onClick: () => {},
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
              onClick: () => {},
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
              onClick: () => {},
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'action-1', target: 'action-2', type: 'smoothstep' },
        ],
      },
      {
        name: 'Workout Completion Celebration',
        description: 'Congratulate clients when they complete a workout',
        requiresEditing: false,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'Workout finished',
              icon: CheckCircle,
              option: {
                id: 'workout-finished',
                name: 'Workout finished',
                icon: CheckCircle,
              },
              onClick: () => {},
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
              messageText: 'Great job on completing your workout! Keep up the amazing work!',
              onClick: () => {},
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
        ],
      },
      {
        name: 'Check-in Completion Follow-up',
        description: 'Acknowledge when clients complete their check-ins',
        requiresEditing: false,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'Check in completed',
              icon: CheckCircle,
              option: {
                id: 'check-in-completed',
                name: 'Check in completed',
                icon: CheckCircle,
              },
              onClick: () => {},
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
              onClick: () => {},
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
    label: 'Habits & Check-ins',
    templates: [
      {
        name: 'New Habit Assignment',
        description: 'Assign a new habit when a client signs up',
        requiresEditing: true,
        editingNotice: 'Please edit the habit action to select specific habits for your clients.',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'New client sign up',
              icon: UserPlus,
              option: {
                id: 'new-client-signup',
                name: 'New client sign up',
                icon: UserPlus,
              },
              onClick: () => {},
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
              messageText: 'Welcome! I\'ve assigned some habits to help you get started with your fitness journey.',
              onClick: () => {},
            },
          },
          {
            id: 'action-2',
            type: 'action',
            position: { x: 400, y: 350 },
            data: {
              label: 'Action 2',
              subtitle: 'Add 0 habit',
              icon: Sprout,
              option: {
                id: 'add-habit',
                name: 'Add habit',
                icon: Sprout,
              },
              selectedHabits: new Set(),
              onClick: () => {},
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'action-1', target: 'action-2', type: 'smoothstep' },
        ],
      },
      {
        name: 'Weekly Check-in Request',
        description: 'Request weekly progress check-ins from clients',
        requiresEditing: true,
        editingNotice: 'Please edit the check-in action to select your specific check-in form.',
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
              onClick: () => {},
            },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
              label: 'Action 1',
              subtitle: 'Assign 0 check-in',
              icon: ClipboardCheck,
              option: {
                id: 'assign-check-in',
                name: 'Assign check in',
                icon: ClipboardCheck,
              },
              selectedCheckIns: new Set(),
              onClick: () => {},
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
        name: 'Complete Onboarding Sequence',
        description: 'Comprehensive onboarding with forms, files, and habits',
        requiresEditing: true,
        editingNotice: 'This template includes multiple placeholder actions. Edit each action to select your specific content.',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
              label: 'Trigger',
              subtitle: 'New client sign up',
              icon: UserPlus,
              option: {
                id: 'new-client-signup',
                name: 'New client sign up',
                icon: UserPlus,
              },
              onClick: () => {},
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
              messageText: 'Welcome! Let\'s get you started with some onboarding materials.',
              onClick: () => {},
            },
          },
          {
            id: 'action-2',
            type: 'action',
            position: { x: 400, y: 350 },
            data: {
              label: 'Action 2',
              subtitle: 'Assign 0 questionnaire',
              icon: FileText,
              option: {
                id: 'assign-questionnaire',
                name: 'Assign questionnaire',
                icon: FileText,
              },
              selectedQuestionnaires: new Set(),
              onClick: () => {},
            },
          },
          {
            id: 'action-3',
            type: 'action',
            position: { x: 400, y: 500 },
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
              onClick: () => {},
            },
          },
          {
            id: 'action-4',
            type: 'action',
            position: { x: 400, y: 650 },
            data: {
              label: 'Action 3',
              subtitle: 'Add 0 file',
              icon: FilePlus,
              option: {
                id: 'add-file',
                name: 'Add file',
                icon: FilePlus,
              },
              selectedFiles: new Set(),
              onClick: () => {},
            },
          },
          {
            id: 'action-5',
            type: 'action',
            position: { x: 400, y: 800 },
            data: {
              label: 'Action 4',
              subtitle: 'Add 0 habit',
              icon: Sprout,
              option: {
                id: 'add-habit',
                name: 'Add habit',
                icon: Sprout,
              },
              selectedHabits: new Set(),
              onClick: () => {},
            },
          },
        ],
        edges: [
          { id: 'e-trigger-1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'action-1', target: 'action-2', type: 'smoothstep' },
          { id: 'e-2-3', source: 'action-2', target: 'action-3', type: 'smoothstep' },
          { id: 'e-3-4', source: 'action-3', target: 'action-4', type: 'smoothstep' },
          { id: 'e-4-5', source: 'action-4', target: 'action-5', type: 'smoothstep' },
        ],
      },
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
              onClick: () => {},
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
              onClick: () => {},
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
              onClick: () => {},
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
              onClick: () => {},
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
