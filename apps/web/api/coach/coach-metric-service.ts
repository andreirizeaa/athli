import { apiFetch } from '@/api/api-client';

// Import shared types and re-export for backwards compatibility
export type {
  Metric,
  CreateMetricInput,
  MetricScheduleData,
  MetricFolder,
  CreateMetricFolderInput,
  UpdateMetricFolderInput,
  MoveMetricInput,
} from '@athli/shared-types';

import type {
  Metric,
  CreateMetricInput,
  MetricFolder,
  CreateMetricFolderInput,
  UpdateMetricFolderInput,
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

// =============================================================================
// Folder Operations
// =============================================================================

/**
 * Get all metric folders for the current coach
 */
export const getAllMetricFolders = async (): Promise<MetricFolder[]> => {
  const response = await apiFetch('/coach/metrics/folders');
  return response.data.folders;
};

/**
 * Create a new metric folder
 */
export const createMetricFolder = async (data: CreateMetricFolderInput): Promise<MetricFolder> => {
  const response = await apiFetch('/coach/metrics/folders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

/**
 * Update a metric folder
 */
export const updateMetricFolder = async (id: string, data: UpdateMetricFolderInput): Promise<MetricFolder> => {
  const response = await apiFetch(`/coach/metrics/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

/**
 * Delete a metric folder (items inside become unfiled)
 */
export const deleteMetricFolder = async (id: string): Promise<void> => {
  await apiFetch(`/coach/metrics/folders/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Move a metric to a folder (or out of folder if folderId is null)
 */
export const moveMetric = async (metricId: string, folderId: string | null): Promise<Metric> => {
  const response = await apiFetch(`/coach/metrics/${metricId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ folder_id: folderId }),
  });
  return response.data.metric;
};

/**
 * Get metrics in a specific folder
 */
export const getMetricsInFolder = async (folderId: string): Promise<Metric[]> => {
  const response = await apiFetch(`/coach/metrics/folders/${folderId}/metrics`);
  return response.data.metrics;
};
