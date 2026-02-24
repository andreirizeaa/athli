import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCoachClientHistory, type CoachClientHistoryItem } from '@/api/client/client-training-service';
import type { Athlete } from '@/api/coach/coach-client-service';

export interface EnrichedWorkout extends CoachClientHistoryItem {
    clientName: string;
    clientAvatar?: string;
}

/**
 * Hook to fetch coach's home page data (completed, in_progress, missed workouts)
 * Uses React Query for caching and automatic refetching
 * Note: Workout details are fetched on-demand when user clicks a card
 */
export function useCoachHomeData(date: Date, type: 'completed' | 'missed' | 'in_progress') {
    const queryClient = useQueryClient();
    const dateStr = date.toISOString().split('T')[0];

    const { data = [], isLoading, error } = useQuery({
        queryKey: ['coach-home-data', dateStr, type],
        queryFn: async (): Promise<EnrichedWorkout[]> => {
            // 1. Fetch history items from backend API
            const historyItems = await getCoachClientHistory(dateStr, type);

            // 2. Get cached clients from React Query
            // Note: The query key includes { includeArchived: false } to match useCoachClients default
            const cachedClients = queryClient.getQueryData<Athlete[]>(['coach-clients', { includeArchived: false }]) || [];

            // Create lookup map for fast client access
            const clientMap = new Map<string, Athlete>();
            cachedClients.forEach(client => clientMap.set(client.id, client));

            // 3. Enrich with client info only (workout details fetched on click)
            const enrichedItems = historyItems.map((item) => {
                const cachedClient = clientMap.get(item.client_id);
                return {
                    ...item,
                    clientName: cachedClient?.name || 'Unknown Client',
                    clientAvatar: cachedClient?.avatarUrl || undefined,
                };
            });

            return enrichedItems;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
    });

    return { data, isLoading, error };
}
