import type { Node, Edge } from 'reactflow';
import { apiFetch } from '@/api/api-client';

type CreateFlowData = {
  name: string;
  description?: string;
};

export type Flow = {
  id: string;
  name?: string;
  description?: string;
  flow_data?: {
    nodes: Node[];
    edges: Edge[];
  };
  is_active?: boolean;
  created_at: string;
  updated_at: string;
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
 * Get all flows for the coach
 */
export const getFlows = async (): Promise<Flow[]> => {
  const response = await apiFetch<{ data: { flows: Flow[] } }>('/coach/flows');
  return response.data.flows;
};

/**
 * Get a single flow by ID
 */
export const getFlowById = async (id: string): Promise<Flow> => {
  const response = await apiFetch<{ data: { flow: Flow } }>(`/coach/flows/${id}`);
  return response.data.flow;
};

/**
 * Create a new flow in coach's library
 * @param data - Flow data from the form
 */
export const createFlow = async (
  data: CreateFlowData
): Promise<Flow> => {
  const response = await apiFetch<{ data: { flow: Flow } }>('/coach/flows', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      flow_data: { nodes: [], edges: [] },
      is_active: true,
    }),
  });

  return response.data.flow;
};

/**
 * Update an existing flow in coach's library
 * @param data - Flow update data including nodes and edges
 */
export const updateFlow = async (
  data: UpdateFlowData
): Promise<void> => {
  await apiFetch(`/coach/flows/${data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      flow_data: {
        nodes: data.nodes,
        edges: data.edges,
      },
    }),
  });
};

/**
 * Update flow details (name and description)
 * @param data - Flow details update data
 */
export const updateFlowDetails = async (
  data: UpdateFlowDetailsData
): Promise<void> => {
  await apiFetch(`/coach/flows/${data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });
};

/**
 * Update flow status (is_active)
 * @param flowId - ID of the flow
 * @param isActive - New active status
 */
export const updateFlowStatus = async (
  flowId: string,
  isActive: boolean
): Promise<void> => {
  await apiFetch(`/coach/flows/${flowId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      is_active: isActive,
    }),
  });
};

/**
 * Duplicate a flow in coach's library
 * @param flowId - ID of the flow to duplicate
 */
export const duplicateFlow = async (flowId: string): Promise<Flow> => {
  // First, get the original flow
  const originalFlow = await getFlowById(flowId);

  // Create a new flow with the same data but a new name
  const response = await apiFetch<{ data: { flow: Flow } }>('/coach/flows', {
    method: 'POST',
    body: JSON.stringify({
      name: `${originalFlow.name} (Copy)`,
      description: originalFlow.description,
      flow_data: originalFlow.flow_data || { nodes: [], edges: [] },
      is_active: originalFlow.is_active ?? true,
    }),
  });

  return response.data.flow;
};

/**
 * Delete a flow
 * @param flowId - ID of the flow to delete
 */
export const deleteFlow = async (flowId: string): Promise<void> => {
  await apiFetch(`/coach/flows/${flowId}`, {
    method: 'DELETE',
  });
};
