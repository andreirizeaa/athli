import { apiFetch } from '@/api/api-client';

export interface CoachCompanyInfo {
    company_name: string;
    website?: string;
    linkedin?: string;
    location?: string;
    specialities: string[];
    logo_url?: string;
}

export async function getCoachCompany() {
    return apiFetch('/settings/coach/company');
}

export async function updateCoachCompany(updates: Partial<CoachCompanyInfo>) {
    return apiFetch('/settings/coach/company', {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}
