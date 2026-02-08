import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCoachNotifications,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead,
    CoachNotification,
} from '@/api/notifications/notifications-service';

export const useCoachNotifications = () => {
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['coach-notifications'],
        queryFn: () => getCoachNotifications(),
        refetchInterval: 60_000,
    });

    const unreadCount = notifications.filter((n) => !n.read_at).length;

    const markReadMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['coach-notifications'] });
            queryClient.setQueryData<CoachNotification[]>(['coach-notifications'], (old) =>
                old?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
            );
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['coach-notifications'] });
        },
    });

    const markUnreadMutation = useMutation({
        mutationFn: markNotificationAsUnread,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['coach-notifications'] });
            queryClient.setQueryData<CoachNotification[]>(['coach-notifications'], (old) =>
                old?.map((n) => (n.id === id ? { ...n, read_at: null } : n))
            );
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['coach-notifications'] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['coach-notifications'] });
            queryClient.setQueryData<CoachNotification[]>(['coach-notifications'], (old) =>
                old?.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['coach-notifications'] });
        },
    });

    return {
        notifications,
        isLoading,
        unreadCount,
        markAsRead: markReadMutation.mutate,
        markAsUnread: markUnreadMutation.mutate,
        markAllAsRead: markAllReadMutation.mutate,
    };
};
