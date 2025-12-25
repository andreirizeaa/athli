'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { getForms } from '@/lib/coach/coach-form-service';
import { type Habit } from '@/lib/coach/coach-habit-service';
import { X, Plus, Play, Pencil, Trash2 } from 'lucide-react';
import { FlowEditorSidePanel, type PanelType, type TriggerOption, type ActionOption } from './flow-editor-side-panel';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from '@/lib/coach/flow-layout';

// Custom node components
function TriggerNode({ data }: { data: { label: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; onEdit?: () => void; onDelete?: () => void } }) {
  const IconComponent = data.icon || Play;
  const hasSelection = !!data.subtitle;

  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div
        className={`px-4 py-2 rounded-lg border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors relative group w-full min-h-[44px] flex items-center ${hasSelection ? '' : 'border-dashed'
          }`}
      >
        {hasSelection ? (
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center justify-center">
              <IconComponent className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex flex-col flex-1 cursor-pointer" onClick={data.onClick}>
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                Trigger
              </span>
              <span className="text-sm font-medium text-blue-900">{data.subtitle}</span>
            </div>
            <div className="flex items-center gap-1">
              {data.onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEdit?.();
                  }}
                  className="flex items-center justify-center h-6 w-6 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                  aria-label="Edit trigger"
                >
                  <Pencil className="h-3 w-3 text-blue-600" />
                </button>
              )}
              {data.onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDelete?.();
                  }}
                  className="flex items-center justify-center h-6 w-6 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                  aria-label="Delete trigger"
                >
                  <Trash2 className="h-3 w-3 text-blue-600" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full cursor-pointer" onClick={data.onClick}>
            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
              {data.label}
            </span>
          </div>
        )}
        <Handle type="source" position={Position.Bottom} id="output" className="!bg-blue-500" />
      </div>
    </div>
  );
}

function ActionNode({ data }: { data: { label: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; onEdit?: () => void; onDelete?: () => void; isWait?: boolean; isRepeat?: boolean; isDisconnected?: boolean; isOrphanRoot?: boolean } }) {
  const IconComponent = data.icon || Play;
  const hasSelection = !!data.subtitle;
  const isWait = data.isWait || false;
  const isRepeat = data.isRepeat || false;
  const isPurple = isWait || isRepeat;

  const borderColor = isPurple ? 'border-purple-500' : 'border-green-500';
  const bgColor = isPurple ? 'bg-purple-50' : 'bg-green-50';
  const hoverBgColor = isPurple ? 'hover:bg-purple-100' : 'hover:bg-green-100';
  const iconColor = isPurple ? 'text-purple-600' : 'text-green-600';
  const textColor = isPurple ? 'text-purple-900' : 'text-green-900';
  const buttonHoverBg = isPurple ? 'hover:bg-purple-200' : 'hover:bg-green-200';
  const handleColor = isPurple ? '!bg-purple-500' : '!bg-green-500';

  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div
        className={`px-4 py-2 rounded-lg border-2 ${borderColor} ${bgColor} ${hoverBgColor} transition-colors relative group w-full`}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <IconComponent className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="flex flex-col flex-1 cursor-pointer" onClick={data.onClick}>
            <span className={`text-xs font-semibold ${textColor} uppercase tracking-wide`}>
              {data.label}
            </span>
            {data.subtitle && (
              <span className={`text-sm font-medium ${textColor}`}>{data.subtitle}</span>
            )}
          </div>
          {hasSelection && (
            <div className="flex items-center gap-1">
              {data.onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEdit?.();
                  }}
                  className={`flex items-center justify-center h-6 w-6 rounded ${buttonHoverBg} transition-colors flex-shrink-0`}
                  aria-label="Edit action"
                >
                  <Pencil className={`h-3 w-3 ${iconColor}`} />
                </button>
              )}
              {data.onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDelete?.();
                  }}
                  className={`flex items-center justify-center h-6 w-6 rounded ${buttonHoverBg} transition-colors flex-shrink-0`}
                  aria-label="Delete action"
                >
                  <Trash2 className={`h-3 w-3 ${iconColor}`} />
                </button>
              )}
            </div>
          )}
        </div>
        <Handle type="target" position={Position.Top} id="input" className={handleColor} />
        {data.isOrphanRoot && (
          <>
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce whitespace-nowrap z-20">
              Drag to re-attach
            </div>
            <Handle
              type="source"
              position={Position.Top}
              id="reconnect"
              className="!w-4 !h-4 !bg-red-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-125 transition-transform z-30"
              style={{ top: '-8px' }}
            />
          </>
        )}
        <Handle type="source" position={Position.Bottom} id="output" className={handleColor} />
      </div>
    </div>
  );
}

function AddActionNode({ data }: { data: { onClick: () => void; metadata?: { index: number; branch?: 'yes' | 'no'; checkNodeId?: string } } }) {
  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div
        onClick={data.onClick}
        className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center relative group"
      >
        <Handle type="target" position={Position.Top} id="input" className="!bg-gray-400 group-hover:scale-150 transition-transform" />
        <Plus className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        <Handle type="source" position={Position.Bottom} id="output" className="!bg-gray-400 group-hover:scale-150 transition-transform" />
      </div>
    </div>
  );
}

