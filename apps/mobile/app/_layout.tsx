import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import '../src/lib/notificationsBackground';
import { BACKGROUND_NOTIFICATION_TASK } from '../src/lib/notificationsBackground';
import { initBackgroundFetch } from '../src/lib/backgroundFetch';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, Stack } from 'expo-router';
import { enableScreens } from 'react-native-screens';
import { LanguageProvider } from '../src/context/LanguageContext';
import { ViewProvider } from '../src/context/ViewContext';
import { ThemeProvider } from '../src/context/ThemeContext';

enableScreens();

export default function RootLayout() {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});
    void initBackgroundFetch();

    const sub = Notifications.addNotificationResponseReceivedListener(async () => {
      // Notification handling can be added here if needed
    });

    return () => {
      try {
        sub.remove();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <ViewProvider>
            <ThemeProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="edit-language" options={{ headerShown: false }} />
                <Stack.Screen name="edit-units" options={{ headerShown: false }} />
                <Stack.Screen name="edit-color-scheme" options={{ headerShown: false }} />
              </Stack>
            </ThemeProvider>
          </ViewProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


