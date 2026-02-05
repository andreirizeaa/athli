import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCoachClientHistory, type CoachClientHistoryItem } from '@/services/client/client-training-service';
import type { Athlete } from '@/services/coach/coach-client-service';

type WorkoutStatus = 'completed' | 'in_progress' | 'missed';

export interface EnrichedWorkoutItem extends CoachClientHistoryItem {
  clientName: string;
  clientAvatarUrl?: string;
  workoutName: string;
}

export const useCoachDailyWorkouts = (date: string, status: WorkoutStatus) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['coach-daily-workouts', date, status],
    queryFn: async (): Promise<EnrichedWorkoutItem[]> => {
      // 1. Fetch workout history
      const historyItems = await getCoachClientHistory(date, status);

      // 2. Get cached clients from React Query (same pattern as web app)
      const cachedClients = queryClient.getQueryData<Athlete[]>(['clients']) || [];

      // 3. Create lookup map for fast access
      const clientMap = new Map<string, Athlete>();
      cachedClients.forEach(client => clientMap.set(client.id, client));

      // 4. Enrich with client info
      return historyItems.map((item) => {
        const client = clientMap.get(item.client_id);
        return {
          ...item,
          clientName: client?.name || 'Unknown Client',
          clientAvatarUrl: client?.avatarUrl,
          workoutName: item.workout_data?.name || 'Workout',
        };
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return query;
};
