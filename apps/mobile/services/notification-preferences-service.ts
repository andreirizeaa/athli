import { apiFetch } from '@/lib/api-client';

export interface NotificationPreference {
  id: string;
  coach_id: string;
  notification_type: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const response = await apiFetch<{ data: { preferences: NotificationPreference[] } }>(
    '/settings/coach/notifications'
  );
  return response.data.preferences;
}

export async function updateNotificationPreference(
  notificationType: string,
  updates: { inAppEnabled?: boolean; pushEnabled?: boolean }
): Promise<void> {
  await apiFetch('/settings/coach/notifications', {
    method: 'PATCH',
    body: JSON.stringify({
      notificationType,
      inAppEnabled: updates.inAppEnabled,
      pushEnabled: updates.pushEnabled,
    }),
  });
}

export async function bulkUpdateNotificationPreferences(
  updates: { inAppEnabled?: boolean; pushEnabled?: boolean }
): Promise<void> {
  await apiFetch('/settings/coach/notifications/bulk', {
    method: 'PATCH',
    body: JSON.stringify({
      inAppEnabled: updates.inAppEnabled,
      pushEnabled: updates.pushEnabled,
    }),
  });
}
