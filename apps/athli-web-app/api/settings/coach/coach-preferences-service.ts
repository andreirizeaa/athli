import { apiFetch } from '@/api/api-client';

export interface CoachPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone?: string;
    custom_data?: Record<string, any>;
}

export async function getCoachPreferences() {
    return apiFetch('/settings/coach/preferences');
}

export async function updateCoachPreferences(updates: Partial<CoachPreferences>) {
    return apiFetch('/settings/coach/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}