function CheckNode({ data }: { data: { label: string; subtitle?: string; onDelete?: () => void; isDisconnected?: boolean; isOrphanRoot?: boolean } }) {
  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div className="px-4 py-2 rounded-lg border-2 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 transition-colors relative group w-full min-h-[44px] flex items-center">
        <div className="flex items-center gap-2 w-full">
          <div className="flex flex-col flex-1">
            <span className="text-xs font-semibold text-yellow-900 uppercase tracking-wide">Check</span>
            <span className="text-sm font-medium text-yellow-900">{data.subtitle || data.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {data.onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete?.();
                }}
                className="flex items-center justify-center h-6 w-6 rounded hover:bg-yellow-200 transition-colors flex-shrink-0"
                aria-label="Delete check"
              >
                <Trash2 className="h-3 w-3 text-yellow-600" />
              </button>
            )}
          </div>
        </div>
        <Handle type="target" position={Position.Top} id="input" className="!bg-yellow-500" />
        {data.isOrphanRoot && (
          <Handle
            type="source"
            position={Position.Top}
            id="reconnect"
            className="!w-4 !h-4 !bg-red-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-125 transition-transform z-30"
            style={{ top: '-8px' }}
          />
        )}
        <Handle type="source" position={Position.Bottom} id="yes" className="!bg-green-500" />
        <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500" />
      </div>
    </div>
  );
}

function EndNode({ data }: { data: { label: string; isDisconnected?: boolean } }) {
  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div className={`px-4 py-1.5 rounded-full bg-gray-200 border border-gray-300 relative flex items-center justify-center ${data.isDisconnected ? 'border-dashed opacity-50' : ''}`}>
        <Handle type="target" position={Position.Top} id="input" className="!bg-gray-400" />
        <span className="text-xs font-medium text-gray-700">{data.label}</span>
      </div>
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  addAction: AddActionNode,
  check: CheckNode,
  end: EndNode,
};

interface FlowEditorProps {
  onTriggerClick?: () => void;
  onActionClick?: () => void;
}

const DEFAULT_NODES: Node[] = [
  {
    id: 'trigger',
    type: 'trigger',
    position: { x: 200, y: 20 },
    data: { label: 'Create Trigger', onClick: () => { } },
  },
  {
    id: 'add-action',
    type: 'addAction',
    position: { x: 200, y: 120 },
    data: { onClick: () => { } },
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 200, y: 200 },
    data: { label: 'End' },
  },
];

const DEFAULT_EDGES: Edge[] = [
  {
    id: 'trigger-to-add',
    source: 'trigger',
    target: 'add-action',
    type: 'smoothstep',
  },
  {
    id: 'add-to-end',
    source: 'add-action',
    target: 'end',
    type: 'smoothstep',
  },
];


type ActionNodeData = {
  id: string;
  option: ActionOption;
  messageText?: string;
  waitDuration?: number;
  waitUnit?: 'minutes' | 'hours' | 'days';
  repeatLinkedActionId?: string | null;
  selectedQuestionnaires?: Set<string>;
  selectedCheckIns?: Set<string>;
  selectedFiles?: Set<string>;
  selectedHabits?: Set<string>;
  branch?: 'yes' | 'no' | null;
  checkNodeId?: string;
};

