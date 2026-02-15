import { apiFetch } from '@/lib/api-client';
import type {
  Metric,
  MetricFolder,
  CreateMetricFolderInput,
  UpdateMetricFolderInput,
} from '@athli/shared-types';

export type { MetricFolder, CreateMetricFolderInput, UpdateMetricFolderInput };

export const getAllMetricFolders = async (): Promise<MetricFolder[]> => {
  const response = await apiFetch('/coach/metrics/folders');
  return response.data.folders;
};

export const createMetricFolder = async (data: CreateMetricFolderInput): Promise<MetricFolder> => {
  const response = await apiFetch('/coach/metrics/folders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

export const updateMetricFolder = async (id: string, data: UpdateMetricFolderInput): Promise<MetricFolder> => {
  const response = await apiFetch(`/coach/metrics/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

export const deleteMetricFolder = async (id: string): Promise<void> => {
  await apiFetch(`/coach/metrics/folders/${id}`, {
    method: 'DELETE',
  });
};

export const moveMetric = async (metricId: string, folderId: string | null): Promise<Metric> => {
  const response = await apiFetch(`/coach/metrics/${metricId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ folder_id: folderId }),
  });
  return response.data.metric;
};

export const getMetricsInFolder = async (folderId: string): Promise<Metric[]> => {
  const response = await apiFetch(`/coach/metrics/folders/${folderId}/metrics`);
  return response.data.metrics;
};
