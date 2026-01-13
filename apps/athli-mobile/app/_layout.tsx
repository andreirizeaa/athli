import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Platform, View as RNView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import 'react-native-reanimated';
import { PressablesConfig } from 'pressto';

import { useColorScheme, useThemePreference, useCoachProfileStore, useClientProfileStore } from '@/stores';
import { useThemeStore } from '@/stores/useThemeStore';
import { useTranslationsStore } from '@/stores/useTranslationsStore';
import { useUnitsStore } from '@/stores/useUnitsStore';
import { useHapticsStore } from '@/stores/useHapticsStore';
import { haptics } from '@/utils/haptics';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { restoreSession } from '@/services/auth/supabase-auth';
import type { CoachProfile, ClientProfile } from '@/types/profile';
import QueryProvider from '@/providers/query-provider';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Configure splash screen to fade out
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Hide the native splash screen immediately since we're using our own overlay
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Don't render anything until fonts are loaded
  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <PressablesConfig
            animationType="timing"
            animationConfig={{ duration: 150 }}
            config={{ minScale: 0.96, activeOpacity: 0.7 }}
            globalHandlers={{
              onPress: () => haptics.medium(),
            }}
          >
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </PressablesConfig>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const [isAppReady, setIsAppReady] = useState(false);
  const setCoachProfile = useCoachProfileStore((state) => state.setProfile);
  const setClientProfile = useClientProfileStore((state) => state.setProfile);

  // Initialize stores synchronously before first render
  useMemo(() => {
    useThemeStore.getState().initialize();
    useTranslationsStore.getState().initialize();
    useUnitsStore.getState().initialize();
    useHapticsStore.getState().initialize();
  }, []);

  // Now we can safely use theme hooks after initialization
  const colorScheme = useColorScheme();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const segments = useSegments();
  const systemScheme = useNativeColorScheme() ?? 'light';

  // Restore auth session on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Restore auth session
        const authResult = await restoreSession();
        if (authResult && authResult.profile) {
          if (authResult.profileType === 'coach') {
            setCoachProfile(authResult.profile as CoachProfile);
          } else if (authResult.profileType === 'client') {
            setClientProfile(authResult.profile as ClientProfile);
          }
        }

        // Small delay to ensure first frame is rendered
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mark app as ready
        setIsAppReady(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        // Still mark as ready even on error to prevent infinite splash screen
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, [setCoachProfile, setClientProfile]);

  // Listen to system color scheme changes
  useEffect(() => {
    useThemeStore.getState().updateColorsFromSystemScheme(systemScheme);
  }, [systemScheme]);

  // Hide status bar only for camera and preview screens (not message-image-preview since it's from a message)
  const shouldHideStatusBar = useMemo(() => {
    const currentRoute = segments[segments.length - 1] || '';
    const hideStatusBarRoutes = [
      'camera/camera',
      'chats/document-preview',
      'chats/video-preview',
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
          background: themeColors.backgroundPrimary,
        },
      }
      : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: primaryColor,
          background: themeColors.backgroundPrimary,
        },
      };

  return (
    <RNView style={{ flex: 1, backgroundColor: themeColors.backgroundPrimary }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar
          style={colorScheme === 'dark' ? 'light' : 'dark'}
          translucent={true}
          backgroundColor="transparent"
          hidden={shouldHideStatusBar}
        />
        <Stack
          screenOptions={{
            headerTransparent: true,
            contentStyle: {
              backgroundColor: themeColors.backgroundPrimary,
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="welcome"
            options={{
              headerShown: false,
              animation: 'none',
            }}
          />
          <Stack.Screen
            name="auth/email-sign-in"
            options={{
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              animation: 'none',
            }}
          />
          <Stack.Screen name="settings/preferences" options={{ headerShown: false }} />
          <Stack.Screen
            name="client/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="client/[id]/activity" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/metrics" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/goals-injuries" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/notes" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/training" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/habits" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/photos" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/files" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/check-ins" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/questionaires" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/settings" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/assistant" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/goals" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/injuries" options={{ headerShown: false }} />
          <Stack.Screen
            name="client/[id]/edit-details"
            options={{
              headerShadowVisible: true,
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 150,
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="library/workout/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.backgroundPrimary,
              },
            }}
          />
          <Stack.Screen
            name="library/workout/section-builder"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.backgroundPrimary,
              },
            }}
          />
          <Stack.Screen
            name="library/workout/reorder"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.backgroundPrimary,
              },
            }}
          />
          <Stack.Screen
            name="library/file-preview"
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
            name="modals/athli-assistant-help-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/edit-client-details-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/edit-client-bio-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/edit-client-goal-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/edit-client-injury-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/add-client-goal-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/add-client-injury-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
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
            name="modals/settings/language-modal"
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
            name="modals/settings/units-modal"
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
            name="modals/settings/palette-modal"
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
            name="modals/calendar/select-date-modal"
            options={{
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              headerShown: false,
              ...(Platform.OS === 'ios' && {
                sheetAllowedDetents: [0.50],
                sheetGrabberVisible: true,
              }),
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/auth/sign-in-modal"
            options={{
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              headerShown: false,
              ...(Platform.OS === 'ios' && {
                sheetAllowedDetents: [0.50],
                sheetGrabberVisible: true,
              }),
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/auth/logout-confirmation-modal"
            options={{
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              headerShown: false,
              ...(Platform.OS === 'ios' && {
                sheetAllowedDetents: [0.35],
                sheetGrabberVisible: true,
              }),
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/search-client-modal"
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
            name="modals/client/log-metric-for-client-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/log-habit-for-client-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/metrics-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/habits-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/add-photo-to-client-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/client/add-note-to-client-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/calendar/repeat-options-modal"
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
            name="modals/shared/number-select-modal"
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
            name="modals/shared/define-schedule-modal"
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
            name="modals/files/add-file-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/shared/client-list-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/shared/assign-to-clients-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/add-workout-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/add-section-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/add-exercise-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/add-check-in-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/add-questionnaire-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/add-metric-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/add-habit-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/library/habit-options-modal"
            options={{
              presentation: 'modal',
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/workout/add-exercise-to-builder-modal"
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
            name="modals/workout/exercise-details-modal"
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
            name="modals/workout/add-section-to-builder-modal"
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
            name="modals/workout/create-section-in-builder-modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          {/* Profile is now a tab, so profile/profile route is no longer needed */}
          {/* <Stack.Screen
          name="profile/profile"
          options={{
            presentation: 'card',
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        /> */}
          <Stack.Screen
            name="personal-details"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_right',
              animationDuration: 300,
            }}
          />
          <Stack.Screen
            name="modals/personal-details/edit-personal-details-modal"
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
            name="camera/camera"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
            }}
          />
          <Stack.Screen
            name="chats/document-preview"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
            }}
          />
          <Stack.Screen
            name="chats/message-image-preview"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
            }}
          />
          <Stack.Screen
            name="chats/video-preview"
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

      {/* Manual Splash Screen Overlay */}
      {!isAppReady && (
        <RNView style={splashStyles.container}>
          <Image
            source={
              colorScheme === 'dark'
                ? require('../assets/app-icons/splash-icon-dark.png')
                : require('../assets/app-icons/splash-icon-light.png')
            }
            style={splashStyles.image}
            contentFit="contain"
          />
        </RNView>
      )}
    </RNView>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  image: {
    width: 130,
    height: 200,
  },
});
