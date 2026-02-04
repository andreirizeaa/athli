import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getMyQuestionnaires,
  type AthleteQuestionnaire,
} from '@/services/client/client-form-service';

export type { AthleteQuestionnaire };

export const useAthleteQuestionnaires = (options?: { enabled?: boolean }) => {
  const {
    data: questionnaires = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ['athlete-questionnaires'],
    queryFn: getMyQuestionnaires,
    enabled: options?.enabled !== false,
  });

  // Filter into outstanding (pending, not completed) and historic (completed)
  const outstandingQuestionnaires = useMemo(
    () => questionnaires.filter((q) => q.status === 'pending' && !q.completed_at),
    [questionnaires]
  );

  const historicQuestionnaires = useMemo(
    () => questionnaires.filter((q) => q.status === 'completed' || q.completed_at),
    [questionnaires]
  );

  return {
    questionnaires,
    outstandingQuestionnaires,
    historicQuestionnaires,
    isLoading,
    refetch,
    error,
  };
};
