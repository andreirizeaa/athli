import type { Node, Edge } from 'reactflow';

type CreateFlowData = {
  name: string;
  description?: string;
};

type Flow = {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
};

type UpdateFlowData = {
  id: string;
  nodes: Node[];
  edges: Edge[];
};

type UpdateFlowDetailsData = {
  id: string;
  name: string;
  description?: string;
};

/**
 * Create a new flow in coach's library
 * @param data - Flow data from the form
 */
export const createFlow = async (
  data: CreateFlowData
): Promise<Flow> => {
  // TODO: Connect to backend API
  console.log('Creating flow:', data);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const newFlow: Flow = {
    id: Date.now().toString(),
    name: data.name,
    description: data.description,
    createdAt: Date.now(),
  };

  return newFlow;
};

/**
 * Update an existing flow in coach's library
 * @param data - Flow update data including nodes and edges
 */
export const updateFlow = async (
  data: UpdateFlowData
): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Updating flow:', {
    id: data.id,
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    nodes: data.nodes,
    edges: data.edges,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));
};

/**
 * Update flow details (name and description)
 * @param data - Flow details update data
 */
export const updateFlowDetails = async (
  data: UpdateFlowDetailsData
): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Updating flow details:', {
    id: data.id,
    name: data.name,
    description: data.description,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));
};

/**
 * Duplicate a flow in coach's library
 * @param flowId - ID of the flow to duplicate
 * @param originalFlow - Original flow object to duplicate
 */
export const duplicateFlow = async (flowId: string, originalFlow: Flow & { stepCount?: number }): Promise<Flow & { stepCount?: number }> => {
  // TODO: Connect to backend API
  console.log('Duplicating flow:', { flowId, originalFlow });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const duplicatedFlow: Flow & { stepCount?: number } = {
    ...originalFlow,
    id: Date.now().toString(),
    name: `${originalFlow.name} (Copy)`,
    createdAt: Date.now(),
  };

  return duplicatedFlow;
};
