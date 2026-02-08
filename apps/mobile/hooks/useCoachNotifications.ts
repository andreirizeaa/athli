import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoachNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  type CoachNotification,
} from '@/services/coach-notifications-service';

const NOTIFICATIONS_KEY = ['coach-notifications'];

export function useCoachNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => getCoachNotifications(),
    refetchInterval: 60_000,
  });

  const unreadCount = notifications.filter((n: CoachNotification) => !n.read_at).length;

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update on shared cache
    queryClient.setQueryData<CoachNotification[]>(NOTIFICATIONS_KEY, (old) =>
      (old || []).map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );

    try {
      await markNotificationAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    }
  }, [queryClient]);

  const markAsUnread = useCallback(async (id: string) => {
    queryClient.setQueryData<CoachNotification[]>(NOTIFICATIONS_KEY, (old) =>
      (old || []).map((n) =>
        n.id === id ? { ...n, read_at: null } : n
      )
    );

    try {
      await markNotificationAsUnread(id);
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    }
  }, [queryClient]);

  const markAllAsRead = useCallback(async () => {
    queryClient.setQueryData<CoachNotification[]>(NOTIFICATIONS_KEY, (old) =>
      (old || []).map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      }))
    );

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    }
  }, [queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  }, [queryClient]);

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    refresh,
  };
}
