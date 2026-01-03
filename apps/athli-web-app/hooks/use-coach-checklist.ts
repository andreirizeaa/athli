import { useQuery } from '@tanstack/react-query';
import { getCoachChecklist } from '@/api/coach/coach-checklist-service';

interface CoachChecklistOptions {
  enabled?: boolean;
}

export const useCoachChecklist = (options?: CoachChecklistOptions) => {
  return useQuery({
    queryKey: ['coach-checklist'],
    queryFn: () => getCoachChecklist(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled !== false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
