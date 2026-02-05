import { apiFetch } from '@/api/api-client';

// Import shared types and re-export for backwards compatibility
export type {
  Metric,
  CreateMetricInput,
  MetricScheduleData,
} from '@athli/shared-types';

import type {
  Metric,
  CreateMetricInput,
} from '@athli/shared-types';

/**
 * Service method to get all coach's metrics (library)
 */
export const getAllMetrics = async (): Promise<Metric[]> => {
  const response = await apiFetch('/coach/metrics');
  return response.data.metrics;
};

/**
 * Service method to create a new coach metric
 */
export const createMetric = async (metric: CreateMetricInput): Promise<Metric> => {
  const { client_id, ...data } = metric;

  if (client_id) {
    const response = await apiFetch(`/clients/${client_id}/metrics`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.metric;
  }

  const response = await apiFetch('/coach/metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
  return response.data.metric;
};

/**
 * Service method to update an existing coach metric
 */
export const updateMetric = async (id: string, updates: Partial<CreateMetricInput>): Promise<Metric> => {
  const response = await apiFetch(`/coach/metrics/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data.metric;
};

/**
 * Service method to delete a coach metric
 */
export const deleteMetric = async (id: string): Promise<void> => {
  await apiFetch(`/coach/metrics/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Duplicate a metric in coach's library
 * @param metricId - ID of the metric to duplicate
 */
export const duplicateMetric = async (metricId: string): Promise<Metric> => {
  const response = await apiFetch(`/coach/metrics/${metricId}/duplicate`, {
    method: 'POST',
  });
  return response.data.metric;
};
