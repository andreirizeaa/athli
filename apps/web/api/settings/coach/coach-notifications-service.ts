import { apiFetch } from '@/api/api-client';

export interface NotificationEvent {
    event_id: string;
    event_key: string;
    name: string;
    description: string;
    category: string;
    enabled: boolean;
}

export async function getCoachNotifications(): Promise<{ data: { notifications: NotificationEvent[] } }> {
    return apiFetch('/settings/coach/notifications');
}

export async function updateCoachNotifications(eventId: string, enabled: boolean) {
    return apiFetch('/settings/coach/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ eventId, enabled }),
    });
}
