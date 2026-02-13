import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  setupPushNotifications,
  setupClientPushNotifications,
  setupAndroidChannel,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
  deletePushToken,
  deleteClientPushToken,
  setBadgeCount,
} from '@/services/push-notification-service';
import { useAuth } from './useAuth';
import { Storage } from '@/lib/storage';

const PUSH_TOKEN_STORAGE_KEY = 'expo_push_token';

/**
 * Hook to manage push notifications for coaches and clients
 *
 * This hook:
 * - Registers for push notifications when user logs in
 * - Handles incoming notifications (foreground)
 * - Handles notification tap responses (navigation for coaches, log-only for clients)
 * - Cleans up token on logout
 */
export function usePushNotifications() {
  const router = useRouter();
  const { isAuthenticated, userType, userId } = useAuth();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const hasRegistered = useRef(false);

  // Handle notification tap - navigate to relevant screen
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    // Only navigate for coaches (clients have no notification page)
    if (userType === 'coach' && data?.notification_type) {
      router.push('/notifications');
    }
  }, [router, userType]);

  // Handle foreground notification
  const handleNotificationReceived = useCallback((_notification: Notifications.Notification) => {
    // The notification will be shown by the notification handler we set up
  }, []);

  // Register for push notifications
  useEffect(() => {
    if (!isAuthenticated || !userType || hasRegistered.current) {
      return;
    }

    const registerPushNotifications = async () => {
      try {
        // Setup Android notification channel first
        await setupAndroidChannel();

        // Get device ID (use userId as device identifier for simplicity)
        const deviceId = userId || undefined;

        // Register and save token based on user type
        const token = userType === 'coach'
          ? await setupPushNotifications(deviceId)
          : await setupClientPushNotifications(deviceId);

        if (token) {
          // Store token locally for logout cleanup
          Storage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
          hasRegistered.current = true;
        }
      } catch (error) {
        console.error('[PushNotifications] Registration failed:', error);
      }
    };

    registerPushNotifications();
  }, [isAuthenticated, userType, userId]);

  // Setup notification listeners
  useEffect(() => {
    if (!isAuthenticated || !userType) {
      return;
    }

    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener(handleNotificationReceived);

    // Listen for user tapping on notification
    responseListener.current = addNotificationResponseReceivedListener(handleNotificationResponse);

    // Check if app was opened from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, userType, handleNotificationReceived, handleNotificationResponse]);

  // Cleanup function for logout
  const unregisterPushNotifications = useCallback(async () => {
    try {
      const storedToken = Storage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (storedToken) {
        if (userType === 'coach') {
          await deletePushToken(storedToken);
        } else {
          await deleteClientPushToken(storedToken);
        }
        Storage.removeItem(PUSH_TOKEN_STORAGE_KEY);
        hasRegistered.current = false;
      }
    } catch (error) {
      console.error('[PushNotifications] Unregister failed:', error);
    }
  }, [userType]);

  // Clear badge count
  const clearBadge = useCallback(async () => {
    await setBadgeCount(0);
  }, []);

  return {
    unregisterPushNotifications,
    clearBadge,
  };
}
