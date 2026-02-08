import { apiFetch } from '@/lib/api-client';

export interface CoachNotification {
  id: string;
  client_id: string;
  client_name: string;
  client_avatar_url: string | null;
  notification_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

interface GetNotificationsResponse {
  data: {
    notifications: CoachNotification[];
  };
}

export async function getCoachNotifications(unreadOnly?: boolean): Promise<CoachNotification[]> {
  const params: Record<string, string> = {};
  if (unreadOnly) params.unread = 'true';

  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';

  const response = await apiFetch<GetNotificationsResponse>(endpoint);
  return response.data.notifications;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markNotificationAsUnread(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/unread`, { method: 'PATCH' });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiFetch('/notifications/mark-all-read', { method: 'PATCH' });
}
