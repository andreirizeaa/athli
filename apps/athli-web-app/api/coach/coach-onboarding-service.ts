import type { Node, Edge } from 'reactflow';
import { apiFetch } from '@/api/api-client';

type CreateOnboardingData = {
    name: string;
    description?: string;
};

export type Onboarding = {
    id: string;
    flow_data?: {
        nodes: Node[];
        edges: Edge[];
    };
    is_active?: boolean;
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
 * Get or create the single onboarding flow for the coach
 */
export const getOnboarding = async (): Promise<Onboarding> => {
    const response = await apiFetch<{ data: { onboarding: Onboarding } }>('/coach/onboarding');
    return response.data.onboarding;
};

/**
 * Update the single onboarding flow (nodes and edges)
 * @param data - Onboarding update data including nodes and edges
 */
export const updateOnboarding = async (
    data: { nodes: Node[]; edges: Edge[] }
): Promise<void> => {
    await apiFetch('/coach/onboarding', {
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
 * @param data - Onboarding details update data
 */
export const updateOnboardingDetails = async (
    data: { name: string; description?: string }
): Promise<void> => {
    await apiFetch('/coach/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
            name: data.name,
            description: data.description,
        }),
    });
};

/**
 * Toggle publish state of the single onboarding flow
 */
export const togglePublish = async (): Promise<Onboarding> => {
    const response = await apiFetch<{ data: { onboarding: Onboarding } }>('/coach/onboarding/publish', {
        method: 'PATCH',
    });
    return response.data.onboarding;
};
