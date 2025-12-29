import { apiFetch } from '../api-client';

export interface AssignMetricData {
  metricIds?: string[];
  name?: string;
  unit?: string;
  description?: string;
  value_kind?: 'number' | 'percent' | 'duration' | 'score';
}

export interface RemoveMetricData {
  metricIds: string[];
  clientId: string;
}

/**
 * Service method to assign metrics to clients (or create new private ones)
 */
export const assignMetric = async (data: AssignMetricData & { clientId: string; coachId: string }): Promise<void> => {
  await apiFetch(`/client/metrics`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify(data),
  });
};

export interface AssignMetricsToClientsData {
  metricIds: string[];
  clientIds: string[];
  coachId: string;
}

export const assignMetricsToClients = async (data: AssignMetricsToClientsData): Promise<void> => {
  await apiFetch(`/client/metrics`, {
    method: 'POST',
    headers: { 'x-coach-id': data.coachId },
    body: JSON.stringify({ metricIds: data.metricIds, clientIds: data.clientIds }),
  });
};

/**
 * Service method to create a private metric for a client
 */
export const addMetric = async (data: Omit<AssignMetricData, 'metricIds'> & { clientId: string; coachId: string }): Promise<void> => {
  return assignMetric(data);
};

/**
 * Service method to remove metrics from clients
 */
export const removeMetric = async (data: RemoveMetricData & { coachId: string }): Promise<void> => {
  await apiFetch(`/client/metrics`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ metricIds: data.metricIds }),
  });
};

export interface LogMetricData {
  assignmentId: string;
  value: number;
  date: Date;
  // Context needed for headers
  clientId: string;
  coachId: string;
}

/**
 * Service method to log a metric value for a client
 */
export const logMetric = async (data: LogMetricData): Promise<void> => {
  await apiFetch(`/client/metrics`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      value: data.value,
      date: data.date.toISOString().split('T')[0],
    }),
  });
};

/**
 * Service method to get metrics for a client
 */
export const getClientMetrics = async (clientId: string, coachId: string): Promise<any[]> => {
  const response = await apiFetch<{ data: { metrics: any[] } }>(`/client/metrics`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });
  return response.data.metrics;
};

export interface UpdateMetricData {
  assignmentId: string;
  name?: string;
  unit?: string;
  description?: string;
  clientId: string;
  coachId: string;
}

export const updateMetric = async (data: UpdateMetricData): Promise<void> => {
  await apiFetch(`/client/metrics`, {
    method: 'PUT',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      name: data.name,
      unit: data.unit,
      description: data.description,
    }),
  });
};

export const deleteMetricLog = async (logId: string, clientId: string, coachId: string): Promise<void> => {
  await apiFetch(`/client/metrics/logs`, {
    method: 'DELETE',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    body: JSON.stringify({ logId }),
  });
};

export interface UpdateMetricLogData {
  logId: string;
  value: number;
  date?: Date;
  clientId: string;
  coachId: string;
}

export const updateMetricLog = async (data: UpdateMetricLogData): Promise<void> => {
  await apiFetch(`/client/metrics/logs`, {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      logId: data.logId,
      value: data.value,
      date: data.date ? data.date.toISOString().split('T')[0] : undefined
    }),
  });
};
