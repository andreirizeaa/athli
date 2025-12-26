import { apiFetch, ApiResponse } from '../../api-client';

export interface CoachUniqueCode {
    code: string;
}

export const getCoachUniqueCode = async () => {
    return apiFetch<ApiResponse<{ code: string | null }>>('/settings/coach/unique-code');
};
