import type { Node, Edge } from 'reactflow';
import type { TriggerOption, ActionOption } from '@/components/flows/flow-editor-side-panel';
import { TRIGGER_OPTIONS, ACTION_OPTIONS } from '@/components/flows/flow-editor-side-panel';
import { CalendarX, Activity, UserX } from 'lucide-react';

export type FlowTemplate = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trigger: TriggerOption;
  actionNodes: Array<{
    option: ActionOption;
    messageText?: string;
    waitDuration?: number;
    waitUnit?: 'minutes' | 'hours' | 'days';
    selectedQuestionnaires?: string[];
    selectedCheckIns?: string[];
    selectedFiles?: string[];
    selectedHabits?: string[];
    repeatLinkedActionId?: string | null;
  }>;
  hasTemplateNodes: boolean; // Indicates if nodes need to be edited
};

const getTriggerById = (id: string): TriggerOption => {
  return TRIGGER_OPTIONS.find((t) => t.id === id) || TRIGGER_OPTIONS[0];
};

const getActionById = (id: string): ActionOption => {
  return ACTION_OPTIONS.find((a) => a.id === id) || ACTION_OPTIONS[0];
};

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'missed-workout',
    name: 'Missed Workout',
    description: 'Automatically follow up when a client misses a scheduled workout',
    icon: Activity,
    trigger: getTriggerById('missed-workout'),
    hasTemplateNodes: true,
    actionNodes: [
      {
        option: getActionById('send-message'),
        messageText: 'We noticed you missed your scheduled workout. How can we help you get back on track?',
      },
      {
        option: getActionById('wait'),
        waitDuration: 24,
        waitUnit: 'hours',
      },
      {
        option: getActionById('assign-check-in'),
        selectedCheckIns: [],
      },
    ],
  },
  {
    id: 'missed-check-in',
    name: 'Missed Check-in',
    description: 'Remind clients who have missed their check-in deadline',
    icon: CalendarX,
    trigger: getTriggerById('missed-check-in'),
    hasTemplateNodes: true,
    actionNodes: [
      {
        option: getActionById('send-message'),
        messageText: 'Your check-in is overdue. Please complete it when you have a moment.',
      },
      {
        option: getActionById('wait'),
        waitDuration: 48,
        waitUnit: 'hours',
      },
      {
        option: getActionById('repeat'),
      },
    ],
  },
  {
    id: 'inactive-7-days',
    name: 'Inactive for 7 Days',
    description: 'Re-engage clients who have been inactive for a week',
    icon: UserX,
    trigger: getTriggerById('inactive-7-days'),
    hasTemplateNodes: true,
    actionNodes: [
      {
        option: getActionById('send-message'),
        messageText: 'We noticed you\'ve been away for a while. How are things going? Let us know if you need any adjustments to your plan.',
      },
    ],
  },
];

/**
 * Converts a flow template into React Flow nodes and edges
 * This creates the initial structure that will be saved to the flow
 */
export const createNodesAndEdgesFromTemplate = (
  template: FlowTemplate
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create trigger node
  const triggerNode: Node = {
    id: 'trigger',
    type: 'trigger',
    position: { x: 200, y: 20 },
    data: {
      label: template.trigger.name,
      subtitle: template.trigger.name,
      icon: template.trigger.icon,
      onClick: () => {},
      onEdit: () => {},
      onDelete: () => {},
    },
  };
  nodes.push(triggerNode);

  // Create action nodes
  let lastNodeId = 'trigger';
  let yPosition = 120;

  template.actionNodes.forEach((actionNodeData, index) => {
    const actionNodeId = `action-${index}`;
    const actionNode: Node = {
      id: actionNodeId,
      type: 'action',
      position: { x: 200, y: yPosition },
      data: {
        id: actionNodeId,
        option: actionNodeData.option,
        messageText: actionNodeData.messageText,
        waitDuration: actionNodeData.waitDuration,
        waitUnit: actionNodeData.waitUnit,
        selectedQuestionnaires: actionNodeData.selectedQuestionnaires
          ? new Set(actionNodeData.selectedQuestionnaires)
          : undefined,
        selectedCheckIns: actionNodeData.selectedCheckIns
          ? new Set(actionNodeData.selectedCheckIns)
          : undefined,
        selectedFiles: actionNodeData.selectedFiles
          ? new Set(actionNodeData.selectedFiles)
          : undefined,
        selectedHabits: actionNodeData.selectedHabits
          ? new Set(actionNodeData.selectedHabits)
          : undefined,
        repeatLinkedActionId: actionNodeData.repeatLinkedActionId || null,
        onClick: () => {},
        onEdit: () => {},
        onDelete: () => {},
      },
    };
    nodes.push(actionNode);

    // Create edge from last node to this action node
    const edge: Edge = {
      id: `${lastNodeId}-to-${actionNodeId}`,
      source: lastNodeId,
      target: actionNodeId,
      type: 'smoothstep',
    };
    edges.push(edge);

    // Add "add action" node after each action (except the last one)
    if (index < template.actionNodes.length - 1) {
      const addActionNodeId = `add-action-${index}`;
      const addActionNode: Node = {
        id: addActionNodeId,
        type: 'addAction',
        position: { x: 200, y: yPosition + 80 },
        data: { onClick: () => {} },
      };
      nodes.push(addActionNode);

      const addActionEdge: Edge = {
        id: `${actionNodeId}-to-${addActionNodeId}`,
        source: actionNodeId,
        target: addActionNodeId,
        type: 'smoothstep',
      };
      edges.push(addActionEdge);

      lastNodeId = addActionNodeId;
      yPosition += 160;
    } else {
      lastNodeId = actionNodeId;
      yPosition += 80;
    }
  });

  // Create end node
  const endNode: Node = {
    id: 'end',
    type: 'end',
    position: { x: 200, y: yPosition },
    data: { label: 'End' },
  };
  nodes.push(endNode);

  // Connect last node to end
  const endEdge: Edge = {
    id: `${lastNodeId}-to-end`,
    source: lastNodeId,
    target: 'end',
    type: 'smoothstep',
  };
  edges.push(endEdge);

  return { nodes, edges };
};

