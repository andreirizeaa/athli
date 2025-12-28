import { apiFetch } from '../api-client';

export interface CheckExistingLogData {
  assignmentId: string;
  date: Date;
  clientId: string;
  coachId: string;
}

export interface ExistingLogResponse {
  exists: boolean;
  log?: {
    id: string;
    value: number;
    status: 'completed' | 'skipped' | 'partial';
    date: string;
  };
}

/**
 * Check if a log already exists for a specific habit assignment and date
 */
export const checkExistingHabitLog = async (data: CheckExistingLogData): Promise<ExistingLogResponse> => {
  const dateString = data.date.toISOString().split('T')[0];
  const response = await apiFetch<{ data: ExistingLogResponse }>(`/client/habits/logs/check`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({
      assignmentId: data.assignmentId,
      date: dateString
    }),
  });
  return response.data;
};
