import type { Node, Edge } from 'reactflow';
import { apiFetch } from '@/api/api-client';

type CreateSequenceData = {
  name: string;
  description?: string;
};

export type Sequence = {
  id: string;
  name?: string;
  description?: string;
  flow_data?: {
    nodes: Node[];
    edges: Edge[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type UpdateSequenceData = {
  id: string;
  nodes: Node[];
  edges: Edge[];
};

type UpdateSequenceDetailsData = {
  id: string;
  name: string;
  description?: string;
};

/**
 * Get all sequences for the coach
 */
export const getSequences = async (): Promise<Sequence[]> => {
  const response = await apiFetch<{ data: { sequences: Sequence[] } }>('/coach/sequences');
  return response.data.sequences;
};

/**
 * Get a single sequence by ID
 */
export const getSequenceById = async (id: string): Promise<Sequence> => {
  const response = await apiFetch<{ data: { sequence: Sequence } }>(`/coach/sequences/${id}`);
  return response.data.sequence;
};

/**
 * Create a new sequence
 */
export const createSequence = async (
  data: CreateSequenceData
): Promise<Sequence> => {
  const response = await apiFetch<{ data: { sequence: Sequence } }>('/coach/sequences', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      flow_data: { nodes: [], edges: [] },
    }),
  });

  return response.data.sequence;
};

/**
 * Update an existing sequence (flow data)
 */
export const updateSequence = async (
  data: UpdateSequenceData
): Promise<void> => {
  await apiFetch(`/coach/sequences/${data.id}`, {
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
 * Update sequence details (name and description)
 */
export const updateSequenceDetails = async (
  data: UpdateSequenceDetailsData
): Promise<void> => {
  await apiFetch(`/coach/sequences/${data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });
};

/**
 * Delete a sequence
 */
export const deleteSequence = async (sequenceId: string): Promise<void> => {
  await apiFetch(`/coach/sequences/${sequenceId}`, {
    method: 'DELETE',
  });
};
