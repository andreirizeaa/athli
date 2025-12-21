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
 * Create a new flow
 * @param data - Flow data from the form
 */
export const createFlow = async (
  data: CreateFlowData
): Promise<Flow> => {
  // TODO: Connect to backend API
  console.log('Creating flow:', data);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Return a mock created flow
  const newFlow: Flow = {
    id: Date.now().toString(),
    name: data.name,
    description: data.description,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/automations/flows', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to create flow')
  // return await response.json()

  return newFlow;
};

/**
 * Update an existing flow
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

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/automations/flows/${data.id}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ nodes: data.nodes, edges: data.edges }),
  // })
  // if (!response.ok) throw new Error('Failed to update flow')
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

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/automations/flows/${data.id}/details`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ name: data.name, description: data.description }),
  // })
  // if (!response.ok) throw new Error('Failed to update flow details')
};

/**
 * Duplicate a flow
 * @param flowId - ID of the flow to duplicate
 * @param originalFlow - Original flow object to duplicate
 */
export const duplicateFlow = async (flowId: string, originalFlow: Flow & { stepCount?: number }): Promise<Flow & { stepCount?: number }> => {
  // TODO: Connect to backend API
  console.log('Duplicating flow:', { flowId, originalFlow });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // In the future, this will:
  // 1. Fetch the full flow data from the backend (including nodes and edges)
  // 2. Create a new flow with the same data but name appended with " (Copy)"
  // 3. Return the new flow

  // For now, create a duplicate with all properties copied and name appended with " (Copy)"
  const duplicatedFlow: Flow & { stepCount?: number } = {
    ...originalFlow,
    id: Date.now().toString(),
    name: `${originalFlow.name} (Copy)`,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/automations/flows/${flowId}/duplicate`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to duplicate flow')
  // return await response.json()

  return duplicatedFlow;
};
