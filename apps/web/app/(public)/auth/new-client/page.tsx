'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { authService } from '@/api/auth/auth-service';
import { Spinner } from '@/components/ui/spinner';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toast } from 'sonner';
import { getCoachCodeById } from '@/api/coach/coach-public-service';

export default function NewClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleNewClient = async () => {
      // Try to get data from sessionStorage first, then fall back to URL params
      const storedData = sessionStorage.getItem('auth_flow_data');
      let coachId: string | null = null;
      let invitationToken: string | null = null;
      let onboardingId: string | null = null;

      if (storedData) {
        const authFlowData = JSON.parse(storedData);
        coachId = authFlowData.coach_id;
        invitationToken = authFlowData.invitation_token;
        onboardingId = authFlowData.onboarding_id;
      } else {
        // Fallback to URL params (for cases where sessionStorage didn't persist across OAuth)
        coachId = searchParams.get('coach_id');
        invitationToken = searchParams.get('invitation_token');
        onboardingId = searchParams.get('onboarding_id');
        console.log('[New Client] Using URL params fallback', { coachId, invitationToken, onboardingId });
      }

      if (!coachId) {
        toast.error('Missing coach ID');
        router.push('/');
        return;
      }

      const redirectToInvite = async () => {
        try {
          const code = await getCoachCodeById(coachId);
          router.push(`/invite/${code}`);
        } catch (error) {
          console.error('Failed to get coach code, defaulting to coach ID', error);
          router.push(`/invite/${coachId}`);
        }
      };

      try {
        console.log('[New Client] Starting profile creation', { coachId });

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.error('[New Client] No session found', { error: sessionError });
          toast.error('Please sign in first');
          await redirectToInvite();
          return;
        }

        console.log('[New Client] Session found', { userId: session.user.id, hasToken: !!session.access_token });

        // Get access token
        const token = session.access_token;

        console.log('[New Client] Calling API', { coachId, invitationToken: invitationToken ? 'provided' : 'none' });

        // Call the new-client API endpoint
        const response = await authService.newClient(coachId, token, invitationToken ?? undefined, onboardingId ?? undefined);

        console.log('[New Client] API response', { success: response.success, message: response.message });

        if (response.success) {
          console.log('[New Client] ✅ Profile created, redirecting to /download/client');

          // Clear auth flow data from sessionStorage
          sessionStorage.removeItem('auth_flow_data');

          // Redirect to download page using SPA navigation
          router.push('/download/client');
        } else {
          throw new Error(response.message || 'Failed to process client signup');
        }
      } catch (error: any) {
        console.error('[New Client] FAILED to create profile', { error: error.message, stack: error.stack });
        toast.error(error.message || 'Failed to process your signup. Please try again.');
        await redirectToInvite();
      } finally {
        setIsLoading(false);
      }
    };

    handleNewClient();
  }, []);

  if (isLoading) {
    return (
      <AuthLayout showHomeButton={false} singleColumn>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner className="size-8" />
          <p className="text-muted-foreground text-sm">Setting up your account...</p>
        </div>
      </AuthLayout>
    );
  }

  return null;
}
