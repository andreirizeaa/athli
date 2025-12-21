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

// Custom node components
function TriggerNode({ data }: { data: { label: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; onEdit?: () => void; onDelete?: () => void } }) {
  const IconComponent = data.icon || Play;
  const hasSelection = !!data.subtitle;

  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div
        className={`px-4 py-2 rounded-lg border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors relative group w-full min-h-[44px] flex items-center ${
          hasSelection ? '' : 'border-dashed'
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
        <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
      </div>
    </div>
  );
}

function ActionNode({ data }: { data: { label: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; onEdit?: () => void; onDelete?: () => void; isWait?: boolean; isRepeat?: boolean } }) {
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
        <Handle type="target" position={Position.Top} className={handleColor} />
        <Handle type="source" position={Position.Bottom} className={handleColor} />
      </div>
    </div>
  );
}

function AddActionNode({ data }: { data: { onClick: () => void } }) {
  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div
        onClick={data.onClick}
        className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center relative"
      >
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />
        <Plus className="h-3 w-3 text-gray-500" />
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      </div>
    </div>
  );
}

function CheckNode({ data }: { data: { label: string; onEdit?: () => void; onDelete?: () => void } }) {
  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div className="px-4 py-2 rounded-lg border-2 border-purple-500 bg-purple-50 hover:bg-purple-100 transition-colors relative group w-full min-h-[44px] flex items-center">
        <div className="flex items-center gap-2 w-full">
          <div className="flex flex-col flex-1">
            <span className="text-xs font-semibold text-purple-900 uppercase tracking-wide">Check</span>
            <span className="text-sm font-medium text-purple-900">{data.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {data.onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onEdit?.();
                }}
                className="flex items-center justify-center h-6 w-6 rounded hover:bg-purple-200 transition-colors flex-shrink-0"
                aria-label="Edit check"
              >
                <Pencil className="h-3 w-3 text-purple-600" />
              </button>
            )}
            {data.onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete?.();
                }}
                className="flex items-center justify-center h-6 w-6 rounded hover:bg-purple-200 transition-colors flex-shrink-0"
                aria-label="Delete check"
              >
                <Trash2 className="h-3 w-3 text-purple-600" />
              </button>
            )}
          </div>
        </div>
        <Handle type="target" position={Position.Top} className="!bg-purple-500" />
        <Handle type="source" position={Position.Right} id="yes" className="!bg-purple-500" />
        <Handle type="source" position={Position.Bottom} id="no" className="!bg-purple-500" />
      </div>
    </div>
  );
}

function EndNode({ data }: { data: { label: string } }) {
  return (
    <div className="flex justify-center" style={{ width: '300px' }}>
      <div className="px-4 py-1.5 rounded-full bg-gray-200 border border-gray-300 relative flex items-center justify-center">
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />
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
    data: { label: 'Create Trigger', onClick: () => {} },
  },
  {
    id: 'add-action',
    type: 'addAction',
    position: { x: 200, y: 120 },
    data: { onClick: () => {} },
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
  const [editingActionNodeId, setEditingActionNodeId] = useState<string | null>(null);
  const [waitDuration, setWaitDuration] = useState<number>(1);
  const [waitUnit, setWaitUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [repeatLinkedActionId, setRepeatLinkedActionId] = useState<string | null>(null);
  const [initialRepeatLinkedActionId, setInitialRepeatLinkedActionId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number>(-1); // Track where new action will be inserted

  // Data from services
  const [questionnaires, setQuestionnaires] = useState<Array<{ id: string; name: string }>>([]);
  const [checkIns, setCheckIns] = useState<Array<{ id: string; name: string }>>([]);
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([]);
  const [habits, setHabits] = useState<Array<{ id: string; name: string }>>([]);
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
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setPanelType('trigger');
    onTriggerClick?.();
  }, [onTriggerClick]);

  const handleOpenActionPanel = useCallback((index: number = -1) => {
    // Reset action state for new action creation
    setActionStep('list');
    setSelectedActionOption(null);
    setEditingActionNodeId(null);
    setMessageText('');
    setSelectedQuestionnaires(new Set());
    setSelectedCheckIns(new Set());
    setSelectedFiles(new Set());
    setSelectedHabits(new Set());
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setInsertionIndex(index);
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

  // Update nodes when trigger or action nodes change
  useEffect(() => {
    const triggerY = 20;
    const nodeSpacing = 100;
    
    // Calculate positions: trigger at top, then add-action, then alternating action nodes and add-action nodes
    // The add-action node should be centered between the two nodes around it
    const triggerNodeY = triggerY;
    const nodeHeight = 44; // Approximate height of trigger/action nodes
    const addActionNodeHeight = 24; // Height of add-action node (w-6 h-6)
    
    // Position add-action after trigger: centered in the gap
    const triggerBottom = triggerNodeY + nodeHeight;
    const firstAddActionY = triggerBottom + (nodeSpacing / 2) - (addActionNodeHeight / 2);
    
    // Position first action: centered after add-action
    const addActionBottom = firstAddActionY + addActionNodeHeight;
    const firstActionY = addActionBottom + (nodeSpacing / 2) - (nodeHeight / 2);
    
    // Calculate positions: each action node is followed by an add-action node
    // Calculate sequentially to avoid circular reference
    const actionNodePositions: Array<{ y: number }> = [];
    const addActionNodePositions: Array<{ y: number }> = [];
    
    for (let index = 0; index < actionNodes.length; index++) {
      let actionY: number;
      if (index === 0) {
        actionY = firstActionY;
      } else {
        // Calculate based on previous add-action position
        const prevActionY = actionNodePositions[index - 1].y;
        const prevActionBottom = prevActionY + nodeHeight;
        const prevAddActionY = prevActionBottom + (nodeSpacing / 2) - (addActionNodeHeight / 2);
        const prevAddActionBottom = prevAddActionY + addActionNodeHeight;
        actionY = prevAddActionBottom + (nodeSpacing / 2) - (nodeHeight / 2);
      }
      actionNodePositions.push({ y: actionY });
      
      // Add-action node goes after this action (centered)
      const actionBottom = actionY + nodeHeight;
      const addActionY = actionBottom + (nodeSpacing / 2) - (addActionNodeHeight / 2);
      addActionNodePositions.push({ y: addActionY });
    }
    
    // Calculate check node positions (they replace repeat actions)
    const checkNodePositions: Array<{ y: number; checkNode: { id: string; linkedActionId: string; repeatActionId: string } }> = [];
    const checkNodeAddActionPositions: Array<{ y: number; checkNodeId: string; repeatActionIndex: number }> = [];
    checkNodes.forEach((checkNode) => {
      const repeatActionIndex = actionNodes.findIndex((a) => a.id === checkNode.repeatActionId);
      if (repeatActionIndex >= 0) {
        // Check node replaces the repeat action position
        const checkY = actionNodePositions[repeatActionIndex].y;
        checkNodePositions.push({ y: checkY, checkNode });

        // Add-action node after check node (for continuing the flow)
        const checkBottom = checkY + nodeHeight;
        const addActionAfterCheckY = checkBottom + (nodeSpacing / 2) - (addActionNodeHeight / 2);
        checkNodeAddActionPositions.push({ y: addActionAfterCheckY, checkNodeId: checkNode.id, repeatActionIndex });
      }
    });
    
    // Calculate add-action node before end (for check node "no" edge)
    // End node goes after the last add-action node or check node
    let endNodeY: number;
    let addActionBeforeEndY: number | null = null;
    if (actionNodes.length > 0) {
      const lastAddActionY = addActionNodePositions[actionNodes.length - 1].y;

      // If there are check nodes, add an add-action node before end (for Yes path from check node)
      if (checkNodePositions.length > 0) {
        // Find the index of the last repeat action (which becomes a check node)
        const lastCheckNodeIndex = checkNodePositions.length - 1;
        const lastCheckNode = checkNodePositions[lastCheckNodeIndex].checkNode;
        const repeatActionIndex = actionNodes.findIndex((a) => a.id === lastCheckNode.repeatActionId);

        // Check if there are any actions after the last repeat action
        const hasActionsAfterCheck = repeatActionIndex < actionNodes.length - 1;

        if (hasActionsAfterCheck) {
          // If there are actions after the check node, position end after the last add-action
          // No need for add-action-before-end since we already have add-action nodes after the last action
          endNodeY = lastAddActionY + addActionNodeHeight + (nodeSpacing / 2);
        } else {
          // If check node is last, position add-action-before-end after it
          const lastCheckY = checkNodePositions[lastCheckNodeIndex].y;
          const lastCheckBottom = lastCheckY + nodeHeight;
          addActionBeforeEndY = lastCheckBottom + (nodeSpacing / 2) - (addActionNodeHeight / 2);
          endNodeY = addActionBeforeEndY + addActionNodeHeight + (nodeSpacing / 2);
        }
      } else {
        // No check nodes, position end after last add-action
        endNodeY = lastAddActionY + addActionNodeHeight + (nodeSpacing / 2);
      }
    } else {
      endNodeY = firstAddActionY + addActionNodeHeight + (nodeSpacing / 2);
    }

    const updatedNodes: Node[] = [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 200, y: triggerNodeY },
        data: {
          label: selectedTrigger ? 'Trigger' : 'Create Trigger',
          subtitle: selectedTrigger?.name,
          icon: selectedTrigger?.icon,
          onClick: handleOpenTriggerPanel,
          onEdit: selectedTrigger ? handleOpenTriggerPanel : undefined,
          onDelete: selectedTrigger ? handleDeleteTrigger : undefined,
          },
        },
      {
        id: 'add-action-trigger',
        type: 'addAction',
        position: { x: 200, y: firstAddActionY },
        data: { onClick: () => handleOpenActionPanel(0) },
      },
      ...actionNodes.flatMap((actionNode, index) => {
        // Skip repeat actions - they are replaced by check nodes
        if (actionNode.option.id === 'repeat') {
          return [];
        }
        
        // Calculate action number (only counting non-repeat actions)
        const actionNumber = actionNodes.slice(0, index + 1).filter(a => a.option.id !== 'repeat').length;
        
        // Generate subtitle with count for grid picker actions
        let subtitle = actionNode.option.name;
        if (actionNode.option.id === 'send-message') {
          // Keep message name as is
          subtitle = actionNode.option.name;
        } else if (actionNode.option.id === 'wait') {
          // Format wait action: "Wait 1 hour" or "Wait 3 days"
          const duration = actionNode.waitDuration || 1;
          const unit = actionNode.waitUnit || 'hours';
          const unitLabel = duration === 1 
            ? unit.slice(0, -1) // Remove 's' for singular
            : unit;
          subtitle = `Wait ${duration} ${unitLabel}`;
        } else {
          // For grid picker actions, show count
          const count = actionNode.option.id === 'assign-questionnaire'
            ? (actionNode.selectedQuestionnaires?.size || 0)
            : actionNode.option.id === 'assign-check-in'
            ? (actionNode.selectedCheckIns?.size || 0)
            : actionNode.option.id === 'add-file'
            ? (actionNode.selectedFiles?.size || 0)
            : actionNode.option.id === 'add-habit'
            ? (actionNode.selectedHabits?.size || 0)
            : 0;
          
          if (count === 0) {
            subtitle = actionNode.option.name;
          } else {
            // Format: "Add 1 file" or "Add 3 files", "Assign 1 questionnaire" or "Assign 3 questionnaires"
            const baseName = actionNode.option.name.replace(/^Add /i, '').replace(/^Assign /i, '');
            let singularName = baseName.toLowerCase();
            let pluralName = singularName;
            
            // Handle specific pluralizations
            if (singularName === 'questionnaire') {
              pluralName = 'questionnaires';
            } else if (singularName === 'check-in' || singularName === 'check in') {
              pluralName = 'check-ins';
            } else if (singularName === 'file') {
              pluralName = 'files';
            } else if (singularName === 'habit') {
              pluralName = 'habits';
            } else if (!singularName.endsWith('s')) {
              pluralName = `${singularName}s`;
            }
            
            const itemName = count === 1 ? singularName : pluralName;
            
            if (actionNode.option.id.startsWith('assign-')) {
              subtitle = `Assign ${count} ${itemName}`;
            } else {
              subtitle = `Add ${count} ${itemName}`;
            }
          }
        }
        
        const actionNodeData = {
          id: actionNode.id,
          type: 'action' as const,
          position: { x: 200, y: actionNodePositions[index].y },
          data: {
            label: actionNode.option.id === 'wait' ? 'Wait' : `Action ${actionNumber}`,
            subtitle,
            icon: actionNode.option.icon,
            isWait: actionNode.option.id === 'wait',
            isRepeat: actionNode.option.id === 'repeat',
          onClick: () => {
            // Open edit mode
            const handleEdit = async () => {
              setEditingActionNodeId(actionNode.id);
              setSelectedActionOption(actionNode.option);
              setPanelType('action');
              onActionClick?.();
              
              // Load the action's data
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
                // Fetch data for confirmation view
                setIsLoadingData(true);
                try {
                  if (actionNode.option.id === 'assign-questionnaire' || actionNode.option.id === 'assign-check-in') {
                    const allForms = await getForms();
                    const checkInForms = allForms.filter((form) => form.name.includes('Check-in') || form.name.includes('Weekly'));
                    const questionnaireForms = allForms.filter((form) => !form.name.includes('Check-in') && !form.name.includes('Weekly'));
                    setCheckIns(checkInForms.map((form) => ({ id: form.id, name: form.name })));
                    setQuestionnaires(questionnaireForms.map((form) => ({ id: form.id, name: form.name })));
                  } else if (actionNode.option.id === 'add-file') {
                    setFiles(mockFiles);
                  } else if (actionNode.option.id === 'add-habit') {
                    setHabits(mockHabits.map((habit) => ({ id: habit.id, name: habit.name })));
                  }
                } catch (error) {
                  console.error('Failed to fetch data:', error);
                } finally {
                  setIsLoadingData(false);
                }
              }
            };
            handleEdit();
          },
          onEdit: () => {
            // Same as onClick for editing
            const handleEdit = async () => {
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
              } else if (actionNode.option.id === 'repeat') {
                setRepeatLinkedActionId(actionNode.repeatLinkedActionId || null);
                setActionStep('config');
              } else {
                setSelectedQuestionnaires(actionNode.selectedQuestionnaires || new Set());
                setSelectedCheckIns(actionNode.selectedCheckIns || new Set());
                setSelectedFiles(actionNode.selectedFiles || new Set());
                setSelectedHabits(actionNode.selectedHabits || new Set());
                setActionStep('confirmation');
                setIsLoadingData(true);
                try {
                  if (actionNode.option.id === 'assign-questionnaire' || actionNode.option.id === 'assign-check-in') {
                    const allForms = await getForms();
                    const checkInForms = allForms.filter((form) => form.name.includes('Check-in') || form.name.includes('Weekly'));
                    const questionnaireForms = allForms.filter((form) => !form.name.includes('Check-in') && !form.name.includes('Weekly'));
                    setCheckIns(checkInForms.map((form) => ({ id: form.id, name: form.name })));
                    setQuestionnaires(questionnaireForms.map((form) => ({ id: form.id, name: form.name })));
                  } else if (actionNode.option.id === 'add-file') {
                    setFiles(mockFiles);
                  } else if (actionNode.option.id === 'add-habit') {
                    setHabits(mockHabits.map((habit) => ({ id: habit.id, name: habit.name })));
                  }
                } catch (error) {
                  console.error('Failed to fetch data:', error);
                } finally {
                  setIsLoadingData(false);
                }
              }
            };
            handleEdit();
          },
          onDelete: () => handleDeleteAction(actionNode.id),
        },
      };
      // Add an add-action node after each action node
      return [
        actionNodeData,
        {
          id: `add-action-${index}`,
          type: 'addAction',
          position: { x: 200, y: addActionNodePositions[index].y },
          data: { onClick: () => handleOpenActionPanel(index + 1) },
        },
      ];
      }),
      ...checkNodePositions.map(({ y, checkNode }) => {
        // Find the corresponding repeat action
        const repeatAction = actionNodes.find(a => a.id === checkNode.repeatActionId);

        return {
          id: checkNode.id,
          type: 'check' as const,
          position: { x: 200, y },
          data: {
            label: 'Until check in completed',
            onEdit: repeatAction ? () => {
              // Open edit mode for the repeat action
              setEditingActionNodeId(repeatAction.id);
              setSelectedActionOption(repeatAction.option);
              setRepeatLinkedActionId(repeatAction.repeatLinkedActionId || null);
              setInitialRepeatLinkedActionId(repeatAction.repeatLinkedActionId || null);
              setActionStep('config');
              setPanelType('action');
              onActionClick?.();
            } : undefined,
            onDelete: () => handleDeleteAction(checkNode.repeatActionId),
          },
        };
      }),
      ...checkNodeAddActionPositions.map(({ y, checkNodeId, repeatActionIndex }) => ({
        id: `add-action-after-check-${checkNodeId}`,
        type: 'addAction' as const,
        position: { x: 200, y },
        data: { onClick: () => handleOpenActionPanel(repeatActionIndex + 1) },
      })),
      ...(addActionBeforeEndY !== null ? [{
        id: 'add-action-before-end',
        type: 'addAction' as const,
        position: { x: 200, y: addActionBeforeEndY },
        data: { onClick: () => handleOpenActionPanel(actionNodes.length) },
      }] : []),
      {
        id: 'end',
        type: 'end',
        position: { x: 200, y: endNodeY },
        data: { label: 'End' },
      },
    ];

    // Update edges
    const updatedEdges: Edge[] = [];
    
    // Always connect trigger to the first add-action node
    updatedEdges.push({
      id: 'trigger-to-add-trigger',
      source: 'trigger',
      target: 'add-action-trigger',
      type: 'smoothstep',
    });

    if (actionNodes.length > 0) {
      // Connect first add-action to first action or check node
      const firstAction = actionNodes[0];
      const firstCheckNode = checkNodes.find((c) => c.repeatActionId === firstAction.id);
      
      if (firstCheckNode && firstAction.option.id === 'repeat') {
        // First action is repeat -> connect to check node
        updatedEdges.push({
          id: 'add-trigger-to-check',
          source: 'add-action-trigger',
          target: firstCheckNode.id,
          type: 'smoothstep',
        });
      } else if (firstAction.option.id !== 'repeat') {
        // First action is not repeat
        updatedEdges.push({
          id: 'add-trigger-to-first-action',
          source: 'add-action-trigger',
          target: firstAction.id,
          type: 'smoothstep',
        });
      }

      // Connect each action to its add-action node, then to the next action
      for (let i = 0; i < actionNodes.length; i++) {
        const actionNode = actionNodes[i];
        const isRepeatAction = actionNode.option.id === 'repeat';
        const checkNode = checkNodes.find((c) => c.repeatActionId === actionNode.id);
        
        // Skip repeat actions - they don't create action nodes
        if (isRepeatAction) {
          // For repeat actions, the previous add-action connects directly to check node
          // This is handled when we process the previous action
          continue;
        }
        
        const addActionId = `add-action-${i}`;
        
        // Action -> Add Action
        updatedEdges.push({
          id: `action-${i}-to-add-${i}`,
          source: actionNode.id,
          target: addActionId,
          type: 'smoothstep',
        });

        // Find next action (could be repeat or regular)
        let nextActionIndex = -1;
        let nextCheckNode: typeof checkNodes[0] | undefined;
        
        for (let j = i + 1; j < actionNodes.length; j++) {
          const nextAction = actionNodes[j];
          if (nextAction.option.id === 'repeat') {
            // Next is a repeat action, find its check node
            nextCheckNode = checkNodes.find((c) => c.repeatActionId === nextAction.id);
            if (nextCheckNode) {
              break;
            }
          } else {
            // Next is a regular action
            nextActionIndex = j;
            break;
          }
        }

        // Add Action -> Next Action or Check Node or End
        if (nextCheckNode) {
          // Next is a check node (repeat action)
          updatedEdges.push({
            id: `add-${i}-to-check-${nextCheckNode.id}`,
            source: addActionId,
            target: nextCheckNode.id,
            type: 'smoothstep',
          });
        } else if (nextActionIndex >= 0) {
          // Next is a regular action
          updatedEdges.push({
            id: `add-${i}-to-action-${nextActionIndex}`,
            source: addActionId,
            target: actionNodes[nextActionIndex].id,
            type: 'smoothstep',
          });
        } else {
          // Last add-action -> End
          updatedEdges.push({
            id: `add-${i}-to-end`,
            source: addActionId,
            target: 'end',
            type: 'smoothstep',
          });
        }
      }
      
      // Connect check nodes
      checkNodes.forEach((checkNode) => {
        // Right handle (yes) -> Linked action (No path - client hasn't completed check-in)
        const linkedActionExists = updatedNodes.some(n => n.id === checkNode.linkedActionId);
        if (linkedActionExists) {
          updatedEdges.push({
            id: `check-${checkNode.id}-no-to-action`,
            source: checkNode.id,
            sourceHandle: 'yes',
            target: checkNode.linkedActionId,
            type: 'smoothstep',
            label: 'No',
          });
        }

        // Bottom handle (no) -> Add action after check (Yes path - client has completed)
        const addActionAfterCheckId = `add-action-after-check-${checkNode.id}`;
        const addActionAfterCheckExists = updatedNodes.some(n => n.id === addActionAfterCheckId);

        if (addActionAfterCheckExists) {
          // Connect check -> add-action-after-check
          updatedEdges.push({
            id: `check-${checkNode.id}-yes-to-add-action-after-check`,
            source: checkNode.id,
            sourceHandle: 'no',
            target: addActionAfterCheckId,
            type: 'smoothstep',
            label: 'Yes',
          });

          // Find the next action or end after this check node
          const repeatActionIndex = actionNodes.findIndex((a) => a.id === checkNode.repeatActionId);
          const nextActionIndex = repeatActionIndex + 1;

          if (nextActionIndex < actionNodes.length) {
            // There's a next action
            const nextAction = actionNodes[nextActionIndex];
            if (nextAction.option.id === 'repeat') {
              // Next is also a repeat, find its check node
              const nextCheckNode = checkNodes.find(c => c.repeatActionId === nextAction.id);
              if (nextCheckNode) {
                updatedEdges.push({
                  id: `${addActionAfterCheckId}-to-next-check`,
                  source: addActionAfterCheckId,
                  target: nextCheckNode.id,
                  type: 'smoothstep',
                });
              }
            } else {
              // Next is a regular action
              updatedEdges.push({
                id: `${addActionAfterCheckId}-to-next-action`,
                source: addActionAfterCheckId,
                target: nextAction.id,
                type: 'smoothstep',
              });
            }
          } else {
            // No next action, connect to add-action-before-end or end
            const addActionBeforeEndExists = updatedNodes.some(n => n.id === 'add-action-before-end');
            if (addActionBeforeEndExists) {
              updatedEdges.push({
                id: `${addActionAfterCheckId}-to-add-action-before-end`,
                source: addActionAfterCheckId,
                target: 'add-action-before-end',
                type: 'smoothstep',
              });
            } else {
              updatedEdges.push({
                id: `${addActionAfterCheckId}-to-end`,
                source: addActionAfterCheckId,
                target: 'end',
                type: 'smoothstep',
              });
            }
          }
        }
      });

      // Connect add-action-before-end to end if it exists
      if (addActionBeforeEndY !== null) {
        updatedEdges.push({
          id: 'add-action-before-end-to-end',
          source: 'add-action-before-end',
          target: 'end',
          type: 'smoothstep',
        });
      }
    } else {
      // No actions: trigger -> add-action -> end
      updatedEdges.push({
        id: 'add-trigger-to-end',
        source: 'add-action-trigger',
        target: 'end',
        type: 'smoothstep',
      });
    }

    setNodes(updatedNodes);

    setEdges(updatedEdges);

    // Update viewport to show top after nodes are updated
    if (reactFlowInstanceRef.current) {
      setTimeout(() => {
        const instance = reactFlowInstanceRef.current;
        if (instance && updatedNodes.length > 0) {
          // Find the topmost node (trigger is always at y: 20)
          const topNode = updatedNodes.find((n) => n.id === 'trigger') || updatedNodes[0];
          const flowBounds = document.querySelector('.react-flow__renderer');

          if (flowBounds) {
            const containerWidth = flowBounds.clientWidth;
            const nodeWidth = 300; // Our node width

            // Center horizontally: (containerWidth / 2) - (nodeWidth / 2) - nodeX
            const centerX = (containerWidth / 2) - (nodeWidth / 2) - topNode.position.x;

            // Position at top with padding
            const topPadding = 40;
            const newY = -topNode.position.y + topPadding;

            const viewport = instance.getViewport();
            instance.setViewport({ x: centerX, y: newY, zoom: viewport.zoom });
          }
        }
      }, 50);
    }
  }, [selectedTrigger, actionNodes, checkNodes, handleOpenTriggerPanel, handleOpenActionPanel, handleDeleteTrigger, handleDeleteAction]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
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
    setEditingActionNodeId(null);
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setInitialRepeatLinkedActionId(null);
    setInsertionIndex(-1);
  };

  const handleTriggerOptionClick = (option: TriggerOption) => {
    setSelectedTrigger(option);
    handleCloseSidePanel();
  };

  const handleActionOptionClick = (option: ActionOption) => {
    if (option.id === 'send-message' || option.id === 'wait' || option.id === 'repeat') {
      // For message, wait, and repeat, go directly to config step
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
    setEditingActionNodeId(null);
    setWaitDuration(1);
    setWaitUnit('hours');
    setRepeatLinkedActionId(null);
    setInitialRepeatLinkedActionId(null);
    setInsertionIndex(-1);
  };

  const handleActionContinue = () => {
    if (selectedActionOption?.id === 'send-message' || selectedActionOption?.id === 'wait' || selectedActionOption?.id === 'repeat') {
      // For message, wait, and repeat, save directly
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
                repeatLinkedActionId: selectedActionOption.id === 'repeat' ? repeatLinkedActionId : undefined,
                selectedQuestionnaires: selectedActionOption.id === 'assign-questionnaire' ? selectedQuestionnaires : undefined,
                selectedCheckIns: selectedActionOption.id === 'assign-check-in' ? selectedCheckIns : undefined,
                selectedFiles: selectedActionOption.id === 'add-file' ? selectedFiles : undefined,
                selectedHabits: selectedActionOption.id === 'add-habit' ? selectedHabits : undefined,
              }
            : node
        )
      );
      
      // Update check node if it exists for this repeat action
      if (selectedActionOption.id === 'repeat' && repeatLinkedActionId) {
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
        repeatLinkedActionId: selectedActionOption.id === 'repeat' ? repeatLinkedActionId : undefined,
        selectedQuestionnaires: selectedActionOption.id === 'assign-questionnaire' ? selectedQuestionnaires : undefined,
        selectedCheckIns: selectedActionOption.id === 'assign-check-in' ? selectedCheckIns : undefined,
        selectedFiles: selectedActionOption.id === 'add-file' ? selectedFiles : undefined,
        selectedHabits: selectedActionOption.id === 'add-habit' ? selectedHabits : undefined,
      };
      // Insert at the correct position based on insertionIndex
      setActionNodes((prev) => {
        if (insertionIndex >= 0 && insertionIndex < prev.length) {
          return [...prev.slice(0, insertionIndex), newActionNode, ...prev.slice(insertionIndex)];
        }
        // Default to appending at the end
        return [...prev, newActionNode];
      });
      
      // If repeat action, create a check node
      if (selectedActionOption.id === 'repeat' && repeatLinkedActionId) {
        const checkNodeId = `check-${Date.now()}-${Math.random()}`;
        setCheckNodes((prev) => [
          ...prev,
          {
            id: checkNodeId,
            linkedActionId: repeatLinkedActionId,
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
        onToggleQuestionnaire={handleToggleQuestionnaire}
        onToggleCheckIn={handleToggleCheckIn}
        onToggleFile={handleToggleFile}
        onToggleHabit={handleToggleHabit}
        questionnaires={questionnaires}
        checkIns={checkIns}
        files={files}
        habits={habits}
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
      />
    </div>
  );
}
