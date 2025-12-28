import { apiFetch } from '../api-client';

export interface CheckExistingMetricLogData {
  assignmentId: string;
  date: Date;
  clientId: string;
  coachId: string;
}

export interface ExistingMetricLogResponse {
  exists: boolean;
  log?: {
    id: string;
    value: number;
    date: string;
  };
}

/**
 * Check if a log already exists for a specific metric assignment and date
 */
export const checkExistingMetricLog = async (data: CheckExistingMetricLogData): Promise<ExistingMetricLogResponse> => {
  const dateString = data.date.toISOString().split('T')[0];
  const response = await apiFetch<{ data: ExistingMetricLogResponse }>(`/client/metrics/logs/check`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      date: dateString
    }),
  });
  return response.data;
};
