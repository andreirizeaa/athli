import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, View as RNView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import 'react-native-reanimated';
import { PressablesConfig } from 'pressto';

import { useColorScheme, useThemePreference, useCoachProfileStore, useCoachCompanyStore, useClientProfileStore, useAuthSessionStore, useAppInitStore, useChatsStore, useAppView, useAppViewStore } from '@/stores';
import { useThemeStore } from '@/stores/useThemeStore';
import { useTranslationsStore } from '@/stores/useTranslationsStore';
import { useUnitsStore } from '@/stores/useUnitsStore';
import { useHapticsStore } from '@/stores/useHapticsStore';
import { useBiometricStore } from '@/stores/useBiometricStore';
import { haptics } from '@/utils/haptics';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { restoreSession } from '@/services/auth/supabase-auth';
import { apiFetch } from '@/lib/api-client';
import type { CoachProfile, ClientProfile } from '@/types/profile';
import QueryProvider from '@/providers/query-provider';
import { usePrefetchAllExercises } from '@/hooks/useAllExercises';
import { ErrorBoundary as CustomErrorBoundary } from '@/components/ui/error-boundary';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { AppState } from 'react-native';

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

// Background images to preload (using expo-asset for local bundled assets)
const darkBackground = require('../assets/backgrounds/dark.png');
const lightBackground = require('../assets/backgrounds/light.png');

// Preload background images using expo-asset to prevent flash on screen load
const prefetchBackgroundImages = async () => {
  try {
    await Asset.loadAsync([darkBackground, lightBackground]);
    console.log('[RootLayout] Background images preloaded');
  } catch (error) {
    console.warn('[RootLayout] Failed to preload background images:', error);
  }
};

