import { apiFetch, ApiResponse } from '../api-client';

export interface PublicCoachProfile {
    id: string;
    name: string;
    profilePictureUrl: string | null;
    companyName: string | null;
    companyLogoUrl: string | null;
}

export async function getCoachByCode(code: string): Promise<ApiResponse<{ coach: PublicCoachProfile; onboardingId: string | null; hasReachedLimit: boolean }>> {
    return apiFetch(`/coach/by-code/${code}`, { authenticated: false });
}

export async function getCoachCodeById(coachId: string) {
    const res = await apiFetch(`/coach/code-by-id/${coachId}`, { authenticated: false });
    return res.data?.code as string;
}
