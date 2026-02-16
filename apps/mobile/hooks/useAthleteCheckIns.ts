import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getMyCheckIns,
  type AthleteCheckIn,
} from '@/services/client/client-form-service';
import { useAuth } from '@/stores';

export type { AthleteCheckIn };

export const useAthleteCheckIns = (options?: { enabled?: boolean }) => {
  const { clientProfile } = useAuth();

  const {
    data: checkIns = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ['athlete-checkins', clientProfile?.client_id, clientProfile?.coach_id],
    queryFn: () => getMyCheckIns(clientProfile!.client_id, clientProfile!.coach_id),
    enabled: options?.enabled !== false && !!clientProfile,
  });

  const historicCheckIns = useMemo(
    () => checkIns.filter((c) => c.submission_count > 0),
    [checkIns]
  );

  return {
    checkIns,
    historicCheckIns,
    isLoading,
    refetch,
    error,
  };
};
