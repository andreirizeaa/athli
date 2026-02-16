import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api-client';

/**
 * Configure notification handler - how notifications behave when app is foregrounded
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('[PushNotifications] EAS project ID not configured');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('[PushNotifications] Error getting token:', error);
    return null;
  }
}

/**
 * Save push token to the backend
 */
export async function savePushToken(expoPushToken: string, deviceId?: string): Promise<void> {
  await apiFetch('/settings/coach/push-token', {
    method: 'POST',
    body: JSON.stringify({
      expoPushToken,
      deviceId,
    }),
  });
}

/**
 * Delete push token from the backend (e.g., on logout)
 */
export async function deletePushToken(expoPushToken: string): Promise<void> {
  await apiFetch('/settings/coach/push-token', {
    method: 'DELETE',
    body: JSON.stringify({
      expoPushToken,
    }),
  });
}

/**
 * Register and save push token in one call (coach)
 * Returns the token if successful, null otherwise
 */
export async function setupPushNotifications(deviceId?: string): Promise<string | null> {
  try {
    const token = await registerForPushNotificationsAsync();

    if (token) {
      await savePushToken(token, deviceId);
    }

    return token;
  } catch (error) {
    console.error('[PushNotifications] Setup failed:', error);
    return null;
  }
}

/**
 * Save client push token to the backend
 */
export async function saveClientPushToken(expoPushToken: string, deviceId?: string): Promise<void> {
  await apiFetch('/settings/client/push-token', {
    method: 'POST',
    body: JSON.stringify({
      expoPushToken,
      deviceId,
    }),
  });
}

/**
 * Delete client push token from the backend (e.g., on logout)
 */
export async function deleteClientPushToken(expoPushToken: string): Promise<void> {
  await apiFetch('/settings/client/push-token', {
    method: 'DELETE',
    body: JSON.stringify({
      expoPushToken,
    }),
  });
}

/**
 * Register and save push token in one call (client)
 * Returns the token if successful, null otherwise
 */
export async function setupClientPushNotifications(deviceId?: string): Promise<string | null> {
  try {
    const token = await registerForPushNotificationsAsync();

    if (token) {
      await saveClientPushToken(token, deviceId);
    }

    return token;
  } catch (error) {
    console.error('[PushNotifications] Client setup failed:', error);
    return null;
  }
}

/**
 * Add a listener for received notifications (when app is foregrounded)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for notification responses (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response (if app was opened from a notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Set the badge count on the app icon
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Configure Android notification channel (required for Android)
 */
export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}
