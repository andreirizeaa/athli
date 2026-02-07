import { apiFetch } from '../api-client';

export async function getOrCreateInviteCode(onboardingId: string): Promise<string> {
  const res = await apiFetch<{ data: { code: string } }>('/coach/invite-codes', {
    method: 'POST',
    body: JSON.stringify({ onboardingId }),
  });
  return res.data.code;
}
