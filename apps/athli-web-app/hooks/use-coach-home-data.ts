import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCoachClientHistory, getClientWorkoutInstance, type CoachClientHistoryItem } from '@/api/client/client-training-service';
import type { Athlete } from '@/api/coach/coach-client-service';

export interface EnrichedWorkout extends CoachClientHistoryItem {
    clientName: string;
    clientAvatar?: string;
    workoutName: string;
    workoutData: any;
    exercisesCompleted: number;
    exercisesTotal: number;
    // Metrics calculated from workout data
    minutes: number;
    volume: number;
    intensity: number;
    readiness: number;
    rating: number;
    percentage: number;
}

/**
 * Hook to fetch coach's home page data (completed, in_progress, missed workouts)
 * Uses React Query for caching and automatic refetching
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
            const cachedClients = queryClient.getQueryData<Athlete[]>(['coach-clients']) || [];

            // Create lookup map for fast client access
            const clientMap = new Map<string, Athlete>();
            cachedClients.forEach(client => clientMap.set(client.id, client));

            // 3. Enrich with client and workout details
            const enrichedItems = await Promise.all(
                historyItems.map(async (item) => {
                    try {
                        // Look up client from cached data
                        const cachedClient = clientMap.get(item.client_id);
                        const clientName = cachedClient?.name || 'Unknown Client';
                        const clientAvatar = cachedClient?.avatarUrl || undefined;

                        // Fetch full workout data
                        const workoutInstance = await getClientWorkoutInstance(item.client_id, dateStr, item.workout_id);

                        // Calculate stats
                        const workoutData = workoutInstance?.workout_data || {};
                        const items = workoutData?.items || [];

                        // Simple stats calculation
                        let totalExercises = 0;
                        let completedExercises = 0;
                        let totalVolume = 0;

                        const processItems = (itemsList: any[]) => {
                            for (const i of itemsList) {
                                if (i.itemType === 'exercise') {
                                    totalExercises++;
                                    const sets = i.data?.sets || i.exercise?.sets || [];
                                    if (sets.length > 0 && sets.every((s: any) => s.completed)) {
                                        completedExercises++;
                                    }
                                    sets.forEach((s: any) => {
                                        if (s.completed && s.weight && s.reps) {
                                            const w = Array.isArray(s.weight) ? Math.max(...s.weight) : Number(s.weight);
                                            const r = Array.isArray(s.reps) ? Math.max(...s.reps) : Number(s.reps);
                                            if (!isNaN(w) && !isNaN(r)) totalVolume += w * r;
                                        }
                                    });
                                } else if (i.itemType === 'section') {
                                    if (i.data?.exercises) {
                                        i.data.exercises.forEach((group: any) => {
                                            if (group.exercises) {
                                                processItems(group.exercises.map((e: any) => ({ itemType: 'exercise', data: e })));
                                            } else {
                                                processItems([{ itemType: 'exercise', data: group }]);
                                            }
                                        });
                                    }
                                }
                            }
                        };
                        processItems(items);

                        const stats = workoutData.post?.stats || {};
                        const minutes = stats.duration || 0;
                        const intensity = stats.intensity || 0;
                        const readiness = stats.readiness || 0;
                        const rating = stats.rating || 0;

                        const percentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

                        return {
                            ...item,
                            clientName,
                            clientAvatar,
                            workoutName: workoutInstance?.name || 'Untitled Workout',
                            workoutData: workoutInstance,
                            exercisesCompleted: completedExercises,
                            exercisesTotal: totalExercises,
                            minutes,
                            volume: totalVolume,
                            intensity,
                            readiness,
                            rating,
                            percentage
                        } as EnrichedWorkout;
                    } catch (err) {
                        console.error(`Failed to enrich workout ${item.workout_id} for client ${item.client_id}`, err);
                        return null;
                    }
                })
            );

            // Filter out failures
            return enrichedItems.filter((i): i is EnrichedWorkout => i !== null);
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
    });

    return { data, isLoading, error };
}
