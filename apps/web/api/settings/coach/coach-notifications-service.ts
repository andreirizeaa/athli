import { apiFetch } from '@/api/api-client';

export interface NotificationPreference {
    id: string;
    coach_id: string;
    notification_type: string;
    in_app_enabled: boolean;
    push_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export async function getCoachNotificationPreferences(): Promise<{ data: { preferences: NotificationPreference[] } }> {
    return apiFetch('/settings/coach/notifications');
}

export async function updateCoachNotificationPreference(
    notificationType: string,
    updates: { inAppEnabled?: boolean; pushEnabled?: boolean }
) {
    return apiFetch('/settings/coach/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
            notificationType,
            inAppEnabled: updates.inAppEnabled,
            pushEnabled: updates.pushEnabled,
        }),
    });
}

export async function batchUpdateCoachNotificationPreferences(
    preferences: Array<{ notificationType: string; inAppEnabled?: boolean; pushEnabled?: boolean }>
) {
    return apiFetch('/settings/coach/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ preferences }),
    });
}
