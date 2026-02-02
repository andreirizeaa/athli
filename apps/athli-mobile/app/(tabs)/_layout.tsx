import React, { useCallback, useEffect, useRef } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';

import { useThemePreference, useColorScheme, useAuth } from '@/stores';
import { useAppView } from '@/stores';
import { useTranslations } from '@/stores';
import { useLibraryTab, type LibraryTab } from '@/stores';
import { useAthleteDataStore, useCoachDataStore } from '@/stores';

const darkBackground = require('@/assets/backgrounds/dark.png');
const lightBackground = require('@/assets/backgrounds/light.png');
import { FAB } from '@/components/ui';

const hasLiquidGlass = isLiquidGlassAvailable();

type NativeTabsCoachViewProps = {
  primaryColor: string;
};

// Pure layout component for coach view
const NativeTabsCoachView = ({ primaryColor }: NativeTabsCoachViewProps) => {
  return (
    <NativeTabs tintColor={primaryColor}>
      <NativeTabs.Trigger name="clients">
        <Icon sf="person.2.fill" />
        <Label>Clients</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <Icon sf="bubble.left.and.text.bubble.right.fill" />
        <Label>Chats</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <Icon sf="folder.fill" />
        <Label>Library</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

// Pure layout component for athlete view
const NativeTabsAthleteView = ({ primaryColor }: NativeTabsCoachViewProps) => {
  return (
    <NativeTabs tintColor={primaryColor}>
      <NativeTabs.Trigger name="home">
        <Icon sf="house.fill"/>
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="training">
        <Icon sf="dumbbell.fill" />
        <Label>Training</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <Icon sf="chart.bar.fill" />
        <Label>Progress</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inbox">
        <Icon sf="envelope.fill" />
        <Label>Inbox</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf="person.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

export default function TabLayout() {
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const previousAppView = useRef(appView);
  const isInitialMount = useRef(true);
  const colorScheme = useColorScheme();
  const { currentLibraryTab } = useLibraryTab();
  const { clientProfile, coachProfile } = useAuth();

  // Background image based on color scheme
  const backgroundImage = colorScheme === 'dark' ? darkBackground : lightBackground;

  // Athlete data store for loading state
  const isAthleteDataInitialLoadComplete = useAthleteDataStore((state) => state.isInitialLoadComplete);
  const loadAthleteData = useAthleteDataStore((state) => state.loadAthleteData);

  // Coach data store for loading state
  const isCoachDataInitialLoadComplete = useCoachDataStore((state) => state.isInitialLoadComplete);
  const loadCoachData = useCoachDataStore((state) => state.loadCoachData);

  // Load athlete data when in athlete view
  useEffect(() => {
    if (appView === 'athlete' && clientProfile && !isAthleteDataInitialLoadComplete) {
      loadAthleteData(clientProfile.client_id, clientProfile.coach_id);
    }
  }, [appView, clientProfile, isAthleteDataInitialLoadComplete, loadAthleteData]);

  // Load coach data when in coach view
  useEffect(() => {
    if (appView === 'coach' && coachProfile && !isCoachDataInitialLoadComplete) {
      loadCoachData();
    }
  }, [appView, coachProfile, isCoachDataInitialLoadComplete, loadCoachData]);

  // Helper to get the correct modal route based on current library tab
  const getLibraryModalRoute = (): string => {
    const modalRoutes: Record<LibraryTab, string> = {
      workouts: '/modals/library/add-workout-modal',
      sections: '/modals/library/add-section-modal',
      exercises: '/modals/library/add-exercise-modal',
      checkIns: '/modals/library/add-check-in-modal',
      questionnaires: '/modals/library/add-questionnaire-modal',
      metrics: '/modals/library/add-metric-modal',
      habits: '/modals/library/add-habit-modal',
      files: '/modals/files/add-file-modal',
    };
    return modalRoutes[currentLibraryTab];
  };

  // Helper to check if pathname matches the current app view
  const isValidRouteForView = useCallback((path: string, view: 'coach' | 'athlete') => {
    const coachRoutes = ['/clients', '/chats', '/library', '/settings'];
    const athleteRoutes = ['/home', '/training', '/progress', '/inbox', '/profile'];
    const validRoutes = view === 'coach' ? coachRoutes : athleteRoutes;
    return validRoutes.some(route => path.startsWith(route));
  }, []);

  // Use useEffect for initial mount to prevent navigation before layout is ready
  useEffect(() => {
    if (!isInitialMount.current) {
      return;
    }

    isInitialMount.current = false;
    previousAppView.current = appView;

    // On initial mount, ensure we navigate to the correct initial route
    // This prevents showing wrong view's content (e.g., athlete route with coach tab bar)
    const initialRoute = appView === 'athlete' ? '/home' : '/clients';
    // Navigate if: on index, or on wrong view's route, or on add-modal
    const needsNavigation =
      pathname === '/' ||
      pathname === '/(tabs)' ||
      pathname.startsWith('/add-modal') ||
      !isValidRouteForView(pathname, appView);

    if (needsNavigation) {
      // Delay navigation to ensure layout is mounted
      setTimeout(() => {
        router.replace(initialRoute);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - pathname and router are stable

  useEffect(() => {
    if (previousAppView.current !== appView) {
      previousAppView.current = appView;
      // Navigate to the correct initial route when app view changes
      const initialRoute = appView === 'athlete' ? '/home' : '/clients';
      router.replace(initialRoute);
    }
  }, [appView, router]);

  const insets = useSafeAreaInsets();

  const handleFabPress = () => {
    // Check for library first, then clients/chats
    if (pathname.includes('/library')) {
      router.push(getLibraryModalRoute() as any);
    } else if (pathname.includes('/clients')) {
      router.push({
        pathname: '/add-modal-content',
        params: { route: 'clients' },
      });
    } else if (pathname.includes('/chats')) {
      router.push('/modals/message/broadcast-modal');
    }
  };

  // Show loading screen while data is loading
  const isDataLoading =
    (appView === 'athlete' && !isAthleteDataInitialLoadComplete) ||
    (appView === 'coach' && !isCoachDataInitialLoadComplete);

  if (isDataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={backgroundImage}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  // Determine if FAB should be visible (coach view, on clients/chats/library tabs)
  const showFab = appView === 'coach' && (
    pathname.includes('/clients') ||
    pathname.includes('/chats') ||
    pathname.includes('/library')
  );
  const fabVariant = pathname.includes('/chats') ? 'megaphone' : 'plus';

  if (hasLiquidGlass) {
    if (appView === 'coach') {
      return (
        <View style={{ flex: 1 }}>
          <NativeTabsCoachView primaryColor={primaryColor} />
          {showFab && (
            <FAB
              onPress={handleFabPress}
              variant={fabVariant}
              bottom={insets.bottom + 70}
            />
          )}
        </View>
      );
    }

    // Athlete view (default)
    return <NativeTabsAthleteView primaryColor={primaryColor} />;
  }

  // Tab bar icon helper for fallback (non-liquid glass) view
  const renderTabBarIcon = (routeName: string, color: string, size: number) => {
    const iconSize = Platform.OS === 'ios' ? size : size;
    const sfIconMap: Record<string, string> = {
      clients: 'person.2.fill',
      chats: 'bubble.left.and.text.bubble.right.fill',
      library: 'folder.fill',
      settings: 'gear',
      home: 'house.fill',
      training: 'dumbbell.fill',
      progress: 'chart.bar.fill',
      inbox: 'envelope.fill',
      profile: 'person.fill',
    };
    const mdiIconMap: Record<string, string> = {
      clients: 'people',
      chats: 'forum',
      library: 'folder',
      settings: 'settings',
      home: 'home',
      training: 'fitness-center',
      progress: 'bar-chart',
      inbox: 'mail',
      profile: 'person',
    };

    if (Platform.OS === 'ios') {
      return (
        <SymbolView
          name={sfIconMap[routeName] as any}
          tintColor={color}
          size={iconSize}
          type="monochrome"
        />
      );
    }
    return <MaterialIcons name={mdiIconMap[routeName] as any} size={iconSize} color={color} />;
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        key={appView}
        initialRouteName={appView === 'athlete' ? 'home' : 'clients'}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: themeColors.mutedText,
          tabBarStyle: {
            backgroundColor: themeColors.backgroundSecondary,
            borderTopColor: themeColors.border,
          },
        }}
      >
        <Tabs.Screen
          name="clients"
          options={{
            title: t('clients.title'),
            href: appView === 'coach' ? '/clients' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('clients', color, size),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: t('chats.title'),
            href: appView === 'coach' ? '/chats' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('chats', color, size),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: t('library.title'),
            href: appView === 'coach' ? '/library' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('library', color, size),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings.title'),
            href: appView === 'coach' ? '/settings' : appView === 'athlete' ? '/settings' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('settings', color, size),
          }}
        />
        <Tabs.Screen
          name="home"
          options={{
            title: t('home.title'),
            href: appView === 'athlete' ? '/home' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('home', color, size),
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: t('training.title'),
            href: appView === 'athlete' ? '/training' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('training', color, size),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: t('progress.title'),
            href: appView === 'athlete' ? '/progress' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('progress', color, size),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: t('inbox.title'),
            href: appView === 'athlete' ? '/inbox' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('inbox', color, size),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('profile.title'),
            href: appView === 'athlete' ? '/profile' : null,
            tabBarIcon: ({ color, size }) => renderTabBarIcon('profile', color, size),
          }}
        />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="add-modal" options={{ href: null }} />
      </Tabs>
      {showFab && (
        <FAB
          onPress={handleFabPress}
          variant={fabVariant}
          bottom={insets.bottom + 60}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
