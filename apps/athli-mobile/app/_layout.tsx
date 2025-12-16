import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import {
  ThemePreferenceProvider,
  useColorScheme,
  useThemePreference,
} from '@/contexts/useColorScheme';
import { AppViewProvider } from '@/contexts/useAppView';
import { TranslationProvider } from '@/contexts/useTranslations';
import { ModalCallbacksProvider } from '@/contexts/modal-callbacks';
import { TrainingOverlayProvider } from '@/contexts/useTrainingOverlay';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemePreferenceProvider>
          <TranslationProvider>
            <AppViewProvider>
              <ModalCallbacksProvider>
                <TrainingOverlayProvider>
                  <RootLayoutNav />
                </TrainingOverlayProvider>
              </ModalCallbacksProvider>
            </AppViewProvider>
          </TranslationProvider>
        </ThemePreferenceProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { primaryColor } = useThemePreference();
  const segments = useSegments();

  // Hide status bar only for camera and preview screens (not message-image-preview since it's from a message)
  const shouldHideStatusBar = useMemo(() => {
    const currentRoute = segments[segments.length - 1] || '';
    const hideStatusBarRoutes = [
      'camera',
      'document-preview',
      'video-preview',
    ];
    return hideStatusBarRoutes.includes(currentRoute);
  }, [segments]);

  const navigationTheme =
    colorScheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: primaryColor,
            background: 'transparent',
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: primaryColor,
            background: 'transparent',
          },
        };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        translucent
        backgroundColor="transparent"
        hidden={shouldHideStatusBar}
      />
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/preferences" options={{ headerShown: false }} />
        <Stack.Screen name="client/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="client/[id]/activity" options={{ headerShown: false }} />
        <Stack.Screen name="client/[id]/metrics" options={{ headerShown: false }} />
        <Stack.Screen name="client/[id]/training-calendar" options={{ headerShown: false }} />
        <Stack.Screen name="client/[id]/goals-injuries" options={{ headerShown: false }} />
        <Stack.Screen
          name="client/edit-client-details-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="add-modal-content"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="language-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="units-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="palette-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="select-date-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: {
              backgroundColor: 'transparent',
            },
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="search-client-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="session-type-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="repeat-options-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="number-select-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="add-session-from-library-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            ...(Platform.OS === 'android' && {
              animation: 'slide_from_bottom',
              gestureDirection: 'vertical',
            }),
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            presentation: 'card',
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            presentation: 'card',
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="document-preview"
          options={{
            presentation: 'card',
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="message-image-preview"
          options={{
            presentation: 'card',
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="video-preview"
          options={{
            presentation: 'card',
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: 200,
          }}
        />
        <Stack.Screen name="chats/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chats/archived" options={{ headerShown: false }} />
        <Stack.Screen name="inbox/[id]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
