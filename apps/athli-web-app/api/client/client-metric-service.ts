import { apiFetch } from '../api-client';

// Import shared types and re-export for backwards compatibility
export type {
  MetricScheduleData,
  AssignMetricData,
  AssignMetricsToClientsData,
  RemoveMetricData,
  LogMetricData,
  UpdateMetricData,
  UpdateMetricLogData,
} from '@athli/shared-types';

import type {
  MetricScheduleData,
  AssignMetricData,
  AssignMetricsToClientsData,
  RemoveMetricData,
  LogMetricData,
  UpdateMetricData,
  UpdateMetricLogData,
} from '@athli/shared-types';

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
        .map(day => dayMap[day] ?? 0)
        .sort((a, b) => a - b)
        .join(',');
      return `${defaultMinute} ${defaultHour} * * ${weekdays}`;
    }
    return `${defaultMinute} ${defaultHour} * * *`;
  } else if (scheduleData.frequency === 'weekly') {
    const weekday = scheduleData.selectedDays && scheduleData.selectedDays.length > 0
      ? dayMap[scheduleData.selectedDays[0]] ?? 0
      : 0;
    return `${defaultMinute} ${defaultHour} * * ${weekday}`;
  } else if (scheduleData.frequency === 'biweekly') {
    const weekday = scheduleData.selectedDays && scheduleData.selectedDays.length > 0
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
 * Service method to assign metrics to clients (or create new private ones)
 */
export const assignMetric = async (data: AssignMetricData): Promise<void> => {
  await apiFetch(`/client/metrics`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify(data),
  });
};

export const assignMetricsToClients = async (data: AssignMetricsToClientsData): Promise<void> => {
  await apiFetch(`/client/metrics`, {
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
 * Service method to create a private metric for a client
 */
export const addMetric = async (data: Omit<AssignMetricData, 'metricIds'> & { clientId: string; coachId: string }): Promise<void> => {
  return assignMetric(data);
};

/**
 * Service method to remove metrics from clients
 */
export const removeMetric = async (data: RemoveMetricData): Promise<void> => {
  await apiFetch(`/client/metrics`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ metricIds: data.metricIds }),
  });
};

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

export const updateClientMetric = async (data: UpdateMetricData): Promise<void> => {
  await apiFetch(`/client/metrics`, {
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

// Backwards compatible alias
export const updateMetric = updateClientMetric;

export const deleteMetricLog = async (logId: string, clientId: string, coachId: string): Promise<void> => {
  await apiFetch(`/client/metrics/logs`, {
    method: 'DELETE',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    body: JSON.stringify({ logId }),
  });
};

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
