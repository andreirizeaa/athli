import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import {
  ThemePreferenceProvider,
  useColorScheme,
  useThemePreference,
} from '@/contexts/useColorScheme';
import { AppViewProvider } from '@/contexts/useAppView';
import { TranslationProvider } from '@/contexts/useTranslations';
import { View } from 'react-native';

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
    <ThemePreferenceProvider>
      <TranslationProvider>
        <AppViewProvider>
          <RootLayoutNav />
        </AppViewProvider>
      </TranslationProvider>
    </ThemePreferenceProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { primaryColor } = useThemePreference();

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
      />
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="preferences" options={{ headerShown: false }} />
        <Stack.Screen name="client/[id]" options={{ headerShown: false }} />
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
      </Stack>
    </ThemeProvider>
  );
}
