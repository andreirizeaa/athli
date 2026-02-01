import { apiFetch } from '@/lib/api-client';
import type { Metric, CreateMetricInput, MetricScheduleData } from '@athli/shared-types';

// Re-export types from shared-types for backwards compatibility
export type { Metric, CreateMetricInput, MetricScheduleData };

/**
 * Service method to get all coach's metrics (library)
 */
export const getAllMetrics = async (): Promise<Metric[]> => {
  console.log('[CoachMetricService] 📥 getAllMetrics called');
  const response = await apiFetch('/coach/metrics');
  console.log('[CoachMetricService] 📦 Raw response:', JSON.stringify(response, null, 2));
  return response.data.metrics;
};

/**
 * Service method to create a new coach metric
 */
export const createMetric = async (metric: CreateMetricInput): Promise<Metric> => {
  const { client_id, ...data } = metric;

  console.log('[CoachMetricService] 📤 createMetric input:', JSON.stringify(metric, null, 2));

  if (client_id) {
    const response = await apiFetch(`/clients/${client_id}/metrics`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('[CoachMetricService] ✅ Client metric response:', JSON.stringify(response, null, 2));
    return response.data.metric;
  }

  const response = await apiFetch('/coach/metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
  console.log('[CoachMetricService] ✅ Library metric response:', JSON.stringify(response, null, 2));
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