const hasLiquidGlass = isLiquidGlassAvailable();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Prefetch background images and hide splash screen when fonts are loaded
  useEffect(() => {
    if (loaded) {
      // Prefetch backgrounds before showing UI to prevent flash
      prefetchBackgroundImages().finally(() => {
        SplashScreen.hideAsync();
      });
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
            <CustomErrorBoundary>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </CustomErrorBoundary>
          </PressablesConfig>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [coachLoaded, setCoachLoaded] = useState(false);
  const isSessionReady = useAuthSessionStore((state) => state.isSessionReady);
  const setCoachProfile = useCoachProfileStore((state) => state.setProfile);
  const setClientProfile = useClientProfileStore((state) => state.setProfile);
  const clearCoachProfile = useCoachProfileStore((state) => state.clearProfile);
  const clearClientProfile = useClientProfileStore((state) => state.clearProfile);
  const { setAppView } = useAppView();
  const router = useRouter();

  // Prefetch MuscleWiki exercises in background once coach is loaded
  usePrefetchAllExercises({ enabled: coachLoaded });

  // Initialize stores synchronously before paint (useLayoutEffect runs after render but before paint)
  // Each store's initialize() is idempotent - it checks if already initialized
  const storesInitialized = useRef(false);
  useLayoutEffect(() => {
    if (storesInitialized.current) return;
    storesInitialized.current = true;
    useThemeStore.getState().initialize();
    useTranslationsStore.getState().initialize();
    useUnitsStore.getState().initialize();
    useHapticsStore.getState().initialize();
    useBiometricStore.getState().initialize();
    useCoachProfileStore.getState().initialize();
    useCoachCompanyStore.getState().initialize();
    useClientProfileStore.getState().initialize();

    // Set appView from cached profiles BEFORE first render to prevent tab flicker
    const cachedCoachProfile = useCoachProfileStore.getState().profile;
    const cachedClientProfile = useClientProfileStore.getState().profile;
    if (cachedCoachProfile) {
      useAppViewStore.getState().setAppView('coach');
    } else if (cachedClientProfile) {
      useAppViewStore.getState().setAppView('athlete');
    }
  }, []);

  // Now we can safely use theme hooks after initialization
  const colorScheme = useColorScheme();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const segments = useSegments();
  const systemScheme = useNativeColorScheme() ?? 'light';

  // Initialize auth session and restore profile on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[RootLayout] Starting app initialization...');

        // STEP 1: Initialize Supabase session BEFORE anything else
        // This ensures session is restored from MMKV storage and ready
        await useAuthSessionStore.getState().initializeSession();
        console.log('[RootLayout] Session initialized');

        // STEP 2: Check if we have profiles in storage (already restored by initialize())
        const coachProfile = useCoachProfileStore.getState().profile;
        const clientProfile = useClientProfileStore.getState().profile;
        console.log('[RootLayout] Profiles from storage:', {
          hasCoach: !!coachProfile,
          hasClient: !!clientProfile
        });

        // STEP 3: Fetch profile from DB if we have a session
        // Always refresh to ensure we have the latest data (e.g., correct avatar URL)
        const session = useAuthSessionStore.getState().session;
        if (session) {
          if (!coachProfile && !clientProfile) {
            console.log('[RootLayout] No profile in storage, fetching from database...');
          } else {
            console.log('[RootLayout] Profile in storage, refreshing from database...');
          }
          const authResult = await restoreSession();
          if (authResult && authResult.profile) {
            if (authResult.profileType === 'coach') {
              setCoachProfile(authResult.profile as CoachProfile);
              setAppView('coach');
            } else if (authResult.profileType === 'client') {
              setClientProfile(authResult.profile as ClientProfile);
              setAppView('athlete');
            }
            console.log('[RootLayout] Profile fetched and stored');
          }
        }

        // STEP 4: Load company data and chats if coach profile exists
        const finalCoachProfile = useCoachProfileStore.getState().profile;
        if (finalCoachProfile) {
          // Mark coach app as explored (fire-and-forget)
          apiFetch('/coach/new/checklist', {
            method: 'PATCH',
            body: JSON.stringify({ field: 'coach_app_demo' }),
          }).catch(() => {});
          console.log('[RootLayout] Loading coach data...');
          // Load company and chats in parallel
          await Promise.all([
            useCoachCompanyStore.getState().loadCompany(),
            useChatsStore.getState().loadChats(),
          ]);
          console.log('[RootLayout] Coach company and chats data loaded');

          // STEP 4b: Prefetch messages for top chats in background (don't block app ready)
          // This enables instant navigation to recent conversations
          useChatsStore.getState().prefetchTopMessages(10).catch((error) => {
            console.warn('[RootLayout] Message prefetch failed:', error);
          });

          // STEP 4c: Mark coach profile loaded for exercise prefetch
          setCoachLoaded(true);
        }

        // Small delay to ensure first frame is rendered
        await new Promise(resolve => setTimeout(resolve, 50));

        // STEP 5: Mark app as ready - tabs can now safely render
        setIsAppReady(true);
        useAppInitStore.getState().setAppReady(true);
        console.log('[RootLayout] App ready');
      } catch (error) {
        console.error('[RootLayout] Error initializing app:', error);
        // Still mark as ready even on error to prevent infinite splash screen
        setIsAppReady(true);
        useAppInitStore.getState().setAppReady(true);
      }
    };

    initializeApp();
  }, [setCoachProfile, setClientProfile, setAppView]);

  // Listen to Supabase auth state changes
  useEffect(() => {
    console.log('[RootLayout] Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[RootLayout] Auth state changed:', event);

        if (event === 'INITIAL_SESSION') {
          // Session loaded from storage - only update if we have a session
          // Don't clear an existing session (could be a race condition after sign-in)
          if (session) {
            useAuthSessionStore.getState().setSession(session);
          }
        } else if (event === 'SIGNED_IN') {
          // User signed in - update session and fetch profile
          useAuthSessionStore.getState().setSession(session);
          const authResult = await restoreSession({ signOutOnFailure: false });
          if (authResult && authResult.profile) {
            if (authResult.profileType === 'coach') {
              setCoachProfile(authResult.profile as CoachProfile);
              setAppView('coach');
              // Mark coach app as explored (fire-and-forget)
              apiFetch('/coach/new/checklist', {
                method: 'PATCH',
                body: JSON.stringify({ field: 'coach_app_demo' }),
              }).catch(() => {});
              // Load company data and chats for coach
              await Promise.all([
                useCoachCompanyStore.getState().loadCompany(),
                useChatsStore.getState().loadChats(),
              ]);
              // Prefetch messages for top chats in background for faster navigation
              useChatsStore.getState().prefetchTopMessages(10).catch((error) => {
                console.warn('[RootLayout] Message prefetch failed:', error);
              });
            } else if (authResult.profileType === 'client') {
              setClientProfile(authResult.profile as ClientProfile);
              setAppView('athlete');
            }
            // Navigate to tabs after successful sign-in
            console.log('[RootLayout] Sign-in complete, navigating to tabs');
            router.replace('/(tabs)');
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out or session expired - clear everything
          console.log('[RootLayout] User signed out, clearing state');
          useAuthSessionStore.getState().clearSession();
          clearCoachProfile();
          useCoachCompanyStore.getState().clearCompany();
          useChatsStore.getState().clearChats();
          clearClientProfile();
          // Reset data stores
          const { useAthleteDataStore, useCoachDataStore } = require('@/stores');
          useAthleteDataStore.getState().reset();
          useCoachDataStore.getState().reset();
          router.replace('/welcome');
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed in background - update session
          console.log('[RootLayout] Token refreshed');
          useAuthSessionStore.getState().setSession(session);
        }
      }
    );

    return () => {
      console.log('[RootLayout] Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [setCoachProfile, setClientProfile, clearCoachProfile, clearClientProfile, setAppView, router]);

  // Listen to app state changes for foreground refresh
  useEffect(() => {
    console.log('[RootLayout] Setting up app state listener');

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Only refresh if there's an existing session
        const currentSession = useAuthSessionStore.getState().session;
        if (!currentSession) {
          console.log('[RootLayout] App foregrounded, no session to refresh');
          return;
        }

        console.log('[RootLayout] App foregrounded, refreshing session');
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[RootLayout] Foreground refresh failed:', error);
        } else if (data.session) {
          console.log('[RootLayout] Session refreshed on foreground');
          useAuthSessionStore.getState().setSession(data.session);
        }
      }
    });

    return () => {
      console.log('[RootLayout] Cleaning up app state listener');
      subscription.remove();
    };
  }, []);

  // Listen to system color scheme changes
  useEffect(() => {
    useThemeStore.getState().updateColorsFromSystemScheme(systemScheme);
  }, [systemScheme]);

  // Hide status bar only for preview screens
  const shouldHideStatusBar = useMemo(() => {
    const currentRoute = segments[segments.length - 1] || '';
    const hideStatusBarRoutes = [
      'chats/document-preview',
      'chats/video-preview',
    ];
    return hideStatusBarRoutes.includes(currentRoute);
  }, [segments]);

  // Check if we're on the welcome screen to use black background
  const isWelcomeScreen = segments[0] === 'welcome';

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
    <RNView style={{ flex: 1, backgroundColor: isWelcomeScreen ? '#090909' : themeColors.backgroundPrimary }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar
          style={isWelcomeScreen ? 'light' : (colorScheme === 'dark' ? 'light' : 'dark')}
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
              animation: 'fade',
              contentStyle: {
                backgroundColor: '#090909',
              },
            }}
          />
          <Stack.Screen
            name="biometric-lock"
            options={{
              headerShown: false,
              animation: 'none',
              gestureEnabled: false,
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
          <Stack.Screen name="settings/feature-requests" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings/feature-request-detail"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="todos"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="check-ins"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="assistant"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="athlete-check-ins"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="athlete-questionnaires"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="athlete-forms"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="client/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="client/[id]/activity" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/bio" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/metrics" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/notes" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/training" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/habits" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/photos" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/compare" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/files" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/check-ins" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/check-in-detail" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/check-in-submissions" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/questionaires" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/questionnaire-detail" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/settings" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/assistant" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/goals" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/injuries" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]/exercise-history" options={{ headerShown: false }} />
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
            name="library/form/form-builder"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: themeColors.backgroundPrimary,
              },
            }}
          />
          <Stack.Screen
            name="library/form/reorder-questions"
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
            name="modals/todo/add-todo-modal"
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
            name="modals/todo/edit-todo-modal"
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
            name="modals/settings/edit-personal-details-modal"
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
            name="modals/settings/edit-company-details-modal"
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
            name="modals/settings/change-email-modal"
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
            name="modals/settings/change-password-modal"
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
            name="modals/settings/delete-account-modal"
            options={{
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              headerShown: false,
              ...(Platform.OS === 'ios' && {
                sheetAllowedDetents: [0.35],
                sheetGrabberVisible: true,
                contentStyle: { backgroundColor: hasLiquidGlass ? 'transparent' : themeColors.backgroundSecondary },
              }),
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="settings/personal-details"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="settings/company-details"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="settings/edit-profile"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="profile/client-details"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="profile/coach-profile"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
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
                contentStyle: { backgroundColor: hasLiquidGlass ? 'transparent' : themeColors.backgroundSecondary },
              }),
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/message/reactions-modal"
            options={{
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              headerShown: false,
              ...(Platform.OS === 'ios' && {
                sheetAllowedDetents: [0.35],
                sheetGrabberVisible: true,
                contentStyle: { backgroundColor: hasLiquidGlass ? 'transparent' : themeColors.backgroundSecondary },
              }),
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/message/broadcast-modal"
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
            name="modals/auth/forgot-password-modal"
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
            name="modals/client/edit-note-modal"
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
            name="modals/client/select-client-habit-modal"
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
            name="modals/client/select-client-metric-modal"
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
            name="modals/client/file-viewer-modal"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="modals/client/photo-preview-modal"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="modals/client/edit-log-modal"
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
            name="modals/client/add-workout-to-day-modal"
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
            name="modals/files/file-viewer-modal"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'fade',
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
            name="modals/library/add-question-modal"
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
              gestureEnabled: false,
              headerShown: false,
              ...(Platform.OS === 'android' && {
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }),
            }}
          />
          <Stack.Screen
            name="modals/workout/exercise-filter-modal"
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
            name="modals/workout/exercise-filter-values-modal"
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
            name="modals/workout/exercise-video-modal"
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
          <Stack.Screen
            name="modals/training/workout-session-modal"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="modals/training/workout-review-modal"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="modals/training/workout-preview-modal"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="modals/athlete/form-response-session-modal"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="modals/athlete/form-review-modal"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="modals/athlete/log-metric-modal"
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
            name="modals/athlete/log-habit-modal"
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
          <Stack.Screen
            name="modals/feature-requests/add-feature-request-modal"
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
            name="modals/feature-requests/add-reply-modal"
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
        </Stack>
      </ThemeProvider>

      {/* Manual Splash Screen Overlay */}
      {!isSessionReady && (
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
