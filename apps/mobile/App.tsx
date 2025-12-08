import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import './src/lib/notificationsBackground';
import { BACKGROUND_NOTIFICATION_TASK } from './src/lib/notificationsBackground';
import { initBackgroundFetch } from './src/lib/backgroundFetch';
import { Layout } from './layout';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LanguageProvider } from './src/context/LanguageContext';
import { ViewProvider } from './src/context/ViewContext';
import { ThemeProvider } from './src/context/ThemeContext';

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

    // Handle notification taps when app is in background/foreground
    const sub = Notifications.addNotificationResponseReceivedListener(async () => {
      // Notification handling can be added here if needed
    });

    return () => {
      try {
        sub.remove();
      } catch {}
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" translucent={Platform.OS === 'android'} backgroundColor="transparent" />
      <SafeAreaProvider>
        <LanguageProvider>
          <ViewProvider>
            <ThemeProvider>
              <Layout />
            </ThemeProvider>
          </ViewProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
