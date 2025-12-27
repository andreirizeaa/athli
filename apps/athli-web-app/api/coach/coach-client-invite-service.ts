import { apiFetch } from '../api-client';

export const resendClientInvite = async (clientId: string): Promise<{ email: string }> => {
    const response = await apiFetch<{ data: { email: string } }>('/clients/resend-invite', {
        method: 'POST',
        body: JSON.stringify({ clientId }),
    });
    return response.data;
};
