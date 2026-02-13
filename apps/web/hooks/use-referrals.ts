import { useQuery } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { getReferrals, type ReferralsResponse } from '@/api/billing/billing-service';

export function useReferrals(options?: { enabled?: boolean }) {
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();
  const isEnabled = options?.enabled !== false && !!user && !isAuthLoading;

  const query = useQuery({
    queryKey: ['referrals'],
    queryFn: getReferrals,
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always fetch fresh data when component mounts
  });

  return {
    referrals: query.data?.referrals || [],
    referredBy: query.data?.referred_by || null,
    credits: query.data?.credits || { total_earned_cents: 0, active_cents: 0, used_cents: 0 },
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
