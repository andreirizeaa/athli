import { useQuery } from '@tanstack/react-query';
import { getMyTasks, type ClientTask } from '@/services/client/client-task-service';
import { useAuth } from '@/stores';

export type { ClientTask };

export const useAthleteTasks = () => {
  const { clientProfile } = useAuth();

  const {
    data: tasks = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ['athlete-tasks', clientProfile?.client_id, clientProfile?.coach_id],
    queryFn: () => getMyTasks(clientProfile!.client_id, clientProfile!.coach_id),
    enabled: !!clientProfile,
  });

  return {
    tasks,
    isLoading,
    refetch,
    error,
  };
};
