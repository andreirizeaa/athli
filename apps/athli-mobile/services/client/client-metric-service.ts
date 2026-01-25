import { apiFetch } from '@/lib/api-client';

/**
 * Client metric service for metric tracking
 * Mirrors apps/athli-web-app/api/client/client-metric-service.ts
 */

export interface MetricScheduleData {
  type: 'metric';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  selectedDays?: string[];
  monthlyOption?: 'first' | 'last' | 'specific';
  specificDay?: number;
}

export interface AssignMetricData {
  metricIds?: string[];
  name?: string;
  unit?: string;
  description?: string;
  value_kind?: 'number' | 'percent' | 'duration' | 'score';
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
  clientId: string;
  coachId: string;
}

export interface AssignMetricsToClientsData {
  metricIds: string[];
  clientIds: string[];
  coachId: string;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
}

export interface RemoveMetricData {
  metricIds: string[];
  clientId: string;
  coachId: string;
}

export interface LogMetricData {
  assignmentId: string;
  value: number;
  date: Date;
  clientId: string;
  coachId: string;
}

export interface UpdateMetricData {
  assignmentId: string;
  name?: string;
  unit?: string;
  description?: string;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
  clientId: string;
  coachId: string;
}

export interface UpdateMetricLogData {
  logId: string;
  value: number;
  date?: Date;
  clientId: string;
  coachId: string;
}

export interface ClientMetric {
  id: string;
  assignment_id: string;
  name: string;
  unit: string;
  description?: string;
  value_kind: 'number' | 'percent' | 'duration' | 'score';
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
  logs?: MetricLog[];
}

export interface MetricLog {
  id: string;
  value: number;
  date: string;
  created_at: string;
}

/**
 * Converts metric schedule data to cron expression
 */
export const convertMetricScheduleToCron = (scheduleData: MetricScheduleData): string => {
  const defaultHour = 9;
  const defaultMinute = 0;

  const dayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  if (scheduleData.frequency === 'daily') {
    if (scheduleData.selectedDays && scheduleData.selectedDays.length > 0) {
      const weekdays = scheduleData.selectedDays
        .map((day) => dayMap[day] ?? 0)
        .sort((a, b) => a - b)
        .join(',');
      return `${defaultMinute} ${defaultHour} * * ${weekdays}`;
    }
    return `${defaultMinute} ${defaultHour} * * *`;
  } else if (scheduleData.frequency === 'weekly') {
    const weekday =
      scheduleData.selectedDays && scheduleData.selectedDays.length > 0
        ? dayMap[scheduleData.selectedDays[0]] ?? 0
        : 0;
    return `${defaultMinute} ${defaultHour} * * ${weekday}`;
  } else if (scheduleData.frequency === 'biweekly') {
    const weekday =
      scheduleData.selectedDays && scheduleData.selectedDays.length > 0
        ? dayMap[scheduleData.selectedDays[0]] ?? 0
        : 0;
    return `${defaultMinute} ${defaultHour} * * ${weekday}`;
  } else if (scheduleData.frequency === 'monthly') {
    if (scheduleData.monthlyOption === 'first') {
      return `${defaultMinute} ${defaultHour} 1 * *`;
    } else if (scheduleData.monthlyOption === 'last') {
      return `${defaultMinute} ${defaultHour} 28-31 * *`;
    } else if (scheduleData.monthlyOption === 'specific' && scheduleData.specificDay) {
      return `${defaultMinute} ${defaultHour} ${scheduleData.specificDay} * *`;
    }
    return `${defaultMinute} ${defaultHour} 1 * *`;
  }

  return `${defaultMinute} ${defaultHour} * * *`;
};

/**
 * Assign metrics to a client (or create new private ones)
 */
export const assignMetric = async (data: AssignMetricData): Promise<void> => {
  await apiFetch('/client/metrics', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify(data),
  });
};

/**
 * Assign metrics to multiple clients
 */
export const assignMetricsToClients = async (data: AssignMetricsToClientsData): Promise<void> => {
  await apiFetch('/client/metrics', {
    method: 'POST',
    headers: { 'x-coach-id': data.coachId },
    body: JSON.stringify({
      metricIds: data.metricIds,
      clientIds: data.clientIds,
      schedule_config: data.schedule_config,
      cron_expression: data.cron_expression,
    }),
  });
};

/**
 * Create a private metric for a client
 */
export const addMetric = async (
  data: Omit<AssignMetricData, 'metricIds'>
): Promise<void> => {
  return assignMetric(data);
};

/**
 * Remove metrics from a client
 */
export const removeMetric = async (data: RemoveMetricData): Promise<void> => {
  await apiFetch('/client/metrics', {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ metricIds: data.metricIds }),
  });
};

/**
 * Log a metric value for a client
 */
export const logMetric = async (data: LogMetricData): Promise<void> => {
  await apiFetch('/client/metrics', {
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
 * Get metrics for a client (coach view)
 */
export const getClientMetrics = async (clientId: string, coachId: string): Promise<ClientMetric[]> => {
  const response = await apiFetch<{ success: boolean; data: { metrics: ClientMetric[] } }>(
    '/client/metrics',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );
  return response.data.metrics;
};

/**
 * Get metrics for the authenticated athlete (self-access)
 * No coach ID required - the API will use the authenticated user's ID
 */
export const getMyMetrics = async (): Promise<ClientMetric[]> => {
  const response = await apiFetch<{ success: boolean; data: { metrics: ClientMetric[] } }>(
    '/client/metrics'
  );
  return response.data.metrics;
};

/**
 * Update a metric assignment
 */
export const updateMetric = async (data: UpdateMetricData): Promise<void> => {
  await apiFetch('/client/metrics', {
    method: 'PUT',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      name: data.name,
      unit: data.unit,
      description: data.description,
      schedule_config: data.schedule_config,
      cron_expression: data.cron_expression,
    }),
  });
};

/**
 * Delete a metric log
 */
export const deleteMetricLog = async (
  logId: string,
  clientId: string,
  coachId: string
): Promise<void> => {
  await apiFetch('/client/metrics/logs', {
    method: 'DELETE',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    body: JSON.stringify({ logId }),
  });
};

/**
 * Update a metric log
 */
export const updateMetricLog = async (data: UpdateMetricLogData): Promise<void> => {
  await apiFetch('/client/metrics/logs', {
    method: 'PATCH',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      logId: data.logId,
      value: data.value,
      date: data.date ? data.date.toISOString().split('T')[0] : undefined,
    }),
  });
};
