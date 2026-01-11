import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Platform, View as RNView } from 'react-native';
import 'react-native-reanimated';
import { PressablesConfig } from 'pressto';
import * as Haptics from 'expo-haptics';

import {
  ThemePreferenceProvider,
  useColorScheme,
  useThemePreference,
} from '@/contexts/useColorScheme';
import { AppViewProvider } from '@/contexts/useAppView';
import { TranslationProvider } from '@/contexts/useTranslations';
import { ModalCallbacksProvider } from '@/contexts/modal-callbacks';
import { TrainingOverlayProvider } from '@/contexts/useTrainingOverlay';
import { LibraryTabProvider } from '@/contexts/useLibraryTab';
import { UnitsProvider } from '@/contexts/useUnits';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PressablesConfig
          animationType="spring"
          animationConfig={{ damping: 30, stiffness: 200 }}
          config={{ minScale: 0.96, activeOpacity: 0.7 }}
          globalHandlers={{
            onPress: () => Haptics.selectionAsync(),
          }}
        >
          <KeyboardProvider>
            <ThemePreferenceProvider>
              <TranslationProvider>
                <UnitsProvider>
                  <AppViewProvider>
                    <ModalCallbacksProvider>
                      <TrainingOverlayProvider>
                        <LibraryTabProvider>
                          <RootLayoutNav />
                        </LibraryTabProvider>
                      </TrainingOverlayProvider>
                    </ModalCallbacksProvider>
                  </AppViewProvider>
                </UnitsProvider>
              </TranslationProvider>
            </ThemePreferenceProvider>
          </KeyboardProvider>
        </PressablesConfig>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const segments = useSegments();

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
          background: themeColors.pageBackground,
        },
      }
      : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: primaryColor,
          background: themeColors.pageBackground,
        },
      };

  return (
    <RNView style={{ flex: 1, backgroundColor: themeColors.pageBackground }}>
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
              backgroundColor: themeColors.pageBackground,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings/preferences" options={{ headerShown: false }} />
          <Stack.Screen
            name="client/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.pageBackground,
              },
            }}
          />
          <Stack.Screen name="client/[id]/activity" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/metrics" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/training-calendar" options={{ headerShown: false }} />
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
          <Stack.Screen
            name="library/workout/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.pageBackground,
              },
            }}
          />
          <Stack.Screen
            name="library/workout/section-builder"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.pageBackground,
              },
            }}
          />
          <Stack.Screen
            name="library/workout/reorder"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.pageBackground,
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
            name="modals/client/assign-check-in-to-client-modal"
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
            name="modals/client/assign-questionnaire-to-client-modal"
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
            name="modals/client/assign-file-to-client-modal"
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
            name="modals/client/assign-metric-to-client-modal"
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
            name="modals/client/assign-program-to-client-modal"
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
            name="modals/client/assign-workout-to-client-modal"
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
            name="modals/client/assign-habit-to-client-modal"
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
            name="modals/library/add-program-modal"
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
    </RNView>
  );
}
