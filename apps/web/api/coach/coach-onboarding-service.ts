import type { Node, Edge } from 'reactflow';
import { apiFetch } from '@/api/api-client';

type CreateOnboardingData = {
  name: string;
  description?: string;
};

export type Onboarding = {
  id: string;
  name?: string;
  description?: string;
  flow_data?: {
    nodes: Node[];
    edges: Edge[];
  };
  created_at: string;
  updated_at: string;
};

type UpdateOnboardingData = {
  id: string;
  nodes: Node[];
  edges: Edge[];
};

type UpdateOnboardingDetailsData = {
  id: string;
  name: string;
  description?: string;
};

/**
 * Get all onboardings for the coach
 */
export const getOnboardings = async (): Promise<Onboarding[]> => {
  const response = await apiFetch<{ data: { onboardings: Onboarding[] } }>('/coach/onboardings');
  return response.data.onboardings;
};

/**
 * Get a single onboarding by ID
 */
export const getOnboardingById = async (id: string): Promise<Onboarding> => {
  const response = await apiFetch<{ data: { onboarding: Onboarding } }>(`/coach/onboardings/${id}`);
  return response.data.onboarding;
};

/**
 * Create a new onboarding
 */
export const createOnboarding = async (
  data: CreateOnboardingData
): Promise<Onboarding> => {
  const response = await apiFetch<{ data: { onboarding: Onboarding } }>('/coach/onboardings', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      flow_data: { nodes: [], edges: [] },
    }),
  });

  return response.data.onboarding;
};

/**
 * Update an existing onboarding (flow data)
 */
export const updateOnboarding = async (
  data: UpdateOnboardingData
): Promise<void> => {
  await apiFetch(`/coach/onboardings/${data.id}`, {
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
 * Update onboarding details (name and description)
 */
export const updateOnboardingDetails = async (
  data: UpdateOnboardingDetailsData
): Promise<void> => {
  await apiFetch(`/coach/onboardings/${data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });
};

/**
 * Delete an onboarding
 */
export const deleteOnboarding = async (onboardingId: string): Promise<void> => {
  await apiFetch(`/coach/onboardings/${onboardingId}`, {
    method: 'DELETE',
  });
};
