import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import './app/notificationsBackground';
import { BACKGROUND_NOTIFICATION_TASK } from './app/notificationsBackground';
import { initBackgroundFetch } from './app/backgroundFetch';
import { Layout } from './layout';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/context/LanguageContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { handleLiftNotificationData } from './src/services/notificationNavigation';

export default function App() {
  useEffect(() => {

    // Configure notifications handler (show foreground notifications)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Ensure background task is registered
    Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});

    // Initialize background fetch
    void initBackgroundFetch();

    // Emit event when a push is received while app is foregrounded
    const recv = Notifications.addNotificationReceivedListener(async (notification) => {
      try {
        const data = notification.request.content.data as any;
        await handleLiftNotificationData(data);
      } catch (error) {
        console.warn('[App] Error handling foreground notification:', error);
      }
    });
    // Handle notification taps when app is in background/foreground
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const data = response.notification.request.content.data as any;
        // All notification types handled by centralized handler
        await handleLiftNotificationData(data);
      } catch (error) {
        console.warn('[App] Error handling notification response:', error);
      }
    });

    // Killed state handling is now done in NavigationContainer.onReady()

    return () => {
      try { sub.remove(); } catch {}
      try { recv.remove(); } catch {}
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <LanguageProvider>
            <Layout />
          </LanguageProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
