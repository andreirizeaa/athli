'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { authService } from '@/api/auth/auth-service';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { getCoachCodeById } from '@/api/coach/coach-public-service';

export default function NewClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const coachId = searchParams.get('coach_id');

  useEffect(() => {
    const handleNewClient = async () => {
      if (!coachId) {
        toast.error('Missing coach ID');
        router.push('/');
        return;
      }

      const redirectToInvite = async () => {
        try {
          const code = await getCoachCodeById(coachId);
          router.push(`/client/invite/${code}`);
        } catch (error) {
          console.error('Failed to get coach code, defaulting to coach ID', error);
          router.push(`/client/invite/${coachId}`);
        }
      };

      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          toast.error('Please sign in first');
          await redirectToInvite();
          return;
        }

        // Get access token
        const token = session.access_token;

        // Call the new-client API endpoint
        const response = await authService.newClient(coachId, token);

        if (response.success) {
          // Redirect to welcome screen
          router.push('/client/get-started');
        } else {
          throw new Error(response.message || 'Failed to process client signup');
        }
      } catch (error: any) {
        console.error('Error handling new client:', error);
        toast.error(error.message || 'Failed to process your signup. Please try again.');
        await redirectToInvite();
      } finally {
        setIsLoading(false);
      }
    };

    handleNewClient();
  }, [coachId, router, supabase.auth]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen fixed inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <Spinner className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return null;
}