export function FlowEditor({ onTriggerClick, onActionClick }: FlowEditorProps) {
  const [panelType, setPanelType] = useState<PanelType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerOption | null>(null);
  const [actionNodes, setActionNodes] = useState<ActionNodeData[]>([]);
  const [checkNodes, setCheckNodes] = useState<Array<{ id: string; linkedActionId: string; repeatActionId: string }>>([]);
  const reactFlowInstanceRef = useRef<any>(null);

  // Action step state
  const [actionStep, setActionStep] = useState<'list' | 'config' | 'confirmation'>('list');
  const [selectedActionOption, setSelectedActionOption] = useState<ActionOption | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<Set<string>>(new Set());
  const [selectedCheckIns, setSelectedCheckIns] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [editingActionNodeId, setEditingActionNodeId] = useState<string | null>(null);
  const [waitDuration, setWaitDuration] = useState<number>(1);
  const [waitUnit, setWaitUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [repeatLinkedActionId, setRepeatLinkedActionId] = useState<string | null>(null);
  const [initialRepeatLinkedActionId, setInitialRepeatLinkedActionId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number>(-1); // Track where new action will be inserted
  const [currentBranch, setCurrentBranch] = useState<'yes' | 'no' | null>(null); // Track which branch we're adding to
  const [currentCheckNodeId, setCurrentCheckNodeId] = useState<string | null>(null); // Track which check node the branch belongs to

  // Data from services
  const [questionnaires, setQuestionnaires] = useState<Array<{ id: string; name: string }>>([]);
  const [checkIns, setCheckIns] = useState<Array<{ id: string; name: string }>>([]);
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([]);
  const [habits, setHabits] = useState<Array<{ id: string; name: string }>>([]);
  const [metrics, setMetrics] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Mock data for habits and files (matching the pages)
  const mockHabits: Habit[] = [
    {
      id: '1',
      name: 'Daily steps',
      description: 'Track your daily step count to stay active',
      amount: 10000,
      unit: 'steps',
      period: 'daily',
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: '2',
      name: 'Drink water',
      description: 'Stay hydrated throughout the day',
      amount: 8,
      unit: 'cups',
      period: 'daily',
      reminderTime: '08:00',
      reminderMessage: 'Time to hydrate!',
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: '3',
      name: 'Meditate',
      description: 'Take time for mindfulness and mental clarity',
      amount: 10,
      unit: 'min',
      period: 'daily',
      duration: 10,
      reminderTime: '07:00',
      reminderMessage: 'Start your day with mindfulness',
      createdAt: Date.now() - 86400000 * 3,
    },
  ];

  const mockFiles: Array<{ id: string; name: string }> = [
    { id: '1', name: 'Training Program Template.pdf' },
    { id: '2', name: 'Nutrition Guide.docx' },
    { id: '3', name: 'Recovery Protocol.pdf' },
    { id: '4', name: 'Workout Video.mp4' },
    { id: '5', name: 'Progress Tracking.xlsx' },
  ];

  const fetchData = useCallback(async () => {
    if (!selectedActionOption) return;

    setIsLoadingData(true);
    try {
      if (selectedActionOption.id === 'assign-questionnaire' || selectedActionOption.id === 'assign-check-in') {
        const allForms = await getForms();
        // Filter forms - questionnaires are non-check-in forms, check-ins are check-in forms
        // Using the same logic as forms page
        const checkInForms = allForms.filter((form) => form.name.includes('Check-in') || form.name.includes('Weekly'));
        const questionnaireForms = allForms.filter((form) => !form.name.includes('Check-in') && !form.name.includes('Weekly'));

        setCheckIns(checkInForms.map((form) => ({ id: form.id, name: form.name })));
        setQuestionnaires(questionnaireForms.map((form) => ({ id: form.id, name: form.name })));
      } else if (selectedActionOption.id === 'add-file') {
        // Using mock data (matching files page)
        setFiles(mockFiles);
      } else if (selectedActionOption.id === 'add-habit') {
        // Using mock data (matching habits page)
        setHabits(mockHabits.map((habit) => ({ id: habit.id, name: habit.name })));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedActionOption]);

  // Fetch data when config step opens
  useEffect(() => {
    if (panelType === 'action' && actionStep === 'config' && selectedActionOption) {
      fetchData();
    }
  }, [panelType, actionStep, selectedActionOption, fetchData]);

  const handleOpenTriggerPanel = useCallback(() => {
    // Reset action-related state when switching to trigger panel
    setActionStep('list');
    setSelectedActionOption(null);
    setEditingActionNodeId(null);
    setMessageText('');
    setSelectedQuestionnaires(new Set());
    setSelectedCheckIns(new Set());
    setSelectedFiles(new Set());
    setSelectedHabits(new Set());
    setSelectedMetrics(new Set());
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setPanelType('trigger');
    onTriggerClick?.();
  }, [onTriggerClick]);

  const handleOpenActionPanel = useCallback((index: number = -1, branch: 'yes' | 'no' | null = null, checkNodeId: string | null = null) => {
    // Reset action state for new action creation
    setActionStep('list');
    setSelectedActionOption(null);
    setEditingActionNodeId(null);
    setMessageText('');
    setSelectedQuestionnaires(new Set());
    setSelectedCheckIns(new Set());
    setSelectedFiles(new Set());
    setSelectedHabits(new Set());
    setSelectedMetrics(new Set());
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setInsertionIndex(index);
    setCurrentBranch(branch);
    setCurrentCheckNodeId(checkNodeId);
    setPanelType('action');
    onActionClick?.();
  }, [onActionClick]);

  const handleDeleteTrigger = useCallback(() => {
    setSelectedTrigger(null);
  }, []);

  const handleDeleteAction = useCallback((actionId: string) => {
    // Also delete associated check node if it exists
    setCheckNodes((prev) => prev.filter((c) => c.repeatActionId !== actionId));
    setActionNodes((prev) => prev.filter((node) => node.id !== actionId));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);

  // Function to build the logical graph nodes and edges
  const buildLogicalGraph = useCallback(() => {
    const logicalNodes: Node[] = [];
    const logicalEdges: Edge[] = [];

    // 1. Trigger Node
    logicalNodes.push({
      id: 'trigger',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: {
        label: selectedTrigger ? 'Trigger' : 'Create Trigger',
        subtitle: selectedTrigger?.name,
        icon: selectedTrigger?.icon,
        onClick: handleOpenTriggerPanel,
        onEdit: selectedTrigger ? handleOpenTriggerPanel : undefined,
        onDelete: selectedTrigger ? handleDeleteTrigger : undefined,
      },
    });

    // 2. Initial Add Action Node after Trigger
    logicalNodes.push({
      id: 'add-action-trigger',
      type: 'addAction',
      position: { x: 0, y: 0 },
      data: {
        onClick: () => handleOpenActionPanel(0),
        metadata: { index: 0 }
      },
    });

    logicalEdges.push({
      id: 'trigger-to-add-trigger',
      source: 'trigger',
      target: 'add-action-trigger',
      type: 'smoothstep',
    });

    // 3. Process actions and check nodes
    if (actionNodes.length > 0) {
      // Connect first add-action to first action or check node
      const firstAction = actionNodes[0];
      const firstCheckNode = checkNodes.find((c) => c.repeatActionId === firstAction.id);

      if (firstCheckNode && firstAction.option.id === 'check') {
        logicalEdges.push({
          id: 'add-trigger-to-check',
          source: 'add-action-trigger',
          target: firstCheckNode.id,
          type: 'smoothstep',
        });
      } else if (firstAction.option.id !== 'check') {
        logicalEdges.push({
          id: 'add-trigger-to-first-action',
          source: 'add-action-trigger',
          target: firstAction.id,
          type: 'smoothstep',
        });
      }

      // Process each action node
      actionNodes.forEach((actionNode, index) => {
        if (actionNode.option.id === 'check') return; // Handled by check nodes

        // Generate subtitle
        let subtitle = actionNode.option.name;
        if (actionNode.option.id === 'send-message') {
          subtitle = actionNode.option.name;
        } else if (actionNode.option.id === 'wait') {
          const duration = actionNode.waitDuration || 1;
          const unit = actionNode.waitUnit || 'hours';
          const unitLabel = duration === 1 ? unit.slice(0, -1) : unit;
          subtitle = `Wait ${duration} ${unitLabel}`;
        } else {
          const count = actionNode.option.id === 'assign-questionnaire'
            ? (actionNode.selectedQuestionnaires?.size || 0)
            : actionNode.option.id === 'assign-check-in'
              ? (actionNode.selectedCheckIns?.size || 0)
              : actionNode.option.id === 'add-file'
                ? (actionNode.selectedFiles?.size || 0)
                : actionNode.option.id === 'add-habit'
                  ? (actionNode.selectedHabits?.size || 0)
                  : 0;

          if (count > 0) {
            const baseName = actionNode.option.name.replace(/^Add /i, '').replace(/^Assign /i, '');
            let singularName = baseName.toLowerCase();
            let pluralName = singularName;

            if (singularName === 'questionnaire') pluralName = 'questionnaires';
            else if (singularName === 'check-in' || singularName === 'check in') pluralName = 'check-ins';
            else if (singularName === 'file') pluralName = 'files';
            else if (singularName === 'habit') pluralName = 'habits';
            else if (!singularName.endsWith('s')) pluralName = `${singularName}s`;

            const itemName = count === 1 ? singularName : pluralName;
            subtitle = actionNode.option.id.startsWith('assign-') ? `Assign ${count} ${itemName}` : `Add ${count} ${itemName}`;
          }
        }

        logicalNodes.push({
          id: actionNode.id,
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            label: actionNode.option.id === 'wait' ? 'Wait' : 'Action',
            subtitle,
            icon: actionNode.option.icon,
            isWait: actionNode.option.id === 'wait',
            isRepeat: actionNode.option.id === 'check',
            onClick: () => {
              setEditingActionNodeId(actionNode.id);
              setSelectedActionOption(actionNode.option);
              setPanelType('action');
              onActionClick?.();
              if (actionNode.option.id === 'send-message') {
                setMessageText(actionNode.messageText || '');
                setActionStep('config');
              } else if (actionNode.option.id === 'wait') {
                setWaitDuration(actionNode.waitDuration || 1);
                setWaitUnit(actionNode.waitUnit || 'hours');
                setActionStep('config');
              } else {
                setSelectedQuestionnaires(actionNode.selectedQuestionnaires || new Set());
                setSelectedCheckIns(actionNode.selectedCheckIns || new Set());
                setSelectedFiles(actionNode.selectedFiles || new Set());
                setSelectedHabits(actionNode.selectedHabits || new Set());
                setActionStep('confirmation');
                fetchData();
              }
            },
            onEdit: () => {
              setEditingActionNodeId(actionNode.id);
              setSelectedActionOption(actionNode.option);
              setPanelType('action');
              onActionClick?.();
              if (actionNode.option.id === 'send-message') {
                setMessageText(actionNode.messageText || '');
                setActionStep('config');
              } else if (actionNode.option.id === 'wait') {
                setWaitDuration(actionNode.waitDuration || 1);
                setWaitUnit(actionNode.waitUnit || 'hours');
                setActionStep('config');
              } else {
                setSelectedQuestionnaires(actionNode.selectedQuestionnaires || new Set());
                setSelectedCheckIns(actionNode.selectedCheckIns || new Set());
                setSelectedFiles(actionNode.selectedFiles || new Set());
                setSelectedHabits(actionNode.selectedHabits || new Set());
                setActionStep('confirmation');
                fetchData();
              }
            },
            onDelete: () => handleDeleteAction(actionNode.id),
          },
        });

        // Add action button after this node
        let addActionInsertionIndex: number;
        if (actionNode.branch && actionNode.checkNodeId) {
          const branchActions = actionNodes.filter(a => a.checkNodeId === actionNode.checkNodeId && a.branch === actionNode.branch);
          const positionInBranch = branchActions.findIndex(a => a.id === actionNode.id);
          addActionInsertionIndex = positionInBranch + 1;
        } else {
          addActionInsertionIndex = index + 1;
        }

        const addActionId = `add-action-${actionNode.id}`;
        logicalNodes.push({
          id: addActionId,
          type: 'addAction',
          position: { x: 0, y: 0 },
          data: {
            onClick: () => handleOpenActionPanel(addActionInsertionIndex, actionNode.branch, actionNode.checkNodeId),
            metadata: {
              index: addActionInsertionIndex,
              branch: actionNode.branch,
              checkNodeId: actionNode.checkNodeId
            }
          },
        });

        logicalEdges.push({
          id: `action-${actionNode.id}-to-add`,
          source: actionNode.id,
          target: addActionId,
          type: 'smoothstep',
        });

        // Connect addAction to next node in the same branch or main flow
        let nextAction: ActionNodeData | undefined;
        if (actionNode.branch && actionNode.checkNodeId) {
          const branchActions = actionNodes.filter(a => a.checkNodeId === actionNode.checkNodeId && a.branch === actionNode.branch);
          const idxInBranch = branchActions.findIndex(a => a.id === actionNode.id);
          nextAction = branchActions[idxInBranch + 1];
        } else {
          nextAction = actionNodes.slice(index + 1).find(a => !a.branch);
        }

        if (nextAction) {
          const nextCheckNode = checkNodes.find(c => c.repeatActionId === nextAction?.id);
          logicalEdges.push({
            id: `add-${actionNode.id}-to-next`,
            source: addActionId,
            target: (nextCheckNode && nextAction.option.id === 'check') ? nextCheckNode.id : nextAction.id,
            type: 'smoothstep',
          });
        } else if (!actionNode.branch) {
          // End of main flow
          logicalEdges.push({
            id: `add-${actionNode.id}-to-end`,
            source: addActionId,
            target: 'end',
            type: 'smoothstep',
          });
        }
      });

      // 4. Process check nodes
      checkNodes.forEach((checkNode) => {
        logicalNodes.push({
          id: checkNode.id,
          type: 'check',
          position: { x: 0, y: 0 },
          data: {
            label: 'Check',
            subtitle: 'Check in completed',
            onDelete: () => handleDeleteAction(checkNode.repeatActionId),
          },
        });

        // Branch connections
        ['yes', 'no'].forEach((branch) => {
          const branchActions = actionNodes.filter(a => a.checkNodeId === checkNode.id && a.branch === branch);
          const addActionId = `add-action-${branch}-${checkNode.id}`;

          if (branchActions.length === 0) {
            // No actions in branch, connect check directly to an add-action node
            logicalNodes.push({
              id: addActionId,
              type: 'addAction',
              position: { x: 0, y: 0 },
              data: {
                onClick: () => handleOpenActionPanel(0, branch as 'yes' | 'no', checkNode.id),
                metadata: {
                  index: 0,
                  branch: branch as 'yes' | 'no',
                  checkNodeId: checkNode.id
                }
              },
            });
            logicalEdges.push({
              id: `check-${checkNode.id}-${branch}-to-add`,
              source: checkNode.id,
              sourceHandle: branch,
              target: addActionId,
              type: 'smoothstep',
              label: branch === 'yes' ? 'Yes' : 'No',
            });
            // Connect this add-action to a branch end node
            const branchEndId = `end-${branch}-${checkNode.id}`;
            logicalNodes.push({
              id: branchEndId,
              type: 'end',
              position: { x: 0, y: 0 },
              data: { label: 'End' },
            });
            logicalEdges.push({
              id: `add-${branch}-${checkNode.id}-to-end`,
              source: addActionId,
              target: branchEndId,
              type: 'smoothstep',
            });
          } else {
            // Connect check to first action in branch
            const firstAction = branchActions[0];
            const firstActionCheck = checkNodes.find(c => c.repeatActionId === firstAction.id);
            logicalEdges.push({
              id: `check-${checkNode.id}-${branch}-to-first`,
              source: checkNode.id,
              sourceHandle: branch,
              target: (firstActionCheck && firstAction.option.id === 'check') ? firstActionCheck.id : firstAction.id,
              type: 'smoothstep',
              label: branch === 'yes' ? 'Yes' : 'No',
            });

            // The last action in the branch needs to connect to a branch end node
            const lastAction = branchActions[branchActions.length - 1];
            if (lastAction.option.id !== 'check') {
              const lastAddActionId = `add-action-${lastAction.id}`;
              const branchEndId = `end-${branch}-${checkNode.id}`;
              logicalNodes.push({
                id: branchEndId,
                type: 'end',
                position: { x: 0, y: 0 },
                data: { label: 'End' },
              });
              logicalEdges.push({
                id: `add-${lastAction.id}-to-branch-end`,
                source: lastAddActionId,
                target: branchEndId,
                type: 'smoothstep',
              });
            }
          }
        });
      });
    } else {
      // No actions: connect trigger-add to main end node
      logicalEdges.push({
        id: 'add-trigger-to-end',
        source: 'add-action-trigger',
        target: 'end',
        type: 'smoothstep',
      });
    }

    // 5. Main End Node
    // We need a main end node if the main flow doesn't terminate at a check node
    const mainFlowActions = actionNodes.filter(a => !a.branch);
    const lastMainFlowAction = mainFlowActions[mainFlowActions.length - 1];

    if (!lastMainFlowAction || lastMainFlowAction.option.id !== 'check') {
      logicalNodes.push({
        id: 'end',
        type: 'end',
        position: { x: 0, y: 0 },
        data: { label: 'End' },
      });
    }

    // 6. Find disconnected groups and identify roots
    const reachable = new Set<string>(['trigger']);
    let changed = true;
    while (changed) {
      changed = false;
      logicalEdges.forEach(e => {
        if (reachable.has(e.source) && !reachable.has(e.target)) {
          reachable.add(e.target);
          changed = true;
        }
      });
    }

    // Count incoming edges for nodes not reachable from trigger
    const incomingCount: Record<string, number> = {};
    logicalEdges.forEach(e => {
      incomingCount[e.target] = (incomingCount[e.target] || 0) + 1;
    });

    // Mark nodes as disconnected or orphan root
    logicalNodes.forEach(node => {
      if (!reachable.has(node.id) && node.id !== 'trigger') {
        const isRoot = !incomingCount[node.id];
        node.data = { ...node.data, isDisconnected: true, isOrphanRoot: isRoot };
      }
    });

    return { logicalNodes, logicalEdges };
  }, [selectedTrigger, actionNodes, checkNodes, handleOpenTriggerPanel, handleOpenActionPanel, handleDeleteTrigger, handleDeleteAction, fetchData]);

  // Handle auto-layout
  useEffect(() => {
    let isMounted = true;

    const layout = async () => {
      const { logicalNodes, logicalEdges } = buildLogicalGraph();
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(logicalNodes, logicalEdges);

      if (!isMounted) return;

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      // Viewport centering is handled only once on initial load (onInit).
      // We removed the auto-centering here to prevent the view from jumping 
      // back to the top whenever nodes are added or edited.

    };

    layout();

    return () => {
      isMounted = false;
    };
  }, [buildLogicalGraph, setNodes, setEdges]);


  const onConnect = useCallback(
    (params: Connection) => {
      // If target is an addAction node, we want to perform a re-attachment
      if (params.target && params.target.startsWith('add-action-') && params.source) {
        const sourceId = params.source;
        const targetId = params.target;

        // Find the addAction node in our current logical nodes to get its metadata
        const targetNode = nodes.find(n => n.id === targetId);
        if (targetNode?.data?.metadata) {
          const { index, branch, checkNodeId } = targetNode.data.metadata;

          setActionNodes(prev => {
            const movingNodeIdx = prev.findIndex(n => n.id === sourceId);
            if (movingNodeIdx === -1) return prev;

            const updatedNodes = [...prev];
            const [movingNode] = updatedNodes.splice(movingNodeIdx, 1);

            // Update the node's branch context
            const reattachedNode = {
              ...movingNode,
              branch: branch || undefined,
              checkNodeId: checkNodeId || undefined
            };

            // Calculate new insertion index
            // If it's a branch, we need to find the correct spot in the global array
            if (branch && checkNodeId) {
              const branchActions = updatedNodes.filter(a => a.checkNodeId === checkNodeId && a.branch === branch);
              if (index === 0 || branchActions.length === 0) {
                // Add to the end of the global array (it will be filtered into the branch)
                return [...updatedNodes, reattachedNode];
              } else {
                const targetBranchAction = branchActions[index - 1];
                const globalIdx = updatedNodes.findIndex(a => a.id === targetBranchAction.id);
                updatedNodes.splice(globalIdx + 1, 0, reattachedNode);
                return updatedNodes;
              }
            } else {
              // Main flow
              updatedNodes.splice(index, 0, reattachedNode);
              return updatedNodes;
            }
          });
        }
      } else {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [nodes, setEdges, setActionNodes]
  );

  const onNodeDrag = useCallback(
    (_: any, node: Node, nodes: Node[]) => {
      // Only handle children movement if this is an orphan root
      if (node.data?.isOrphanRoot) {
        // Collect all nodes reachable from this root in the logical graph
        const reachable = new Set<string>([node.id]);
        let changed = true;
        while (changed) {
          changed = false;
          edges.forEach((e) => {
            if (reachable.has(e.source) && !reachable.has(e.target)) {
              reachable.add(e.target);
              changed = true;
            }
          });
        }

        // Calculate the delta movement
        const dx = node.dragHandle ? 0 : 0; // React Flow already updated 'node.position'

        // Update all reachable nodes except the root itself (which is already moving)
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== node.id && reachable.has(n.id)) {
              // We need the original position before this drag step to apply the same delta
              // But React Flow gives us the new 'node.position'. 
              // A better way is to use the difference between 'node.position' and 'node.dragging' state.
              // However, since we are in onNodeDrag, we can just apply the same movement. 
              // React Flow handles the root. We handle the others by offsetting them relative to the root.
            }
            return n;
          })
        );
      }
    },
    [edges, setNodes]
  );

  const handleCloseSidePanel = () => {
    setSearchQuery('');
    setPanelType(null);
    setActionStep('list');
    setSelectedActionOption(null);
    setMessageText('');
    setSelectedQuestionnaires(new Set());
    setSelectedCheckIns(new Set());
    setSelectedFiles(new Set());
    setSelectedHabits(new Set());
    setSelectedMetrics(new Set());
    setEditingActionNodeId(null);
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setInitialRepeatLinkedActionId(null);
    setInsertionIndex(-1);
    setCurrentBranch(null);
    setCurrentCheckNodeId(null);
  };

  const handleTriggerOptionClick = (option: TriggerOption) => {
    setSelectedTrigger(option);
    handleCloseSidePanel();
  };

  const handleActionOptionClick = (option: ActionOption) => {
    if (option.id === 'check') {
      // For check actions (check nodes), immediately create the check node
      const newActionNode: ActionNodeData = {
        id: `action-${Date.now()}-${Math.random()}`,
        option: option,
        repeatLinkedActionId: null,
        branch: currentBranch || undefined,
        checkNodeId: currentCheckNodeId || undefined,
      };

      // Insert at the correct position
      setActionNodes((prev) => {
        // If this is a branch action, insert at the correct position within the branch
        if (currentBranch && currentCheckNodeId) {
          // Find all actions in this branch
          const branchActions = prev.filter(a =>
            a.checkNodeId === currentCheckNodeId &&
            a.branch === currentBranch
          );

          if (branchActions.length === 0 || insertionIndex === 0) {
            // First action in the branch - add it after all existing actions
            return [...prev, newActionNode];
          } else {
            // Insert at the specified position within the branch
            // Find the global index of the action at insertionIndex - 1 in this branch
            const targetBranchAction = branchActions[insertionIndex - 1];
            const globalIndex = prev.findIndex(a => a.id === targetBranchAction.id);

            // Insert after that action
            return [...prev.slice(0, globalIndex + 1), newActionNode, ...prev.slice(globalIndex + 1)];
          }
        }

        // For main flow actions, use insertionIndex
        if (insertionIndex >= 0 && insertionIndex < prev.length) {
          return [...prev.slice(0, insertionIndex), newActionNode, ...prev.slice(insertionIndex)];
        }

        // Default to appending at the end
        return [...prev, newActionNode];
      });

      // Create the check node
      const checkNodeId = `check-${Date.now()}-${Math.random()}`;
      setCheckNodes((prev) => [
        ...prev,
        {
          id: checkNodeId,
          linkedActionId: '',
          repeatActionId: newActionNode.id,
        },
      ]);

      // Reset and close
      handleBackToActionList();
      handleCloseSidePanel();
    } else if (option.id === 'send-message' || option.id === 'wait') {
      // For message and wait, go directly to config step
      setSelectedActionOption(option);
      setActionStep('config');
    } else {
      // For others, go to config step with grid selector
      setSelectedActionOption(option);
      setActionStep('config');
    }
  };

  const handleBackToActionList = () => {
    setActionStep('list');
    setSelectedActionOption(null);
    setMessageText('');
    setSelectedQuestionnaires(new Set());
    setSelectedCheckIns(new Set());
    setSelectedFiles(new Set());
    setSelectedHabits(new Set());
    setSelectedMetrics(new Set());
    setEditingActionNodeId(null);
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setInitialRepeatLinkedActionId(null);
    setInsertionIndex(-1);
    setCurrentBranch(null);
    setCurrentCheckNodeId(null);
  };

  const handleActionContinue = () => {
    if (selectedActionOption?.id === 'send-message' || selectedActionOption?.id === 'wait' || selectedActionOption?.id === 'check') {
      // For message, wait, and check, save directly
      handleSaveAction();
    } else {
      // For others, go to confirmation
      setActionStep('confirmation');
    }
  };

  const handleSaveAction = () => {
    if (!selectedActionOption) return;

    if (editingActionNodeId) {
      // Update existing action node
      setActionNodes((prev) =>
        prev.map((node) =>
          node.id === editingActionNodeId
            ? {
              ...node,
              messageText: selectedActionOption.id === 'send-message' ? messageText : undefined,
              waitDuration: selectedActionOption.id === 'wait' ? waitDuration : undefined,
              waitUnit: selectedActionOption.id === 'wait' ? waitUnit : undefined,
              repeatLinkedActionId: selectedActionOption.id === 'check' ? repeatLinkedActionId : undefined,
              selectedQuestionnaires: selectedActionOption.id === 'assign-questionnaire' ? selectedQuestionnaires : undefined,
              selectedCheckIns: selectedActionOption.id === 'assign-check-in' ? selectedCheckIns : undefined,
              selectedFiles: selectedActionOption.id === 'add-file' ? selectedFiles : undefined,
              selectedHabits: selectedActionOption.id === 'add-habit' ? selectedHabits : undefined,
            }
            : node
        )
      );

      // Update check node if it exists for this check action
      if (selectedActionOption.id === 'check' && repeatLinkedActionId) {
        setCheckNodes((prev) => {
          const existing = prev.find((c) => c.repeatActionId === editingActionNodeId);
          if (existing) {
            return prev.map((c) =>
              c.repeatActionId === editingActionNodeId
                ? { ...c, linkedActionId: repeatLinkedActionId }
                : c
            );
          }
          return prev;
        });
      }

      setEditingActionNodeId(null);
    } else {
      // Create new action node
      const newActionNode: ActionNodeData = {
        id: `action-${Date.now()}-${Math.random()}`,
        option: selectedActionOption,
        messageText: selectedActionOption.id === 'send-message' ? messageText : undefined,
        waitDuration: selectedActionOption.id === 'wait' ? waitDuration : undefined,
        waitUnit: selectedActionOption.id === 'wait' ? waitUnit : undefined,
        repeatLinkedActionId: selectedActionOption.id === 'check' ? repeatLinkedActionId : undefined,
        selectedQuestionnaires: selectedActionOption.id === 'assign-questionnaire' ? selectedQuestionnaires : undefined,
        selectedCheckIns: selectedActionOption.id === 'assign-check-in' ? selectedCheckIns : undefined,
        selectedFiles: selectedActionOption.id === 'add-file' ? selectedFiles : undefined,
        selectedHabits: selectedActionOption.id === 'add-habit' ? selectedHabits : undefined,
        branch: currentBranch || undefined,
        checkNodeId: currentCheckNodeId || undefined,
      };
      // Insert at the correct position
      setActionNodes((prev) => {
        // If this is a branch action, insert at the correct position within the branch
        if (currentBranch && currentCheckNodeId) {
          // Find all actions in this branch
          const branchActions = prev.filter(a =>
            a.checkNodeId === currentCheckNodeId &&
            a.branch === currentBranch
          );

          if (branchActions.length === 0 || insertionIndex === 0) {
            // First action in the branch - add it after all existing actions
            return [...prev, newActionNode];
          } else {
            // Insert at the specified position within the branch
            // Find the global index of the action at insertionIndex - 1 in this branch
            const targetBranchAction = branchActions[insertionIndex - 1];
            const globalIndex = prev.findIndex(a => a.id === targetBranchAction.id);

            // Insert after that action
            return [...prev.slice(0, globalIndex + 1), newActionNode, ...prev.slice(globalIndex + 1)];
          }
        }

        // For main flow actions, use insertionIndex
        if (insertionIndex >= 0 && insertionIndex < prev.length) {
          return [...prev.slice(0, insertionIndex), newActionNode, ...prev.slice(insertionIndex)];
        }

        // Default to appending at the end
        return [...prev, newActionNode];
      });

      // If check action, create a check node (no longer needs linkedActionId)
      if (selectedActionOption.id === 'check') {
        const checkNodeId = `check-${Date.now()}-${Math.random()}`;
        setCheckNodes((prev) => [
          ...prev,
          {
            id: checkNodeId,
            linkedActionId: '', // Not used anymore, but kept for type compatibility
            repeatActionId: newActionNode.id,
          },
        ]);
      }
    }

    // Reset and close
    handleBackToActionList();
    handleCloseSidePanel();
  };

  const handleDeleteActionFromEdit = () => {
    if (editingActionNodeId) {
      handleDeleteAction(editingActionNodeId);
      setEditingActionNodeId(null);
      handleBackToActionList();
      handleCloseSidePanel();
    }
  };

  const handleAddMore = () => {
    // Go back to config step to add more items
    setActionStep('config');
  };

  const handleToggleQuestionnaire = (id: string) => {
    const newSet = new Set(selectedQuestionnaires);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedQuestionnaires(newSet);

    // If editing and all items removed, delete the node or close sidebar
    if (editingActionNodeId && newSet.size === 0 && selectedActionOption?.id === 'assign-questionnaire') {
      handleDeleteActionFromEdit();
    }
  };

  const handleToggleCheckIn = (id: string) => {
    const newSet = new Set(selectedCheckIns);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCheckIns(newSet);

    // If editing and all items removed, delete the node or close sidebar
    if (editingActionNodeId && newSet.size === 0 && selectedActionOption?.id === 'assign-check-in') {
      handleDeleteActionFromEdit();
    }
  };

  const handleToggleFile = (id: string) => {
    const newSet = new Set(selectedFiles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFiles(newSet);

    // If editing and all items removed, delete the node or close sidebar
    if (editingActionNodeId && newSet.size === 0 && selectedActionOption?.id === 'add-file') {
      handleDeleteActionFromEdit();
    }
  };

  const handleToggleHabit = (id: string) => {
    const newSet = new Set(selectedHabits);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedHabits(newSet);

    // If editing and all items removed, delete the node or close sidebar
    if (editingActionNodeId && newSet.size === 0 && selectedActionOption?.id === 'add-habit') {
      handleDeleteActionFromEdit();
    }
  };

  const handleToggleMetric = (id: string) => {
    const newSet = new Set(selectedMetrics);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMetrics(newSet);

    // If editing and all items removed, delete the node or close sidebar
    if (editingActionNodeId && newSet.size === 0 && selectedActionOption?.id === 'add-metric') {
      handleDeleteActionFromEdit();
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent, option: TriggerOption) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTriggerOptionClick(option);
    }
  };

  const handleActionKeyDown = (event: React.KeyboardEvent, option: ActionOption) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActionOptionClick(option);
    }
  };


  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* React Flow - Full width always */}
      <div className="w-full h-full bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          onInit={(reactFlowInstance) => {
            reactFlowInstanceRef.current = reactFlowInstance;
            // Center horizontally and position at top vertically
            setTimeout(() => {
              const container = reactFlowInstance.getViewport();
              const triggerNode = nodes.find((n) => n.id === 'trigger');

              if (triggerNode) {
                // Get the container dimensions
                const bounds = reactFlowInstance.getNodes();
                const flowBounds = document.querySelector('.react-flow__renderer');

                if (flowBounds) {
                  const containerWidth = flowBounds.clientWidth;
                  const nodeWidth = 300; // Our node width

                  // Center horizontally: (containerWidth / 2) - (nodeWidth / 2) - nodeX
                  const centerX = (containerWidth / 2) - (nodeWidth / 2) - triggerNode.position.x;

                  // Position at top with padding
                  const topPadding = 40;
                  const topY = -triggerNode.position.y + topPadding;

                  reactFlowInstance.setViewport({ x: centerX, y: topY, zoom: 1 });
                }
              }
            }, 100);
          }}
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.8,
            maxZoom: 1.2,
          }}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Right Sidebar - Overlays on top */}
      <FlowEditorSidePanel
        panelType={panelType}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedTrigger={selectedTrigger}
        actionStep={actionStep}
        selectedActionOption={selectedActionOption}
        messageText={messageText}
        onMessageTextChange={setMessageText}
        selectedQuestionnaires={selectedQuestionnaires}
        selectedCheckIns={selectedCheckIns}
        selectedFiles={selectedFiles}
        selectedHabits={selectedHabits}
        selectedMetrics={selectedMetrics}
        onToggleQuestionnaire={handleToggleQuestionnaire}
        onToggleCheckIn={handleToggleCheckIn}
        onToggleFile={handleToggleFile}
        onToggleHabit={handleToggleHabit}
        onToggleMetric={handleToggleMetric}
        questionnaires={questionnaires}
        checkIns={checkIns}
        files={files}
        habits={habits}
        metrics={metrics}
        isLoadingData={isLoadingData}
        onClose={handleCloseSidePanel}
        onTriggerOptionClick={handleTriggerOptionClick}
        onActionOptionClick={handleActionOptionClick}
        onBackToActionList={handleBackToActionList}
        onActionContinue={handleActionContinue}
        onSaveAction={handleSaveAction}
        onDeleteAction={handleDeleteActionFromEdit}
        editingActionNodeId={editingActionNodeId}
        onAddMore={handleAddMore}
        waitDuration={waitDuration}
        waitUnit={waitUnit}
        onWaitDurationChange={setWaitDuration}
        onWaitUnitChange={setWaitUnit}
        repeatLinkedActionId={repeatLinkedActionId}
        onRepeatLinkedActionIdChange={setRepeatLinkedActionId}
        initialRepeatLinkedActionId={initialRepeatLinkedActionId}
        actionNodes={
          editingActionNodeId
            ? actionNodes.slice(0, actionNodes.findIndex(a => a.id === editingActionNodeId))
            : actionNodes.slice(0, insertionIndex)
        }
        onTriggerKeyDown={handleTriggerKeyDown}
        onActionKeyDown={handleActionKeyDown}
        isPreviousActionCheck={
          // Only prevent checks after checks in the main flow (not in branches)
          (() => {
            if (currentBranch) return false; // Allow checks in branches
            if (insertionIndex <= 0) return false; // No previous action

            // Find the previous main flow action (skip branch actions)
            for (let i = insertionIndex - 1; i >= 0; i--) {
              const action = actionNodes[i];
              // Skip branch actions
              if (action.branch && action.checkNodeId) continue;
              // Found the previous main flow action
              return action.option.id === 'check';
            }
            return false;
          })()
        }
      />
    </div>
  );
}
