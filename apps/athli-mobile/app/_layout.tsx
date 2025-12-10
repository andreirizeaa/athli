import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import {
  ThemePreferenceProvider,
  useColorScheme,
  useThemePreference,
} from '@/contexts/useColorScheme';
import { AppViewProvider } from '@/contexts/useAppView';
import { TranslationProvider } from '@/contexts/useTranslations';

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
  const { primaryColor, colors } = useThemePreference();

  const navigationTheme =
    colorScheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: primaryColor,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: primaryColor,
          },
        };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.pageBackground}
      />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="preferences" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
  );
}
